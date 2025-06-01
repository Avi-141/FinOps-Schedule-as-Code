# database.py
import sqlite3
import json
from datetime import datetime
import uuid

DATABASE_NAME = "finops_checks.db"

# Hardcoded IDs for single-tenant simulation during Hackathon
DEFAULT_TENANT_ID = "default-tenant-001"
DEFAULT_USER_ID = "default-user-001" # Could be owner of the default tenant

def get_db_connection():
    conn = sqlite3.connect(DATABASE_NAME)
    conn.row_factory = sqlite3.Row
    # Enable foreign key constraint enforcement for this connection
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # <<< NEW tenants Table >>>
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS tenants (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            owner_user_id TEXT, -- For future use with actual user auth
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Data Sources Table - ADDED tenant_id
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS data_sources (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL, -- <<< NEW
            name TEXT NOT NULL,     -- Name should be unique within a tenant
            type TEXT NOT NULL, 
            config TEXT,        
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE, -- <<< NEW
            UNIQUE (tenant_id, name) -- <<< Ensure name is unique per tenant
        )
    """)

    # Scheduled Checks Table - ADDED tenant_id
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS scheduled_checks (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL, -- <<< NEW
            natural_query TEXT NOT NULL,
            schedule_string TEXT NOT NULL,
            anomaly_condition_raw TEXT NOT NULL,
            target_service TEXT,
            suggestion TEXT NOT NULL,
            data_source_id TEXT, 
            status TEXT NOT NULL DEFAULT 'active',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_run_at DATETIME,
            next_run_at DATETIME,
            last_run_status TEXT,
            FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE, -- <<< NEW
            FOREIGN KEY (data_source_id) REFERENCES data_sources (id) ON DELETE SET NULL
        )
    """)

    # Alerts table - ADDED tenant_id (optional but good for consistency)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id TEXT, -- <<< NEW (Optional, but good for data separation)
            check_id TEXT,
            alert_time DATETIME DEFAULT CURRENT_TIMESTAMP,
            message TEXT NOT NULL,
            details TEXT,
            is_read INTEGER DEFAULT 0, 
            FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE, -- <<< NEW
            FOREIGN KEY (check_id) REFERENCES scheduled_checks (id) ON DELETE CASCADE
        )
    """)
    conn.commit()

    # Add default tenant if it doesn't exist
    cursor.execute("INSERT OR IGNORE INTO tenants (id, name, owner_user_id) VALUES (?, ?, ?)",
                   (DEFAULT_TENANT_ID, "Default Tenant", DEFAULT_USER_ID))
    conn.commit()

    conn.close()
    print("Database initialized (multi-tenant schema with default tenant).")

# --- Tenant Management (Basic) ---
def get_tenant_by_id(tenant_id: str):
    conn = get_db_connection()
    tenant = conn.execute("SELECT * FROM tenants WHERE id = ?", (tenant_id,)).fetchone()
    conn.close()
    return tenant

# --- Data Source CRUD (Now tenant-aware) ---
def add_data_source(ds_id: str, tenant_id: str, name: str, ds_type: str, config_dict: dict = None):
    conn = get_db_connection()
    cursor = conn.cursor()
    config_json_str = json.dumps(config_dict) if config_dict else None
    try:
        cursor.execute("""
            INSERT INTO data_sources (id, tenant_id, name, type, config)
            VALUES (?, ?, ?, ?, ?)
        """, (ds_id, tenant_id, name, ds_type, config_json_str))
        conn.commit()
        print(f"Data source '{name}' (Tenant: {tenant_id}, ID: {ds_id}, Type: {ds_type}) added.")
        return True
    except sqlite3.IntegrityError as e: # Handles UNIQUE constraint (tenant_id, name)
        print(f"Error adding data source '{name}' for tenant '{tenant_id}': {e}")
        return False
    finally:
        conn.close()

def get_data_source_by_id(ds_id: str, tenant_id: str): # Now requires tenant_id
    conn = get_db_connection()
    # Ensure query is tenant-scoped if ds_id might not be globally unique (though UUIDs are)
    source = conn.execute("SELECT * FROM data_sources WHERE id = ? AND tenant_id = ?", (ds_id, tenant_id)).fetchone()
    conn.close()
    return source

def get_data_source_by_name(name: str, tenant_id: str): # Now requires tenant_id
    conn = get_db_connection()
    source = conn.execute("SELECT * FROM data_sources WHERE name = ? AND tenant_id = ?", (name, tenant_id)).fetchone()
    conn.close()
    return source

def get_all_data_sources(tenant_id: str): # Now requires tenant_id
    conn = get_db_connection()
    sources = conn.execute("SELECT id, name, type, config FROM data_sources WHERE tenant_id = ? ORDER BY name", (tenant_id,)).fetchall()
    conn.close()
    return [dict(row) for row in sources]

def delete_data_source_from_db(ds_id: str, tenant_id: str): # Now requires tenant_id
    conn = get_db_connection()
    try:
        conn.execute("PRAGMA foreign_keys = ON;")
        # Ensure deletion is tenant-scoped for security, though ds_id should be unique
        cursor = conn.execute("DELETE FROM data_sources WHERE id = ? AND tenant_id = ?", (ds_id, tenant_id))
        conn.commit()
        if cursor.rowcount > 0:
            print(f"Data source {ds_id} for tenant {tenant_id} deleted from DB.")
            return True
        else:
            print(f"Data source {ds_id} not found for tenant {tenant_id} or no rows deleted.")
            return False # Or raise an error
    except Exception as e:
        print(f"Error deleting data source {ds_id} for tenant {tenant_id} from DB: {e}")
        return False
    finally:
        conn.close()

# --- Scheduled Check CRUD (Now tenant-aware) ---
def add_check_to_db(check_data, tenant_id: str): # Requires tenant_id
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO scheduled_checks (
                id, tenant_id, natural_query, schedule_string, anomaly_condition_raw, 
                target_service, suggestion, data_source_id, status 
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) 
        """, (
            check_data['id'], tenant_id, check_data['natural_query'],
            check_data['schedule_string'], check_data['anomaly_condition_raw'],
            check_data.get('target_service'), check_data['suggestion'],
            check_data['data_source_id'], 
            check_data.get('status', 'active')
        ))
        conn.commit()
        print(f"Check {check_data['id']} for tenant {tenant_id} added, linked to DS_ID: {check_data['data_source_id']}.")
        return True
    except sqlite3.IntegrityError as e:
        print(f"Error adding check {check_data['id']} for tenant {tenant_id} to DB: {e}")
        return False
    finally:
        conn.close()

