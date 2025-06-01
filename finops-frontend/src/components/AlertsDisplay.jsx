// src/components/AlertsDisplay.jsx
import React, { useState } from 'react';

const AlertsDisplay = ({ alerts }) => {
  const [expandedAlert, setExpandedAlert] = useState(null);
  const [filter, setFilter] = useState('all'); // all, anomaly, error

  const getAlertClass = (message) => { 
    if (message.toLowerCase().includes('alert for check')) return 'border-l-4 border-red-500 bg-red-50';
    if (message.toLowerCase().includes('error')) return 'border-l-4 border-orange-500 bg-orange-50';
    return 'border-l-4 border-blue-500 bg-blue-50';
  };

  const getAlertType = (message) => {
    if (message.toLowerCase().includes('alert for check')) return 'anomaly';
    if (message.toLowerCase().includes('error')) return 'error';
    return 'info';
  };

  const getAlertIcon = (message) => {
    const type = getAlertType(message);
    switch (type) {
      case 'anomaly': return '🚨';
      case 'error': return '❌';
      default: return 'ℹ️';
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'all') return true;
    return getAlertType(alert.message) === filter;
  });

  const parseAlertMessage = (message) => {
    // Parse structured alert message
    if (message.includes('ALERT for Check')) {
      const parts = message.split(/[()]/);
      const mainMessage = parts[0];
      const details = parts[1] || '';
      const suggestion = message.split('Suggestion: ')[1] || '';
      
      return {
        type: 'structured',
        title: mainMessage.replace('ALERT for Check ', '').split(':')[0],
        condition: mainMessage.split(': ')[1]?.split('.')[0] || '',
        details: details,
        suggestion: suggestion
      };
    }
    
    return {
      type: 'simple',
      message: message
    };
  };

  return (
    <section className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-700">System Alerts & Logs</h2>
        
        {/* Filter buttons */}
        <div className="flex space-x-1">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 text-xs font-medium rounded-full transition duration-150 ease-in-out ${
              filter === 'all' ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            All ({alerts.length})
          </button>
          <button
            onClick={() => setFilter('anomaly')}
            className={`px-3 py-1 text-xs font-medium rounded-full transition duration-150 ease-in-out ${
              filter === 'anomaly' ? 'bg-red-600 text-white' : 'bg-red-100 text-red-700 hover:bg-red-200'
            }`}
          >
            Anomalies ({alerts.filter(a => getAlertType(a.message) === 'anomaly').length})
          </button>
          <button
            onClick={() => setFilter('error')}
            className={`px-3 py-1 text-xs font-medium rounded-full transition duration-150 ease-in-out ${
              filter === 'error' ? 'bg-orange-600 text-white' : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
            }`}
          >
            Errors ({alerts.filter(a => getAlertType(a.message) === 'error').length})
          </button>
        </div>
      </div>

      {filteredAlerts.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-2">📊</div>
          <p className="text-gray-500">
            {filter === 'all' ? 'No system alerts to display yet.' : `No ${filter} alerts found.`}
          </p>
          {filter !== 'all' && (
            <button
              onClick={() => setFilter('all')}
              className="mt-2 text-blue-600 hover:text-blue-500 text-sm"
            >
              View all alerts
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {filteredAlerts.map((alert) => {
            const isExpanded = expandedAlert === alert.id;
            const parsedAlert = parseAlertMessage(alert.message);
            
            return (
              <div key={alert.id || alert.alert_time} className={`rounded-lg transition-all duration-150 ease-in-out ${getAlertClass(alert.message)}`}>
                <div 
                  className="p-4 cursor-pointer"
                  onClick={() => setExpandedAlert(isExpanded ? null : alert.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <span className="text-lg flex-shrink-0 mt-0.5">
                        {getAlertIcon(alert.message)}
                      </span>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-xs font-medium text-gray-500">
                            {new Date(alert.alert_time).toLocaleString()}
                          </span>
                          {alert.check_id && (
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                              Check ID: {alert.check_id.substring(0, 8)}...
                            </span>
                          )}
                        </div>
                        
                        {parsedAlert.type === 'structured' ? (
                          <div>
                            <h4 className="font-medium text-gray-900 text-sm mb-1">
                              {parsedAlert.title}
                            </h4>
                            <p className="text-sm text-gray-700">
                              {parsedAlert.condition}
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-700">
                            {parsedAlert.message.length > 100 && !isExpanded 
                              ? `${parsedAlert.message.substring(0, 100)}...` 
                              : parsedAlert.message
                            }
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <button className="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-600">
                      <svg 
                        className={`w-4 h-4 transition-transform duration-150 ${isExpanded ? 'rotate-180' : ''}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-200 bg-gray-50">
                    <div className="pt-3 space-y-3">
                      {parsedAlert.type === 'structured' && (
                        <>
                          {parsedAlert.details && (
                            <div>
                              <h5 className="text-xs font-medium text-gray-600 uppercase tracking-wider mb-1">
                                Data Source Details
                              </h5>
                              <p className="text-sm text-gray-700 font-mono bg-white px-2 py-1 rounded">
                                {parsedAlert.details}
                              </p>
                            </div>
                          )}
                          
                          {parsedAlert.suggestion && (
                            <div>
                              <h5 className="text-xs font-medium text-gray-600 uppercase tracking-wider mb-1">
                                Recommended Action
                              </h5>
                              <p className="text-sm text-blue-700 bg-blue-50 px-3 py-2 rounded border border-blue-200">
                                💡 {parsedAlert.suggestion}
                              </p>
                            </div>
                          )}
                        </>
                      )}
                      
                      {/* Raw message for debugging */}
                      <details className="text-xs">
                        <summary className="text-gray-500 cursor-pointer hover:text-gray-700">
                          Raw Alert Data
                        </summary>
                        <pre className="mt-2 bg-gray-100 p-2 rounded text-xs overflow-x-auto">
                          {JSON.stringify(alert, null, 2)}
                        </pre>
                      </details>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      
      {/* Summary Stats */}
      {alerts.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Total Alerts: {alerts.length}</span>
            <span>
              Last Updated: {alerts[0] ? new Date(alerts[0].alert_time).toLocaleTimeString() : 'Never'}
            </span>
          </div>
        </div>
      )}
    </section>
  );
};

export default AlertsDisplay;