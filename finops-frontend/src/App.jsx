// src/App.jsx
import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import NLInputForm from './components/NLInputForm';
import ScheduledChecksTable from './components/ScheduledChecksTable';
import AlertsDisplay from './components/AlertsDisplay';
import AddDataSourceForm from './components/AddDataSourceForm';
import DataSourcesDisplay from './components/DataSourcesDisplay';

const API_BASE_URL = 'http://localhost:8000/api';

function App() {
  const [checks, setChecks] = useState([]);
  const [systemAlerts, setSystemAlerts] = useState([]);
  const [dataSources, setDataSources] = useState([]);
  const [editingCheck, setEditingCheck] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [isDataSourcesLoading, setIsDataSourcesLoading] = useState(false);
  const [clientLog, setClientLog] = useState([]);
  
  // Modal state
  const [showAddDataSourceModal, setShowAddDataSourceModal] = useState(false);

  const addClientLog = useCallback((message, type = 'INFO') => {
    const newLog = {
      id: `clientlog-${Date.now()}-${Math.random()}`,
      timestamp: new Date().toISOString(),
      message, type,
    };
    setClientLog(prevLogs => [newLog, ...prevLogs].slice(0, 15));
  }, []);
  
  const fetchChecks = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/checks`);
      if (!response.ok) {
        const errData = await response.json().catch(() => ({ detail: "Failed to fetch checks."}));
        throw new Error(errData.detail || "Failed to fetch checks");
      }
      const data = await response.json();
      setChecks(data);
    } catch (error) {
      console.error("Error fetching checks:", error);
      addClientLog(`Error fetching checks: ${error.message}`, 'ERROR');
    }
  }, [addClientLog]);

  const fetchSystemAlerts = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/alerts`);
      if (!response.ok) {
        const errData = await response.json().catch(() => ({ detail: "Failed to fetch system alerts."}));
        throw new Error(errData.detail || "Failed to fetch system alerts");
      }
      const data = await response.json();
      setSystemAlerts(data);
    } catch (error) {
      console.error("Error fetching system alerts:", error);
      addClientLog(`Error fetching system alerts: ${error.message}`, 'ERROR');
    }
  }, [addClientLog]);

  const fetchDataSources = useCallback(async () => {
    setIsDataSourcesLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/datasources`);
      if (!response.ok) {
        const errData = await response.json().catch(() => ({ detail: "Failed to fetch data sources."}));
        throw new Error(errData.detail || "Failed to fetch data sources");
      }
      const data = await response.json();
      setDataSources(data);
    } catch (error) {
      console.error("Error fetching data sources:", error);
      addClientLog(`Error fetching data sources: ${error.message}`, 'ERROR');
    } finally {
      setIsDataSourcesLoading(false);
    }
  }, [addClientLog]);

  useEffect(() => {
    fetchChecks();
    fetchSystemAlerts();
    fetchDataSources();
    
    const alertsIntervalId = setInterval(fetchSystemAlerts, 15000);
    const checksIntervalId = setInterval(fetchChecks, 30000);
    const dataSourcesIntervalId = setInterval(fetchDataSources, 60000);

    return () => {
        clearInterval(alertsIntervalId);
        clearInterval(checksIntervalId);
        clearInterval(dataSourcesIntervalId);
    };
  }, [fetchChecks, fetchSystemAlerts, fetchDataSources]);

  const handleScheduleQuerySubmit = async (naturalLanguageQuery, selectedDataSourceId) => {
    setIsFormLoading(true);
    addClientLog(`Processing query for data source ${selectedDataSourceId || 'default'}...`, 'INFO');
    
    const payload = { query: naturalLanguageQuery };
    if (selectedDataSourceId) {
      payload.dataSourceId = selectedDataSourceId;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/parse-query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(responseData.detail || `Backend error: ${response.status}`);
      }
      addClientLog(editingCheck ? `Check '${responseData.query?.substring(0,30)}...' updated.` : `New check '${responseData.query?.substring(0,30)}...' created.`, 'SUCCESS');
      setEditingCheck(null); 
      fetchChecks(); 
      fetchSystemAlerts(); 
    } catch (error) {
      console.error("Error processing query via backend:", error);
      addClientLog(`Error processing query: ${error.message}`, 'ERROR');
    } finally {
      setIsFormLoading(false);
    }
  };

  const handleStartEditCheck = (checkId) => { 
    const checkToEdit = checks.find(check => check.id === checkId);
    if (checkToEdit) {
      setEditingCheck(checkToEdit); 
      addClientLog(`Editing check: "${checkToEdit.query.substring(0,30)}...". Modify and submit to re-parse.`, 'INFO');
    }
  };
  
  const handleCancelEdit = () => { 
    setEditingCheck(null); 
    addClientLog('Editing cancelled.', 'INFO');
  };

  const createApiActionHandler = (entity, action, successMessage, httpMethod = 'POST') => {
    return async (itemId) => {
      const itemNameToLog = entity === 'check' ? `check ${itemId}` : `data source ${itemId}`;
      addClientLog(`Attempting to ${action} ${itemNameToLog}...`, 'INFO');
      setIsLoading(true);
      let url = `${API_BASE_URL}/${entity}s`; 
      if (itemId) { 
        url = `${API_BASE_URL}/${entity}s/${itemId}`;
        if(action && action !== 'delete'){ 
            url += `/${action}`;
        }
      }

      try {
        const response = await fetch(url, { method: httpMethod });
        const responseData = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(responseData.detail || `Failed to ${action} ${entity}: ${response.statusText}`);
        }
        addClientLog(successMessage || `${entity.charAt(0).toUpperCase() + entity.slice(1)} ${itemId} ${action}ed successfully.`, 'SUCCESS');
        
        if (entity === 'check') fetchChecks();
        else if (entity === 'datasource') fetchDataSources();
        fetchSystemAlerts();

      } catch (error) {
        console.error(`Error ${action}ing ${entity}:`, error);
        addClientLog(`Error ${action}ing ${entity}: ${error.message}`, 'ERROR');
      } finally {
        setIsLoading(false);
      }
    };
  };

  const handleDeleteCheck = createApiActionHandler('check', 'delete', 'Check deleted successfully.', 'DELETE');
  const handlePauseCheck = createApiActionHandler('check', 'pause', 'Check paused successfully.');
  const handleResumeCheck = createApiActionHandler('check', 'resume', 'Check resumed successfully.');
  
  const handleToggleStatusCheck = (checkId) => {
    const check = checks.find(c => c.id === checkId);
    if (check) {
      if (check.status === 'active') {
        handlePauseCheck(checkId);
      } else if (check.status === 'paused') {
        handleResumeCheck(checkId);
      } else {
        addClientLog(`Cannot toggle status for check '${check.query?.substring(0,20)}...' with status: ${check.status}`, 'WARN');
      }
    }
  };

  const handleDataSourceAdded = () => {
    fetchDataSources(); 
    addClientLog('Data source registered successfully!', 'SUCCESS');
    setShowAddDataSourceModal(false);
  };

  const handleDeleteDataSource = createApiActionHandler('datasource', 'delete', 'Data source deleted successfully.', 'DELETE');

  const handleAddNewDataSource = () => {
    setShowAddDataSourceModal(true);
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 font-sans">
      <Header />
      <main className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Create New Check Section */}
        <NLInputForm
          onSubmitQuery={handleScheduleQuerySubmit}
          editingCheck={editingCheck}
          onCancelEdit={handleCancelEdit}
          isLoading={isFormLoading}
          dataSources={dataSources} 
        />
        
        {/* Data Sources Management - Full Width */}
        <DataSourcesDisplay 
          dataSources={dataSources} 
          onDeleteDataSource={handleDeleteDataSource}
          isLoading={isDataSourcesLoading || isLoading}
          onAddNewDataSource={handleAddNewDataSource}
        />
        
        {/* Client Activity Log */}
        {clientLog.length > 0 && (
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h3 className="text-md font-semibold mb-2 text-gray-600">Recent Activity:</h3>
            <div className="space-y-1 max-h-32 overflow-y-auto text-xs">
              {clientLog.slice(0, 5).map(log => (
                <p key={log.id} className={`${log.type === 'ERROR' ? 'text-red-500' : log.type === 'SUCCESS' ? 'text-green-500' : 'text-gray-500'}`}>
                  [{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}] {log.message}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Scheduled Checks Table */}
        {isLoading && checks.length === 0 && !isFormLoading && (
            <div className="text-center p-4 text-blue-600 font-semibold">
                Loading FinOps Checks...
            </div>
        )}

        <ScheduledChecksTable
            checks={checks}
            onEdit={handleStartEditCheck}
            onDelete={handleDeleteCheck}
            onToggleStatus={handleToggleStatusCheck}
        />
        
        {/* System Alerts */}
        <AlertsDisplay alerts={systemAlerts} />
      </main>

      {/* Add Data Source Modal */}
      <AddDataSourceForm 
        onDataSourceAdded={handleDataSourceAdded}
        isVisible={showAddDataSourceModal}
        onClose={() => setShowAddDataSourceModal(false)}
      />
      
      <footer className="text-center p-4 mt-8 text-sm text-gray-500 border-t border-gray-300">
         © {new Date().getFullYear()} FinOps NL Scheduler - Multi-Tenant MVP
      </footer>
    </div>
  );
}

export default App;