def get_check_from_db(check_id: str, tenant_id: str): # Requires tenant_id
    conn = get_db_connection()
    check = conn.execute("SELECT * FROM scheduled_checks WHERE id = ? AND tenant_id = ?", (check_id, tenant_id)).fetchone()
    conn.close()
    return check

def get_all_active_checks_from_db(tenant_id: str): # Requires tenant_id
    conn = get_db_connection()
    # For scheduler startup, it might run checks for all tenants if scheduler is global.
    # Or, if scheduler is tenant-specific, this is fine.
    # For now, let's assume a global scheduler loads all active checks.
    # If you need tenant-specific loading for scheduler, adjust this.
    # For simplicity, the startup logic in main.py will assume a single (default) tenant for now.
    checks = conn.execute("SELECT * FROM scheduled_checks WHERE status = 'active' AND tenant_id = ?", (tenant_id,)).fetchall()
    conn.close()
    return checks

def get_all_checks_for_tenant_from_db(tenant_id: str): # New function for API
    conn = get_db_connection()
    # This already joins with data_sources for name/type in main.py's /api/checks
    # So here, just fetch checks for the tenant
    checks_rows = conn.execute("""
        SELECT c.*, ds.name as dataSourceName, ds.type as dataSourceType
        FROM scheduled_checks c 
        LEFT JOIN data_sources ds ON c.data_source_id = ds.id AND c.tenant_id = ds.tenant_id
        WHERE c.tenant_id = ?
        ORDER BY c.created_at DESC
    """, (tenant_id,)).fetchall()
    conn.close()
    return [dict(row) for row in checks_rows]


def update_check_status_in_db(check_id: str, status: str, tenant_id: str): # Requires tenant_id
    conn = get_db_connection()
    conn.execute("UPDATE scheduled_checks SET status = ? WHERE id = ? AND tenant_id = ?", (status, check_id, tenant_id))
    conn.commit()
    conn.close()
    print(f"Status for check {check_id} (Tenant: {tenant_id}) updated to {status} in DB.")

def update_check_run_times_in_db(check_id: str, last_run_at, next_run_at, last_run_status="success"):
    # This is called by main.py's scheduler, check_id should be globally unique
    conn = get_db_connection()
    conn.execute("""
        UPDATE scheduled_checks SET last_run_at = ?, next_run_at = ?, last_run_status = ?
        WHERE id = ?
    """, (last_run_at, next_run_at, last_run_status, check_id))
    conn.commit()
    conn.close()

def update_check_execution_outcome(check_id: str, last_run_time, last_run_status):
    # This is called by executor.py, check_id should be globally unique
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE scheduled_checks SET last_run_at = ?, last_run_status = ? WHERE id = ?
    """, (last_run_time, last_run_status, check_id))
    conn.commit()
    conn.close()
    print(f"Check {check_id} exec outcome updated: Last run {last_run_time}, Status: {last_run_status}")

def delete_check_from_db(check_id: str, tenant_id: str): # Requires tenant_id
    conn = get_db_connection()
    conn.execute("DELETE FROM scheduled_checks WHERE id = ? AND tenant_id = ?", (check_id, tenant_id))
    conn.commit()
    conn.close()
    print(f"Check {check_id} for tenant {tenant_id} deleted from DB.")

# --- Alerts (Now tenant-aware, optional but good) ---
def add_alert_to_db(check_id: str, message: str, tenant_id: str, details: str = None): # Requires tenant_id
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO alerts (check_id, tenant_id, alert_time, message, details)
            VALUES (?, ?, ?, ?, ?)
        """, (check_id, tenant_id, datetime.now(), message, details))
        conn.commit()
        return cursor.lastrowid
    except Exception as e:
        print(f"Error adding alert for check {check_id}, tenant {tenant_id}: {e}")
        return None
    finally:
        conn.close()

def get_alerts_from_db(tenant_id: str, limit=50): # Requires tenant_id
    conn = get_db_connection()
    alerts_rows = conn.execute("""
        SELECT id, check_id, alert_time, message, details, is_read 
        FROM alerts 
        WHERE tenant_id = ?
        ORDER BY alert_time DESC 
        LIMIT ?
    """, (tenant_id, limit)).fetchall()
    conn.close()
    return [dict(row) for row in alerts_rows]

if __name__ == '__main__':
    init_db() # This will also create the default tenant
    print("database.py run directly. Database schema should be initialized/verified with default tenant.")
    # Example of adding default data sources if you run this file directly, for the default tenant
    # default_tenant_id_for_script = DEFAULT_TENANT_ID 
    # if not get_data_source_by_name("Default CSV", default_tenant_id_for_script):
    #     add_data_source(ds_id=f"ds-csv-script-{uuid.uuid4()[:8]}", tenant_id=default_tenant_id_for_script, name="Default CSV", ds_type="CSV", config_dict={"path": "sample_data.csv"})
    # # ... and so on for other default sources if needed for direct script testing