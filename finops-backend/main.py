# main.py
import os
import json
import uuid
from datetime import datetime
from typing import Optional, List

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
from dotenv import load_dotenv

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from database import (
    init_db, add_check_to_db, get_check_from_db,
    # get_all_active_checks_from_db, # We'll use a tenant-specific one for startup loading
    delete_check_from_db,
    update_check_status_in_db, update_check_run_times_in_db,
    get_db_connection, get_alerts_from_db, add_alert_to_db, # add_alert_to_db will need tenant_id from executor
    add_data_source, get_data_source_by_id, 
    get_data_source_by_name, get_all_data_sources,
    delete_data_source_from_db, 
    DEFAULT_TENANT_ID, # <<< Import default tenant ID
    get_all_checks_for_tenant_from_db, # <<< Import new function for fetching checks
    get_all_active_checks_from_db # Still needed for startup, will pass tenant_id
)
from executor import execute_check

load_dotenv()
app = FastAPI(title="FinOps Natural Language Scheduler API (Multi-Tenant Aware)")

origins = [
    "http://localhost:5173",
    "http://localhost",
]
app.add_middleware(
    CORSMiddleware, allow_origins=origins, allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

try:
    client = OpenAI()
    if not os.getenv("OPENAI_API_KEY"):
        raise ValueError("OPENAI_API_KEY not found in environment variables.")
except Exception as e:
    print(f"Fatal: Error initializing OpenAI client: {e}")
    client = None

scheduler = AsyncIOScheduler()

@app.get("/api/checks", response_model=List[dict])
async def get_all_checks_api_endpoint():
    try:
        # Get raw checks from database
        checks_raw = get_all_checks_for_tenant_from_db(DEFAULT_TENANT_ID)
        
        # Map database field names to frontend expected field names
        checks_mapped = []
        for check in checks_raw:
            mapped_check = {
                "id": check.get("id"),
                "query": check.get("natural_query"),  # Map natural_query -> query
                "schedule": check.get("schedule_string"),  # Map schedule_string -> schedule  
                "condition": check.get("anomaly_condition_raw"),  # Map anomaly_condition_raw -> condition
                "targetService": check.get("target_service"),
                "suggestion": check.get("suggestion"),
                "status": check.get("status"),
                "created_at": check.get("created_at"),
                "last_run_at": check.get("last_run_at"),
                "next_run_at": check.get("next_run_at"),
                "last_run_status": check.get("last_run_status"),
                "data_source_id": check.get("data_source_id"),
                "dataSourceName": check.get("dataSourceName"),
                "dataSourceType": check.get("dataSourceType")
            }
            checks_mapped.append(mapped_check)
        
        return checks_mapped
        
    except Exception as e:
        print(f"Error in get_all_checks_api_endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch checks: {str(e)}")

# Also update the schedule_job_from_check_details function to handle both field names:
def schedule_job_from_check_details(check_details: dict):
    if not scheduler.running:
        print("Scheduler not running. Cannot schedule job.")
        return

    check_id = check_details['id']
    schedule_string = check_details.get('schedule_string') or check_details.get('schedule')
    status = check_details.get('status')
    # Handle both natural_query and query field names
    natural_query = check_details.get('natural_query') or check_details.get('query', 'Scheduled FinOps Check')
    
    print(f"DEBUG Main: Attempting to schedule job for {check_id}. execute_check is: {execute_check}")

    try:
        if scheduler.get_job(check_id):
            scheduler.remove_job(check_id)
            print(f"Scheduler: Removed existing job {check_id} before (re)scheduling.")

        if status == 'active':
            if not schedule_string or schedule_string.lower() == 'n/a':
                print(f"Scheduler: Skipping job {check_id} due to invalid schedule: '{schedule_string}'")
                update_check_run_times_in_db(check_id, check_details.get('last_run_at'), None, check_details.get('last_run_status', 'error_scheduling'))
                return

            trigger = CronTrigger.from_crontab(schedule_string)
            job = scheduler.add_job(
                execute_check, trigger=trigger, args=[check_id], id=check_id,
                name=natural_query[:100], replace_existing=True, misfire_grace_time=3600
            )
            next_run = job.next_run_time if job else None
            update_check_run_times_in_db(
                check_id, 
                check_details.get('last_run_at'), 
                next_run, 
                check_details.get('last_run_status', 'pending')
            )
            print(f"Scheduler: Scheduled job ID {check_id}. Next run: {next_run}")
        else: 
            print(f"Scheduler: Check ID {check_id} is '{status}'. Not actively scheduling. Clearing next run time.")
            update_check_run_times_in_db(check_id, check_details.get('last_run_at'), None, check_details.get('last_run_status', status))
            if scheduler.get_job(check_id):
                 scheduler.remove_job(check_id)
    except ValueError as ve:
        print(f"Scheduler: Error for job {check_id} (invalid schedule string '{schedule_string}'): {ve}")
        update_check_status_in_db(check_id, 'error_scheduling', DEFAULT_TENANT_ID)
        update_check_run_times_in_db(check_id, check_details.get('last_run_at'), None, 'error_scheduling')
    except Exception as e: 
        print(f"Scheduler: General error for job {check_id}: {type(e).__name__} - {e}")
        update_check_status_in_db(check_id, 'error_scheduling', DEFAULT_TENANT_ID)
        update_check_run_times_in_db(check_id, check_details.get('last_run_at'), None, 'error_scheduling')

def create_default_data_sources():
    print("Checking/creating default data sources with realistic types for default tenant...")
    tenant_id = DEFAULT_TENANT_ID # Use the default tenant
    
    default_sources_config = [
        {"id_prefix": "ds-csv-default", "name": "Default FinOps CSV", "type": "CSV", "config": {"path": "sample_data.csv", "description": "Standard sample CSV data."}},
        {"id_prefix": "ds-aws-ce-mock", "name": "AWS Cost Explorer", "type": "AWS_COST_EXPLORER_MOCK", "config": {"account_id": "123456789012-mock", "region": "us-east-1-mock"}},
        {"id_prefix": "ds-k8s-metrics-mock", "name": "Kubernetes Cluster Metrics ", "type": "KUBERNETES_METRICS_MOCK", "config": {"cluster_name": "prod-cluster-alpha-mock"}},
        {"id_prefix": "ds-azure-cost-mock", "name": "Azure Cost Management ", "type": "AZURE_COST_MGMT_MOCK", "config": {"subscription_id": "azure-sub-mock-123"}},
        {"id_prefix": "ds-gcp-billing-mock", "name": "GCP Billing Export ", "type": "GCP_BILLING_MOCK", "config": {"project_id": "gcp-project-mock-456"}},
        {"id_prefix": "ds-datadog-logs-mock", "name": "Datadog Logs ", "type": "DATADOG_LOGS_MOCK", "config": {"query_type": "log_volume_cost_mock"}},
        {"id_prefix": "ds-sharepoint-mock", "name": "SharePoint Site Docs ", "type": "SHAREPOINT_MOCK", "config": {"site_url": "mock-sharepoint/sites/docs", "library_name": "FinOps Reports"}},
        {"id_prefix": "ds-kibana-logs-mock", "name": "Kibana Logs ", "type": "KIBANA_MOCK", "config": {"index_pattern": "app-logs-*", "query": "level:ERROR"}},
        {"id_prefix": "ds-splunk-events-mock", "name": "Splunk Events ", "type": "SPLUNK_MOCK", "config": {"search_query": "index=main sourcetype=syslog ERROR", "time_range": "-24h"}}
    ]

    for ds_config_item in default_sources_config:
        # Check if data source with this name exists for the default tenant
        if not get_data_source_by_name(ds_config_item["name"], tenant_id):
            add_data_source(
                ds_id=f"{ds_config_item['id_prefix']}-{str(uuid.uuid4())[:8]}",
                tenant_id=tenant_id, # Associate with default tenant
                name=ds_config_item["name"], 
                ds_type=ds_config_item["type"],
                config_dict=ds_config_item["config"]
            )
    print("Default data source setup for default tenant complete.")

@app.on_event("startup")
async def startup_event():
    print(f"DEBUG Main: execute_check at startup: {execute_check} (type: {type(execute_check)})")
    init_db() # This also creates the default tenant if not exists
    # create_default_data_sources() # This will now use DEFAULT_TENANT_ID
    
    if not scheduler.running:
        scheduler.start()
        print("APScheduler started.")
    else:
        print("APScheduler already running. Rescheduling jobs from DB...")
        for job_item in scheduler.get_jobs(): scheduler.remove_job(job_item.id)
        print("All existing jobs removed from scheduler before reloading from DB.")
        
    # Load active checks for the default tenant
    active_checks = get_all_active_checks_from_db(DEFAULT_TENANT_ID)
    print(f"Found {len(active_checks)} active checks in DB for default tenant to schedule.")
    for check_row in active_checks:
        schedule_job_from_check_details(dict(check_row))

@app.on_event("shutdown")
async def shutdown_event():
    if scheduler.running: scheduler.shutdown(); print("APScheduler shut down.")

class QueryRequest(BaseModel):
    query: str
    dataSourceId: Optional[str] = None

class DataSourceCreateRequest(BaseModel):
    name: str
    type: str
    config: Optional[dict] = None

class DataSourceResponse(BaseModel):
    id: str
    name: str
    type: str
    config: Optional[dict] = None
    # tenant_id: str # Might not be needed by UI for now

@app.get("/")
async def root(): return {"message": "FinOps NL Parser Backend is running (Tenant Aware)!"}

@app.get("/api/datasources", response_model=List[DataSourceResponse])
async def list_data_sources_endpoint(): # Renamed to avoid conflict
    try:
        # For now, all users see data sources for the DEFAULT_TENANT_ID
        sources_from_db = get_all_data_sources(DEFAULT_TENANT_ID)
        response_sources = []
        for src in sources_from_db:
            config_dict = json.loads(src['config']) if src.get('config') else None
            response_sources.append(DataSourceResponse(id=src['id'], name=src['name'], type=src['type'], config=config_dict))
        return response_sources
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch data sources: {str(e)}")

@app.post("/api/datasources", status_code=201, response_model=DataSourceResponse)
async def create_data_source_api_endpoint(ds_data: DataSourceCreateRequest): # Renamed
    ds_id = f"ds-{ds_data.type.lower().replace('_','-').replace(' ','-')}-{str(uuid.uuid4())[:8]}"
    config_to_save = ds_data.config if ds_data.config is not None else {}
    success = add_data_source(
        ds_id=ds_id, tenant_id=DEFAULT_TENANT_ID, # Use default tenant
        name=ds_data.name, ds_type=ds_data.type, config_dict=config_to_save
    )
    if success:
        new_source_row = get_data_source_by_id(ds_id, DEFAULT_TENANT_ID)
        if new_source_row:
            new_source = dict(new_source_row)
            config_dict = json.loads(new_source['config']) if new_source.get('config') else None
            return DataSourceResponse(id=new_source['id'], name=new_source['name'], type=new_source['type'], config=config_dict)
        # Fallback, though get_data_source_by_id should find it
        return DataSourceResponse(id=ds_id, name=ds_data.name, type=ds_data.type, config=ds_data.config)
    else:
        raise HTTPException(status_code=400, detail="Failed to create data source. Name might already exist for this tenant.")

@app.delete("/api/datasources/{ds_id}", status_code=200)
async def delete_data_source_api_endpoint(ds_id: str):
    source = get_data_source_by_id(ds_id, DEFAULT_TENANT_ID) # Check existence within tenant
    if not source:
        raise HTTPException(status_code=404, detail="Data source not found for this tenant.")
    
    if delete_data_source_from_db(ds_id, DEFAULT_TENANT_ID): # Pass tenant_id for deletion
        return {"message": "Data source deleted successfully"}
    else:
        # delete_data_source_from_db prints specific errors
        raise HTTPException(status_code=500, detail="Could not delete data source.")


@app.post("/api/parse-query", status_code=201)
async def parse_query_endpoint(request: QueryRequest):
    if not client: raise HTTPException(status_code=503, detail="OpenAI client not initialized.")

    natural_language_query = request.query
    selected_data_source_id = request.dataSourceId
    print(f"Received query: '{natural_language_query}', for dataSourceId: {selected_data_source_id}")

    final_data_source_id = None
    # If a specific data source ID is provided, validate it belongs to the current tenant
    if selected_data_source_id:
        ds_row = get_data_source_by_id(selected_data_source_id, DEFAULT_TENANT_ID)
        if ds_row: final_data_source_id = ds_row['id']
        else: print(f"Warning: Provided dataSourceId '{selected_data_source_id}' not found for default tenant. Defaulting.")

    if not final_data_source_id: # Fallback to tenant's default CSV
        default_source = get_data_source_by_name("Default FinOps CSV", DEFAULT_TENANT_ID) 
        if default_source: final_data_source_id = default_source['id']; print(f"Using default data source for tenant: {default_source['name']}")
        else: # Emergency fallback: first data source of the tenant
            all_tenant_sources = get_all_data_sources(DEFAULT_TENANT_ID)
            if all_tenant_sources: final_data_source_id = all_tenant_sources[0]['id']; print(f"CRITICAL: Default CSV for tenant not found. Using first available: {all_tenant_sources[0]['name']}")
            else: raise HTTPException(status_code=500, detail="No data sources configured for this tenant.")
    
    # LLM Prompt (ensure it's your latest refined version)
    system_prompt = """
You are an AI assistant for a FinOps application. Your task is to parse a user's natural language query
and extract scheduling information, anomaly detection rules, a target service if specified, and rightsizing suggestions.
Return the output ONLY as a valid JSON object with the keys: "scheduleString", "anomalyCondition", "targetService", "actionableSuggestion".

- "scheduleString": A cron expression (e.g., "0 9 * * 1") or "N/A" if not specified.
- "anomalyCondition": A concise description of the anomaly trigger (e.g., "cost > 15% above weekly average", "spend exceeds $100"). If a specific resource is identified in "targetService", do NOT repeat it in "anomalyCondition". If not specified, return "N/A".
- "targetService": Extract the MOST SPECIFIC service name, resource identifier, or entity ID mentioned that the check directly monitors (e.g., "EC2", "S3", "K8S_POD_1", "my-specific-bucket", "AWS_CE_SVC_1"). If the query clearly indicates a check on a general service type (e.g., "overall Kubernetes spend", "all S3 buckets") and no more specific entity is mentioned for the core check, then return the general service type (e.g., "Kubernetes", "S3"). If no specific service is mentioned or it's about overall total costs, return null or "Overall".
- "actionableSuggestion": The suggested action if an anomaly is detected. If not specified, return "N/A".
"""
    try:
        completion = client.chat.completions.create(
            model="gpt-3.5-turbo-0125", response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"User Query: \"{natural_language_query}\""}
            ],
            temperature=0.1,
        )
        if hasattr(completion, 'choices'):
            llm_response_content = completion.choices[0].message.content
        else:
            llm_response_content = completion['choices'][0]['message']['content']
        print(f"LLM Raw Response: {llm_response_content}")
        parsed_data = json.loads(llm_response_content)

        check_id = f"check-{uuid.uuid4()}"
        db_check_data = {
            'id': check_id, 'natural_query': natural_language_query,
            'schedule_string': parsed_data.get("scheduleString"),
            'anomaly_condition_raw': parsed_data.get("anomalyCondition"),
            'target_service': parsed_data.get("targetService"),
            'suggestion': parsed_data.get("actionableSuggestion"),
            'data_source_id': final_data_source_id, 'status': 'active'
        }

        if add_check_to_db(db_check_data, DEFAULT_TENANT_ID): # Pass tenant_id
            full_check_details_row = get_check_from_db(check_id, DEFAULT_TENANT_ID) # Pass tenant_id
            if not full_check_details_row: raise HTTPException(status_code=500, detail="Failed to retrieve check after saving.")
            full_check_details = dict(full_check_details_row)
            schedule_job_from_check_details(full_check_details) # APScheduler doesn't need tenant_id directly for job
            
            ds_info_row = get_data_source_by_id(final_data_source_id, DEFAULT_TENANT_ID) # Pass tenant_id
            ds_info = dict(ds_info_row) if ds_info_row else {}
            
            return {
                "id": check_id, "query": natural_language_query,
                "schedule": db_check_data['schedule_string'],
                "condition": db_check_data['anomaly_condition_raw'],
                "targetService": db_check_data['target_service'],
                "dataSourceId": db_check_data['data_source_id'],
                "dataSourceName": ds_info.get('name', "N/A"),
                "dataSourceType": ds_info.get('type', "N/A"),
                "suggestion": db_check_data['suggestion'], "status": db_check_data['status']
            }
        else: raise HTTPException(status_code=500, detail="Failed to save check to database.")
    except json.JSONDecodeError: raise HTTPException(status_code=500, detail="LLM parse error.")
    except Exception as e: raise HTTPException(status_code=500, detail=f"Error processing query: {type(e).__name__} - {str(e)}")


