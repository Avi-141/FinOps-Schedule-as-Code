# executor.py
import pandas as pd
from datetime import datetime, timedelta
import json
import random 

from database import (
    get_check_from_db, update_check_execution_outcome, 
    add_alert_to_db, get_data_source_by_id, 
    DEFAULT_TENANT_ID # Import for use in add_alert_to_db if check's tenant_id isn't easily available
)

# Global toggle for AWS Mock 'real-time' spike simulation
aws_mock_should_add_realtime_spike_next = False

def parse_anomaly_condition(condition_str: str, data_df: pd.DataFrame, local_service_filter: str = None):
    print(f"Executor: Parsing condition: '{condition_str}' for service: {local_service_filter or 'Overall'}")
    
    if data_df.empty:
        print("Executor: Initial data_df is empty for parse_anomaly_condition.")
        return pd.Series(dtype=bool) # Return empty boolean Series

    current_data = data_df.copy() # Work on a copy

    if local_service_filter and local_service_filter.lower() != 'overall' and 'service_name' in current_data.columns:
        current_data = current_data[current_data['service_name'].str.lower() == local_service_filter.lower()].copy()
        if current_data.empty:
            print(f"Executor: No data found for service filter: '{local_service_filter}'")
            return pd.Series(dtype=bool) # Return empty boolean Series
    elif local_service_filter and local_service_filter.lower() != 'overall': # Filter provided but no service_name column or 'overall'
        print(f"Executor: Service filter '{local_service_filter}' provided, but 'service_name' column not in data or service is 'overall'. Processing all passed data.")

    if current_data.empty:
        print("Executor: No data to process for anomaly condition after any filtering.")
        return pd.Series(dtype=bool)

    potential_anomalies = pd.Series([False] * len(current_data.index), index=current_data.index)

    if 'date' in current_data.columns:
        try:
            current_data['date'] = pd.to_datetime(current_data['date'])
            current_data = current_data.sort_values(by='date')
        except Exception as e_date:
            print(f"Executor: Error converting 'date' column: {e_date}")
            return potential_anomalies

    if 'above' in condition_str.lower() and 'average' in condition_str.lower() and '%' in condition_str:
        try:
            parts = condition_str.lower().split()
            percentage_str = next(p for p in parts if '%' in p)
            percentage = float(percentage_str.replace('%', '')) / 100.0
            days_str = next(p for p in parts if '-day' in p)
            window = int(days_str.split('-')[0])
            metric_col = 'cost' 

            if metric_col not in current_data.columns:
                print(f"Executor: Metric '{metric_col}' not found in current_data.")
                return potential_anomalies
            
            if len(current_data) < 1 : 
                 print(f"Executor: Not enough data points ({len(current_data)}) for percentage average check after filtering.")
                 return potential_anomalies

            current_data['moving_avg'] = current_data[metric_col].rolling(window=window, min_periods=1).mean().shift(1)
            
            if current_data.iloc[-1:].empty:
                 print("Executor: No data available to check latest entry for percentage average (possibly after shift).")
                 return potential_anomalies

            latest_entry = current_data.iloc[-1]
            if pd.isna(latest_entry['moving_avg']): 
                print(f"Executor: Moving average is NaN for latest entry. Not enough data for {window}-day MA for {local_service_filter or 'overall'}.")
                return potential_anomalies

            threshold = latest_entry['moving_avg'] * (1 + percentage)
            is_anomaly = latest_entry[metric_col] > threshold
            
            if is_anomaly:
                print(f"Executor: ANOMALY (Percentage): {local_service_filter or 'Overall'} {metric_col} {latest_entry[metric_col]:.2f} > {percentage*100:.0f}% above {window}-day avg ({latest_entry['moving_avg']:.2f}), threshold {threshold:.2f}")
                potential_anomalies.loc[latest_entry.name] = True
            else:
                print(f"Executor: OK (Percentage): {local_service_filter or 'Overall'} {metric_col} {latest_entry[metric_col]:.2f} vs avg {latest_entry['moving_avg']:.2f}, threshold {threshold:.2f}")
            return potential_anomalies
        except StopIteration: 
            print(f"Executor: Could not parse percentage/days from condition string: '{condition_str}'")
            return potential_anomalies
        except Exception as e:
            print(f"Executor: Error in percentage average logic: {type(e).__name__} - {e}")
            return potential_anomalies

    elif any(op_keyword in condition_str.lower() for op_keyword in ['>', '<', 'exceeds', 'above', 'greater', 'less', 'below', 'is ']):
        try:
            parts = condition_str.replace('$', '').lower().split()
            metric_col = 'cost' 
            value_str = None
            value = None
            operator_symbol = None
            possible_operators = { '>': ['>', 'greater', 'exceeds', 'above', 'over'], '<': ['<', 'less', 'below', 'under'] }

            found_op_val = False
            for i in range(len(parts) -1, 0, -1): 
                try:
                    val_candidate = parts[i]
                    value = float(val_candidate)
                    value_str = val_candidate 
                    operator_phrase_words = []
                    for j in range(i - 1, -1, -1):
                        word = parts[j]
                        operator_phrase_words.insert(0, word)
                        current_phrase = " ".join(operator_phrase_words)
                        for sym, keywords in possible_operators.items():
                            if current_phrase in keywords or any(kw in current_phrase for kw in keywords):
                                operator_symbol = sym
                                metric_candidate_index = j - 1
                                if metric_candidate_index >= 0 and parts[metric_candidate_index].isalpha():
                                    if parts[metric_candidate_index] in current_data.columns: metric_col = parts[metric_candidate_index]
                                    elif metric_candidate_index > 0 and f"{parts[metric_candidate_index-1]}_{parts[metric_candidate_index]}" in current_data.columns:
                                        metric_col = f"{parts[metric_candidate_index-1]}_{parts[metric_candidate_index]}"
                                    elif parts[0].isalpha() and parts[0] in current_data.columns and parts[0] not in current_phrase:
                                        metric_col = parts[0] 
                                elif parts[0].isalpha() and parts[0] in current_data.columns and parts[0] not in current_phrase : 
                                    metric_col = parts[0]
                                break 
                        if operator_symbol: break 
                    if operator_symbol: found_op_val = True; break 
                except ValueError: continue 
            
            if not found_op_val or not operator_symbol:
                print(f"Executor: Could not reliably parse operator/value from: '{condition_str}'")
                return potential_anomalies

            if metric_col not in current_data.columns:
                print(f"Executor: Metric column '{metric_col}' (parsed/defaulted) not found for fixed threshold.")
                return potential_anomalies
            
            if current_data.iloc[-1:].empty:
                 print("Executor: No data to check latest entry for fixed threshold.")
                 return potential_anomalies
                 
            latest_entry = current_data.iloc[-1]
            is_anomaly = False
            if operator_symbol == '>': is_anomaly = latest_entry[metric_col] > value
            elif operator_symbol == '<': is_anomaly = latest_entry[metric_col] < value
            
            if is_anomaly:
                print(f"Executor: ANOMALY (Fixed): {local_service_filter or 'Overall'} {metric_col} {latest_entry[metric_col]:.2f} {operator_symbol} {value:.2f}")
                potential_anomalies.loc[latest_entry.name] = True
            else:
                print(f"Executor: OK (Fixed): {local_service_filter or 'Overall'} {metric_col} {latest_entry[metric_col]:.2f} vs threshold {operator_symbol} {value:.2f}")
            return potential_anomalies
        except Exception as e:
            print(f"Executor: Error parsing fixed threshold: '{condition_str}': {type(e).__name__} - {e}")
            return potential_anomalies
    else:
        print(f"Executor: Condition type not recognized by current parsers: '{condition_str}'")
        return potential_anomalies

