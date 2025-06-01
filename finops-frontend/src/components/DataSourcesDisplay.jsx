// src/components/DataSourcesDisplay.jsx
import React, { useState } from 'react';

const DataSourcesDisplay = ({ dataSources, onDeleteDataSource, isLoading, onAddNewDataSource }) => {
  const [expandedSource, setExpandedSource] = useState(null);
  const [, setShowAddForm] = useState(false);

  // Function to clean up data source type names for display
  const getCleanTypeName = (type) => {
    return type
      .replace('_MOCK', '') // Remove _MOCK suffix
      .replace(/_/g, ' ') // Replace underscores with spaces
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()) // Title case
      .join(' ');
  };

  const getConnectionStatusColor = (type) => {
    // Simulate different connection states for demo
    const mockStatuses = {
      'AWS_COST_EXPLORER_MOCK': 'connected',
      'KUBERNETES_METRICS_MOCK': 'connected', 
      'CSV': 'connected',
      'AZURE_COST_MGMT_MOCK': 'warning',
      'GCP_BILLING_MOCK': 'connected',
      'DATADOG_LOGS_MOCK': 'connected'
    };
    return mockStatuses[type] || 'connected';
  };

  const formatConfigForDisplay = (config, type) => {
    if (!config) return 'No configuration';
    
    // Format based on data source type
    switch (type) {
      case 'AWS_COST_EXPLORER_MOCK':
        return `Account: ${config.account_id || 'N/A'}, Region: ${config.region || 'N/A'}`;
      case 'KUBERNETES_METRICS_MOCK':
        return `Cluster: ${config.cluster_name || 'N/A'}`;
      case 'CSV':
        return `Path: ${config.path || 'N/A'}`;
      default:
        return Object.entries(config)
          .map(([key, value]) => `${key}: ${String(value).substring(0, 30)}`)
          .join(', ');
    }
  };

  const handleAddNew = () => {
    setShowAddForm(true);
    if (onAddNewDataSource) {
      onAddNewDataSource();
    }
  };

  if (isLoading && dataSources.length === 0) {
    return <p className="text-center text-gray-500">Loading data sources...</p>;
  }

  return (
    <section className="bg-white rounded-lg shadow-md">
      {/* Header with Add Button */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-700">Registered Data Sources</h2>
          <button
            onClick={handleAddNew}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-150 ease-in-out"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Data Source
          </button>
        </div>
      </div>

      {/* Data Sources Table */}
      <div className="p-6">
        {dataSources.length === 0 ? (
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2 2v-5m16 0h-4l-2 2-2-2h-4" />
            </svg>
            <p className="mt-2 text-gray-500">No data sources registered yet.</p>
            <button
              onClick={handleAddNew}
              className="mt-4 text-blue-600 hover:text-blue-500 font-medium"
            >
              Add your first data source
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name & Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Configuration</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dataSources.map((ds) => {
                  const isExpanded = expandedSource === ds.id;
                  const connectionStatus = getConnectionStatusColor(ds.type);
                  
                  return (
                    <React.Fragment key={ds.id}>
                      <tr className="hover:bg-gray-50 transition duration-150 ease-in-out">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                <span className="text-blue-600 font-semibold text-sm">
                                  {ds.type.includes('AWS') ? '☁️' : 
                                   ds.type.includes('K8S') ? '⚙️' : 
                                   ds.type.includes('AZURE') ? '🔷' : 
                                   ds.type.includes('GCP') ? '🟡' : 
                                   ds.type.includes('DATADOG') ? '📊' : 
                                   ds.type.includes('SPLUNK') ? '🔍' : 
                                   ds.type.includes('KIBANA') ? '📈' : '📁'}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{ds.name}</div>
                              <div className="text-sm text-gray-500">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {getCleanTypeName(ds.type)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          <div className="max-w-xs truncate">
                            {formatConfigForDisplay(ds.config, ds.type)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            connectionStatus === 'connected' ? 'bg-green-100 text-green-800' :
                            connectionStatus === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            <span className={`w-1.5 h-1.5 mr-1.5 rounded-full ${
                              connectionStatus === 'connected' ? 'bg-green-400' :
                              connectionStatus === 'warning' ? 'bg-yellow-400' :
                              'bg-red-400'
                            }`}></span>
                            {connectionStatus === 'connected' ? 'Connected' :
                             connectionStatus === 'warning' ? 'Warning' : 'Error'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => setExpandedSource(isExpanded ? null : ds.id)}
                              className="text-indigo-600 hover:text-indigo-900 transition duration-150 ease-in-out"
                            >
                              {isExpanded ? 'Hide' : 'Details'}
                            </button>
                            <button
                              onClick={() => onDeleteDataSource(ds.id)}
                              className="text-red-600 hover:text-red-800 disabled:opacity-50 transition duration-150 ease-in-out"
                              disabled={isLoading}
                              title={`Delete ${ds.name}`}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                      
                      {/* Expanded Details Row */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={4} className="px-6 py-4 bg-gray-50">
                            <div className="rounded-lg bg-white p-4 shadow-sm border">
                              <h4 className="text-sm font-medium text-gray-900 mb-3">Data Source Details</h4>
                              <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
                                <div>
                                  <dt className="text-sm font-medium text-gray-500">ID</dt>
                                  <dd className="text-sm text-gray-900 font-mono">{ds.id}</dd>
                                </div>
                                <div>
                                  <dt className="text-sm font-medium text-gray-500">Type</dt>
                                  <dd className="text-sm text-gray-900">{ds.type}</dd>
                                </div>
                                {ds.config && Object.entries(ds.config).map(([key, value]) => (
                                  <div key={key}>
                                    <dt className="text-sm font-medium text-gray-500 capitalize">{key.replace(/_/g, ' ')}</dt>
                                    <dd className="text-sm text-gray-900">{String(value)}</dd>
                                  </div>
                                ))}
                              </dl>
                              
                              {/* Mock Data Preview for AWS */}
                              {ds.type === 'AWS_COST_EXPLORER_MOCK' && (
                                <div className="mt-4 pt-4 border-t border-gray-200">
                                  <h5 className="text-sm font-medium text-gray-900 mb-2">Recent Cost Data Preview</h5>
                                  <div className="bg-gray-100 rounded p-3 text-xs font-mono">
                                    <div className="text-green-600">AWS_CE_SVC_1: $234.06 (Latest)</div>
                                    <div className="text-blue-600">AWS_CE_SVC_2: $156.32 (Latest)</div>
                                    <div className="text-gray-500 mt-1">7-day average: $198.45</div>
                                    <div className="text-orange-600 mt-1">⚠️ Spike detected in AWS_CE_SVC_1 (see alerts)</div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
};

export default DataSourcesDisplay;