'''
@app.get("/api/checks", response_model=List[dict]) # Keep response model flexible for now
async def get_all_checks_api_endpoint(): # Renamed
    # Using new tenant-specific DB function
    checks = get_all_checks_for_tenant_from_db(DEFAULT_TENANT_ID)
    return checks # This already returns list of dicts with aliased names
'''

@app.get("/api/alerts", response_model=List[dict])
async def get_alerts_api_endpoint(limit: int = 20): # Renamed
    try: return get_alerts_from_db(DEFAULT_TENANT_ID, limit=limit) # Pass tenant_id
    except Exception as e: raise HTTPException(status_code=500, detail="Failed to fetch alerts.")

@app.post("/api/checks/{check_id}/pause")
async def pause_check_api_endpoint(check_id: str): # Renamed
    check_row = get_check_from_db(check_id, DEFAULT_TENANT_ID) # Pass tenant_id
    if not check_row: raise HTTPException(status_code=404, detail="Check not found")
    check_details = dict(check_row)
    try:
        if scheduler.get_job(check_id): scheduler.remove_job(check_id)
        update_check_status_in_db(check_id, 'paused', DEFAULT_TENANT_ID) # Pass tenant_id
        check_details['status'] = 'paused'
        schedule_job_from_check_details(check_details)
        return {"message": f"Check {check_id} paused."}
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/checks/{check_id}/resume")
async def resume_check_api_endpoint(check_id: str): # Renamed
    check_row = get_check_from_db(check_id, DEFAULT_TENANT_ID) # Pass tenant_id
    if not check_row: raise HTTPException(status_code=404, detail="Check not found")
    check_details = dict(check_row)
    try:
        update_check_status_in_db(check_id, 'active', DEFAULT_TENANT_ID) # Pass tenant_id
        check_details['status'] = 'active'
        schedule_job_from_check_details(check_details)
        return {"message": f"Check {check_id} resumed."}
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/checks/{check_id}")
async def delete_check_api_endpoint(check_id: str): # Renamed
    if not get_check_from_db(check_id, DEFAULT_TENANT_ID): # Pass tenant_id
        raise HTTPException(status_code=404, detail="Check not found for this tenant")
    try:
        job = scheduler.get_job(check_id)
        if job: scheduler.remove_job(check_id); print(f"Removed job {check_id} from scheduler.")
        else: print(f"Job {check_id} not found in scheduler for removal.")
        delete_check_from_db(check_id, DEFAULT_TENANT_ID) # Pass tenant_id
        return {"message": f"Check {check_id} deleted successfully."}
    except Exception as e:
        print(f"Error during delete process for check {check_id}: {e}")
        # Attempt to delete from DB even if scheduler interaction fails
        try: delete_check_from_db(check_id, DEFAULT_TENANT_ID)
        except Exception as db_e: raise HTTPException(status_code=500, detail=f"DB delete error: {db_e}. Orig err: {e}")
        raise HTTPException(status_code=500, detail=f"Scheduler err, but deleted from DB: {e}")