# Data Fetchers (load_data_from_csv, generate_mock_dataframe, fetch_mock_..._data functions)
# ... (Paste your latest working versions of all these functions here, including the AWS dynamic spike) ...
def load_data_from_csv(config: dict):
    path = config.get("path", "sample_data.csv")
    print(f"Executor: Loading data from CSV: {path}")
    try:
        df = pd.read_csv(path)
        if 'date' not in df.columns: raise ValueError(f"CSV '{path}' must contain a 'date' column.")
        df['date'] = pd.to_datetime(df['date'])
        df = df.sort_values(by='date').reset_index(drop=True)
        return df
    except FileNotFoundError: print(f"Executor: CSV file not found at {path}"); raise 
    except Exception as e: print(f"Executor: Error loading CSV {path}: {e}"); raise

def generate_mock_dataframe(days=15, service_prefix="MOCK_SVC", base_cost=50.0, cost_trend=1.02, cost_noise=5.0, units_base=10.0, units_trend=1.01, units_noise=2.0, 
                              historical_spike_day_offset=-2, historical_spike_multiplier=2.0, 
                              apply_realtime_spike_on_latest=False, realtime_spike_multiplier=2.5):
    dates = [datetime.now().date() - timedelta(days=i) for i in range(days-1, -1, -1)]
    data_rows = []; current_cost_s1 = base_cost * 0.7; current_units_s1 = units_base * 0.7
    current_cost_s2 = base_cost * 0.3; current_units_s2 = units_base * 0.3
    for i, day in enumerate(dates):
        cost_s1 = current_cost_s1 + random.uniform(-cost_noise, cost_noise)
        units_s1 = int(current_units_s1 + random.uniform(-units_noise, units_noise))
        is_historical_spike_day = (i == (days + historical_spike_day_offset))
        is_last_day_for_realtime_spike = (apply_realtime_spike_on_latest and i == (days - 1))
        if is_last_day_for_realtime_spike: cost_s1 *= realtime_spike_multiplier; print(f"Executor (gen_mock_df): Applied REALTIME spike ({realtime_spike_multiplier}x) to {service_prefix}_1 for {day}")
        elif is_historical_spike_day: cost_s1 *= historical_spike_multiplier; print(f"Executor (gen_mock_df): Applied HISTORICAL spike ({historical_spike_multiplier}x) to {service_prefix}_1 for {day}")
        data_rows.append({'date': day, 'service_name': f"{service_prefix}_1", 'cost': round(max(1, cost_s1), 2), 'units': max(1, units_s1)})
        current_cost_s1 = max(1, current_cost_s1 * (cost_trend + random.uniform(-0.01, 0.01))); current_units_s1 = max(1, current_units_s1 * (units_trend + random.uniform(-0.005, 0.005)))
        cost_s2 = current_cost_s2 + random.uniform(-cost_noise / 2, cost_noise / 2); units_s2 = int(current_units_s2 + random.uniform(-units_noise / 2, units_noise / 2))
        data_rows.append({'date': day, 'service_name': f"{service_prefix}_2", 'cost': round(max(1, cost_s2), 2), 'units': max(1, units_s2)})
        current_cost_s2 = max(1, current_cost_s2 * (cost_trend + random.uniform(-0.005, 0.005))); current_units_s2 = max(1, current_units_s2 * (units_trend + random.uniform(-0.002, 0.002)))
    return pd.DataFrame(data_rows).sort_values(by='date').reset_index(drop=True)

def fetch_mock_aws_cost_explorer_data(config: dict):
    global aws_mock_should_add_realtime_spike_next 
    print(f"Executor: Fetching MOCK AWS CE data. Config: {config}. Spike next: {aws_mock_should_add_realtime_spike_next}")
    apply_spike_this_run = aws_mock_should_add_realtime_spike_next
    aws_mock_should_add_realtime_spike_next = not aws_mock_should_add_realtime_spike_next 
    return generate_mock_dataframe(days=20, service_prefix="AWS_CE_SVC", base_cost=200, cost_trend=1.03, cost_noise=15, historical_spike_day_offset=-3, historical_spike_multiplier=1.8, apply_realtime_spike_on_latest=apply_spike_this_run, realtime_spike_multiplier=2.5)
def fetch_mock_k8s_cluster_data(config: dict): print(f"Executor: Fetching MOCK K8s data. Config: {config}"); return generate_mock_dataframe(days=10, service_prefix="K8S_POD", base_cost=20, cost_trend=1.05, units_base=1, units_noise=1, historical_spike_day_offset=-2, historical_spike_multiplier=3)
def fetch_mock_azure_cost_mgmt_data(config: dict): print(f"Executor: Fetching MOCK Azure CM data. Config: {config}"); return generate_mock_dataframe(days=15, service_prefix="AZ_VM", base_cost=150, cost_noise=10, cost_trend=1.01, historical_spike_day_offset=-4, historical_spike_multiplier=1.6)
def fetch_mock_gcp_billing_data(config: dict): print(f"Executor: Fetching MOCK GCP Billing data. Config: {config}"); return generate_mock_dataframe(days=18, service_prefix="GCP_INSTANCE", base_cost=180, cost_trend=1.02, historical_spike_day_offset=-2, historical_spike_multiplier=1.7)
def fetch_mock_datadog_logs_data(config: dict): print(f"Executor: Fetching MOCK Datadog Logs data. Config: {config}"); return generate_mock_dataframe(days=7, service_prefix="LOG_SRC", base_cost=5, cost_trend=1.1, cost_noise=1, units_base=10000, units_trend=1.2, units_noise=5000, historical_spike_multiplier=2.5)
def fetch_mock_sharepoint_data(config: dict): print(f"Executor: Fetching MOCK SharePoint data. Config: {config}"); return generate_mock_dataframe(days=5, service_prefix="SP_DOC", base_cost=1, cost_trend=1, cost_noise=0.1, units_base=50, units_trend=1.05, units_noise=5, historical_spike_day_offset=-1, historical_spike_multiplier=1.5) # Example: units could be 'file_count'
def fetch_mock_kibana_data(config: dict): print(f"Executor: Fetching MOCK Kibana data. Config: {config}"); return generate_mock_dataframe(days=7, service_prefix="KIBANA_IDX", base_cost=2, cost_trend=1.05, cost_noise=0.5, units_base=100, units_trend=1.1, units_noise=20, historical_spike_day_offset=-2, historical_spike_multiplier=2)
def fetch_mock_splunk_data(config: dict): print(f"Executor: Fetching MOCK Splunk data. Config: {config}"); return generate_mock_dataframe(days=7, service_prefix="SPLUNK_EVT", base_cost=3, cost_trend=1.03, cost_noise=0.3, units_base=500, units_trend=1.15, units_noise=100, historical_spike_day_offset=-1, historical_spike_multiplier=2.2)


def execute_check(check_id: str):
    print(f"Executor: Executing check ID: {check_id} at {datetime.now()}")
    # <<< Fetch check_details along with tenant_id for add_alert_to_db >>>
    # Assuming get_check_from_db returns a dictionary or Row that includes tenant_id
    check_details_row = get_check_from_db(check_id, DEFAULT_TENANT_ID) # Pass default tenant for now

    if not check_details_row:
        msg = f"Error! Check ID {check_id} not found in database (for default tenant)."
        print(f"Executor: {msg}")
        # Cannot call add_alert_to_db if check_details (and thus tenant_id) is not found
        return

    check_details = dict(check_details_row)
    # <<< Extract tenant_id from check_details for use with add_alert_to_db >>>
    tenant_id_for_alert = check_details.get("tenant_id", DEFAULT_TENANT_ID) 
    data_source_id = check_details.get("data_source_id")
    # ... (rest of the variable assignments from check_details)
    anomaly_condition_str = check_details.get("anomaly_condition_raw", "")
    explicit_target_service = check_details.get("target_service") 
    suggestion = check_details.get("suggestion", "N/A.")
    natural_query = check_details.get("natural_query", "N/A")
    run_status = "failure_execution_initial"
    df = None
    data_source_name_for_alert = "Unknown Data Source"


    try:
        if not data_source_id:
            raise ValueError("Data Source ID not configured for this check.")

        data_source_details_row = get_data_source_by_id(data_source_id, tenant_id_for_alert) # Pass tenant_id
        if not data_source_details_row:
            raise ValueError(f"Data Source definition for ID '{data_source_id}' not found for tenant '{tenant_id_for_alert}'.")
        
        data_source = dict(data_source_details_row)
        ds_type = data_source.get("type")
        ds_config_str = data_source.get("config", "{}")
        ds_config = json.loads(ds_config_str) if ds_config_str else {}
        data_source_name_for_alert = data_source.get('name', ds_type)

        print(f"Executor: Check {check_id} using DS '{data_source_name_for_alert}' (Type: {ds_type}) Config: {ds_config}")

        if ds_type == "CSV": df = load_data_from_csv(ds_config)
        elif ds_type == "AWS_COST_EXPLORER_MOCK": df = fetch_mock_aws_cost_explorer_data(ds_config)
        elif ds_type == "KUBERNETES_METRICS_MOCK": df = fetch_mock_k8s_cluster_data(ds_config)
        elif ds_type == "AZURE_COST_MGMT_MOCK": df = fetch_mock_azure_cost_mgmt_data(ds_config)
        elif ds_type == "GCP_BILLING_MOCK": df = fetch_mock_gcp_billing_data(ds_config)
        elif ds_type == "DATADOG_LOGS_MOCK": df = fetch_mock_datadog_logs_data(ds_config)
        elif ds_type == "SHAREPOINT_MOCK": df = fetch_mock_sharepoint_data(ds_config)
        elif ds_type == "KIBANA_MOCK": df = fetch_mock_kibana_data(ds_config)
        elif ds_type == "SPLUNK_MOCK": df = fetch_mock_splunk_data(ds_config)
        else: raise NotImplementedError(f"Data source type '{ds_type}' processing not implemented.")

        if df is None or df.empty:
            raise ValueError(f"No data from DS type '{ds_type}'.")

        anomalies_found_series = parse_anomaly_condition(
            condition_str=anomaly_condition_str, data_df=df,
            local_service_filter=explicit_target_service
        )
        
        if not anomalies_found_series.empty and anomalies_found_series.any():
            alert_message = (f"ALERT for Check '{natural_query}' (DS: {data_source_name_for_alert}, Svc: {explicit_target_service or 'Overall'}): Anomaly on condition '{anomaly_condition_str}'. Suggestion: {suggestion}")
            print(f"Executor: {alert_message}")
            add_alert_to_db(check_id=check_id, message=alert_message, tenant_id=tenant_id_for_alert) # Pass tenant_id
            run_status = "anomaly_detected"
        elif not anomalies_found_series.empty:
            print(f"Executor: No anomalies for {check_id} (DS: {data_source_name_for_alert}, Svc: {explicit_target_service or 'Overall'})")
            run_status = "no_anomaly"
        else: 
            print(f"Executor: Anomaly check for {check_id} (DS: {data_source_name_for_alert}, Svc: {explicit_target_service or 'Overall'}) had no result.")
            run_status = "failure_condition_processing"

    except (FileNotFoundError, ValueError, NotImplementedError) as specific_error:
        err_msg = f"Data/Config error for {check_id} (DS: {data_source_name_for_alert}): {type(specific_error).__name__} - {specific_error}"
        print(f"Executor: {err_msg}")
        add_alert_to_db(check_id=check_id, message=f"Exec Error for '{natural_query}': {err_msg}", tenant_id=tenant_id_for_alert) # Pass tenant_id
        run_status = f"failure_data_error: {str(specific_error)[:100]}"
    except Exception as e:
        err_msg = f"General error executing {check_id}: {type(e).__name__} - {e}"
        print(f"Executor: {err_msg}")
        add_alert_to_db(check_id=check_id, message=f"Exec Error for '{natural_query}': {err_msg}", details=str(e), tenant_id=tenant_id_for_alert) # Pass tenant_id
        run_status = f"failure_execution: {type(e).__name__} - {str(e)[:100]}"
    
    update_check_execution_outcome(check_id, datetime.now(), run_status)

if __name__ == '__main__':
    pass