import React, { useState } from 'react';

const API_BASE_URL = 'http://localhost:8000/api';

const AddDataSourceForm = ({ onDataSourceAdded, isVisible, onClose }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState('AWS_COST_EXPLORER_MOCK');
  
  // AWS Fields
  const [awsAccessKey, setAwsAccessKey] = useState('');
  const [awsSecretKey, setAwsSecretKey] = useState('');
  const [awsAccountId, setAwsAccountId] = useState('');
  const [awsRegion, setAwsRegion] = useState('us-east-1');
  const [awsRoleArn, setAwsRoleArn] = useState('');
  const [awsExternalId, setAwsExternalId] = useState('');
  
  // Kubernetes Fields
  const [k8sKubeconfigPath, setK8sKubeconfigPath] = useState('');
  const [k8sClusterEndpoint, setK8sClusterEndpoint] = useState('');
  const [k8sServiceAccountToken, setK8sServiceAccountToken] = useState('');
  const [k8sPrometheusEndpoint, setK8sPrometheusEndpoint] = useState('');
  const [k8sCostModelEndpoint, setK8sCostModelEndpoint] = useState('');
  const [k8sNamespace, setK8sNamespace] = useState('');
  
  // Splunk Fields
  const [splunkHost, setSplunkHost] = useState('');
  const [splunkPort, setSplunkPort] = useState('8089');
  const [splunkUsername, setSplunkUsername] = useState('');
  const [splunkPassword, setSplunkPassword] = useState('');
  const [splunkAuthToken, setSplunkAuthToken] = useState('');
  const [splunkDefaultIndex, setSplunkDefaultIndex] = useState('billing');
  const [splunkUseToken, setSplunkUseToken] = useState(false);
  
  // Kibana/Elasticsearch Fields
  const [esHosts, setEsHosts] = useState('');
  const [esUsername, setEsUsername] = useState('');
  const [esPassword, setEsPassword] = useState('');
  const [esApiKey, setEsApiKey] = useState('');
  const [kibanaHost, setKibanaHost] = useState('');
  const [kibanaSpace, setKibanaSpace] = useState('');
  const [costIndexPattern, setCostIndexPattern] = useState('billing-*');
  const [esUseApiKey, setEsUseApiKey] = useState(false);
  
  // Azure Fields
  const [azureSubscriptionId, setAzureSubscriptionId] = useState('');
  const [azureTenantId, setAzureTenantId] = useState('');
  const [azureClientId, setAzureClientId] = useState('');
  const [azureClientSecret, setAzureClientSecret] = useState('');
  
  // Common fields
  const [csvPath, setCsvPath] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);

  const awsRegions = [
    { value: 'us-east-1', label: 'US East (N. Virginia)' },
    { value: 'us-east-2', label: 'US East (Ohio)' },
    { value: 'us-west-1', label: 'US West (N. California)' },
    { value: 'us-west-2', label: 'US West (Oregon)' },
    { value: 'eu-west-1', label: 'Europe (Ireland)' },
    { value: 'eu-central-1', label: 'Europe (Frankfurt)' },
    { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)' },
  ];

  const dataSourceOptions = [
    { value: 'AWS_COST_EXPLORER_MOCK', label: 'AWS Cost Explorer', icon: '☁️', description: 'Connect your AWS Cost Explorer data for real-time cost monitoring' },
    { value: 'AZURE_COST_MGMT_MOCK', label: 'Azure Cost Management', icon: '🔷', description: 'Connect Azure cost management for spend analysis' },
    { value: 'KUBERNETES_METRICS_MOCK', label: 'Kubernetes Cluster', icon: '⚙️', description: 'Monitor Kubernetes resource costs and usage' },
    { value: 'GCP_BILLING_MOCK', label: 'GCP Billing Export', icon: '🟡', description: 'Connect GCP billing data for cost analysis' },
    { value: 'DATADOG_LOGS_MOCK', label: 'Datadog Logs & Metrics', icon: '📊', description: 'Monitor Datadog logging and metrics costs' },
    { value: 'SPLUNK_MOCK', label: 'Splunk Events & Logs', icon: '🔍', description: 'Monitor Splunk event ingestion and search costs' },
    { value: 'KIBANA_MOCK', label: 'Kibana Logs & Analytics', icon: '📈', description: 'Monitor Kibana indexing and search costs' },
    { value: 'SHAREPOINT_MOCK', label: 'SharePoint Documents', icon: '📄', description: 'Monitor SharePoint storage and document costs' },
    { value: 'CSV', label: 'CSV File', icon: '📁', description: 'Upload custom billing data from CSV files' },
  ];

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setError('');
    setSuccess('');
    
    // Simulate realistic connection testing based on type
    setTimeout(() => {
      const scenarios = {
        'AWS_COST_EXPLORER_MOCK': () => {
          if (!awsAccessKey || !awsSecretKey || !awsAccountId) {
            setError('❌ Connection failed: Missing required AWS credentials');
            return;
          }
          if (awsAccessKey.length < 16) {
            setError('❌ Connection failed: Invalid AWS Access Key format');
            return;
          }
          setSuccess('✅ AWS Connection successful! Found 3 services: EC2 ($234.50), S3 ($89.20), RDS ($156.30)');
        },
        'KUBERNETES_METRICS_MOCK': () => {
          if (!k8sKubeconfigPath && !k8sClusterEndpoint) {
            setError('❌ Connection failed: Either kubeconfig path or cluster endpoint required');
            return;
          }
          if (!k8sServiceAccountToken && k8sClusterEndpoint) {
            setError('❌ Connection failed: Service account token required for remote clusters');
            return;
          }
          setSuccess('✅ K8s Connection successful! Found 2 namespaces: production (15 pods), staging (8 pods)');
        },
        'SPLUNK_MOCK': () => {
          if (!splunkHost) {
            setError('❌ Connection failed: Splunk host required');
            return;
          }
          if (!splunkUseToken && (!splunkUsername || !splunkPassword)) {
            setError('❌ Connection failed: Username/password or auth token required');
            return;
          }
          setSuccess('✅ Splunk Connection successful! Found billing index with 45,000 events (last 7 days)');
        },
        'KIBANA_MOCK': () => {
          if (!esHosts) {
            setError('❌ Connection failed: Elasticsearch hosts required');
            return;
          }
          if (!esUseApiKey && (!esUsername || !esPassword)) {
            setError('❌ Connection failed: Username/password or API key required');
            return;
          }
          setSuccess('✅ Kibana Connection successful! Found cost data in 3 indices: billing-2024.*, logs-app-*, metrics-infra-*');
        }
      };
      
      const testFunction = scenarios[type];
      if (testFunction) {
        testFunction();
      } else {
        setSuccess(`✅ ${type.replace('_MOCK', '').replace(/_/g, ' ')} connection successful!`);
      }
      
      setTestingConnection(false);
    }, 2000 + Math.random() * 1000); // 2-3 second realistic delay
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name.trim() || !type) {
      setError('Name and Type are required.');
      return;
    }

    // Build production-like config but backend will ignore and use mocks
    let config = {};
    
    if (type === 'AWS_COST_EXPLORER_MOCK') {
      if (!awsAccessKey || !awsSecretKey || !awsAccountId) {
        setError('AWS Access Key, Secret Key, and Account ID are required.');
        return;
      }
      config = {
        access_key_id: awsAccessKey,
        secret_access_key: awsSecretKey,  // In prod, this would be encrypted
        account_id: awsAccountId,
        region: awsRegion,
        role_arn: awsRoleArn || null,
        external_id: awsExternalId || null,
        demo_note: "Production config collected - backend uses mock data for demo"
      };
    } else if (type === 'KUBERNETES_METRICS_MOCK') {
      if (!k8sKubeconfigPath && !k8sClusterEndpoint) {
        setError('Either kubeconfig path or cluster endpoint is required.');
        return;
      }
      config = {
        kubeconfig_path: k8sKubeconfigPath || null,
        cluster_endpoint: k8sClusterEndpoint || null,
        service_account_token: k8sServiceAccountToken || null,
        prometheus_endpoint: k8sPrometheusEndpoint || "http://prometheus:9090",
        cost_model_endpoint: k8sCostModelEndpoint || "http://cost-model:9003",
        namespace: k8sNamespace || "default",
        demo_note: "Production config collected - backend uses mock data for demo"
      };
    } else if (type === 'SPLUNK_MOCK') {
      if (!splunkHost) {
        setError('Splunk host is required.');
        return;
      }
      if (!splunkUseToken && (!splunkUsername || !splunkPassword)) {
        setError('Either username/password or auth token is required.');
        return;
      }
      config = {
        splunk_host: splunkHost,
        splunk_port: parseInt(splunkPort) || 8089,
        scheme: "https",
        ...(splunkUseToken ? 
          { auth_token: splunkAuthToken } : 
          { username: splunkUsername, password: splunkPassword }
        ),
        default_index: splunkDefaultIndex,
        verify_ssl: true,
        demo_note: "Production config collected - backend uses mock data for demo"
      };
    } else if (type === 'KIBANA_MOCK') {
      if (!esHosts) {
        setError('Elasticsearch hosts are required.');
        return;
      }
      if (!esUseApiKey && (!esUsername || !esPassword)) {
        setError('Either username/password or API key is required.');
        return;
      }
      config = {
        elasticsearch_hosts: esHosts.split(',').map(h => h.trim()),
        kibana_host: kibanaHost || null,
        kibana_space: kibanaSpace || null,
        cost_index_pattern: costIndexPattern,
        ...(esUseApiKey ? 
          { api_key: esApiKey } : 
          { elasticsearch_username: esUsername, elasticsearch_password: esPassword }
        ),
        verify_ssl: true,
        demo_note: "Production config collected - backend uses mock data for demo"
      };
    } else if (type === 'AZURE_COST_MGMT_MOCK') {
      if (!azureSubscriptionId || !azureTenantId || !azureClientId || !azureClientSecret) {
        setError('Azure Subscription ID, Tenant ID, Client ID, and Client Secret are required.');
        return;
      }
      config = {
        subscription_id: azureSubscriptionId,
        tenant_id: azureTenantId,
        client_id: azureClientId,
        client_secret: azureClientSecret,
        demo_note: "Production config collected - backend uses mock data for demo"
      };
    } else if (type === 'CSV') {
      if (!csvPath.trim()) {
        setError('CSV file path is required.');
        return;
      }
      config = { path: csvPath.trim() };
    } else {
      // For other mock types (GCP, Datadog, SharePoint)
      config = { 
        mock_type: type,
        description: `Production-ready ${type.replace('_MOCK', '').replace(/_/g, ' ')} configuration`,
        environment: 'production',
        demo_note: "Production config collected - backend uses mock data for demo"
      };
    }

    setIsLoading(true);
    const payload = { name: name.trim(), type, config };

    try {
      const response = await fetch(`${API_BASE_URL}/datasources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(responseData.detail || 'Failed to add data source.');
      }

      const selectedOption = dataSourceOptions.find(opt => opt.value === type);
      setSuccess(`✅ Data source '${name}' (${selectedOption?.label || type}) configured successfully! Backend will use mock data for demo.`);
      
      // Reset form
      resetForm();
      
      if (onDataSourceAdded) {
        onDataSourceAdded();
      }

      // Auto-close after success
      setTimeout(() => {
        if (onClose) onClose();
      }, 3000);
      
    } catch (err) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setName(''); setAwsAccessKey(''); setAwsSecretKey(''); setAwsAccountId(''); setAwsRegion('us-east-1');
    setAwsRoleArn(''); setAwsExternalId(''); setK8sKubeconfigPath(''); setK8sClusterEndpoint('');
    setK8sServiceAccountToken(''); setK8sPrometheusEndpoint(''); setK8sCostModelEndpoint(''); setK8sNamespace('');
    setSplunkHost(''); setSplunkPort('8089'); setSplunkUsername(''); setSplunkPassword(''); setSplunkAuthToken('');
    setSplunkDefaultIndex('billing'); setSplunkUseToken(false); setEsHosts(''); setEsUsername(''); setEsPassword('');
    setEsApiKey(''); setKibanaHost(''); setKibanaSpace(''); setCostIndexPattern('billing-*'); setEsUseApiKey(false);
    setAzureSubscriptionId(''); setAzureTenantId(''); setAzureClientId(''); setAzureClientSecret(''); setCsvPath('');
    setType('AWS_COST_EXPLORER_MOCK');
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-6xl shadow-lg rounded-md bg-white max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 sticky top-0 bg-white z-10 pb-4 border-b">
          <h2 className="text-xl font-semibold text-gray-700">Add Production Data Source</h2>
          {/* <div className="flex items-center space-x-2">
            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
              🎯 Demo Mode: Real configs collected, mock data used
            </span>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition duration-150 ease-in-out">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div> */}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Data Source Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Select Data Source Type:</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-h-80 overflow-y-auto">
              {dataSourceOptions.map(option => (
                <label key={option.value} className="relative">
                  <input
                    type="radio" name="dataSourceType" value={option.value}
                    checked={type === option.value} onChange={e => setType(e.target.value)}
                    className="sr-only"
                  />
                  <div className={`p-3 border-2 rounded-lg cursor-pointer transition duration-150 ease-in-out ${
                    type === option.value ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <div className="flex items-start">
                      <span className="text-xl mr-2 flex-shrink-0">{option.icon}</span>
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 text-sm">{option.label}</div>
                        <div className="text-xs text-gray-500 mt-1 leading-tight">{option.description}</div>
                      </div>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Data Source Name */}
          <div>
            <label htmlFor="ds-name" className="block text-sm font-medium text-gray-700">Data Source Name *</label>
            <input 
              type="text" id="ds-name" value={name} onChange={e => setName(e.target.value)}
              className="mt-1 w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" 
              required placeholder="e.g., Production AWS Account - Finance Team"
            />
          </div>

          {/* AWS-specific production fields */}
          {type === 'AWS_COST_EXPLORER_MOCK' && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">🔐 AWS Credentials & Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">AWS Access Key ID *</label>
                  <input type="text" value={awsAccessKey} onChange={e => setAwsAccessKey(e.target.value)}
                    className="mt-1 w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="AKIA..." required={type === 'AWS_COST_EXPLORER_MOCK'} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">AWS Secret Access Key *</label>
                  <input type="password" value={awsSecretKey} onChange={e => setAwsSecretKey(e.target.value)}
                    className="mt-1 w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="wJalrXUtn..." required={type === 'AWS_COST_EXPLORER_MOCK'} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">AWS Account ID *</label>
                  <input type="text" value={awsAccountId} onChange={e => setAwsAccountId(e.target.value)}
                    className="mt-1 w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="123456789012" pattern="[0-9]{12}" maxLength="12" required={type === 'AWS_COST_EXPLORER_MOCK'} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Primary Region</label>
                  <select value={awsRegion} onChange={e => setAwsRegion(e.target.value)}
                    className="mt-1 w-full p-3 bg-white border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                    {awsRegions.map(region => <option key={region.value} value={region.value}>{region.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Cross-Account Role ARN (Optional)</label>
                  <input type="text" value={awsRoleArn} onChange={e => setAwsRoleArn(e.target.value)}
                    className="mt-1 w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="arn:aws:iam::123456789012:role/FinOpsReadOnly" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">External ID (Optional)</label>
                  <input type="text" value={awsExternalId} onChange={e => setAwsExternalId(e.target.value)}
                    className="mt-1 w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="unique-external-id" />
                </div>
              </div>
              
              <div className="mt-4">
                <button type="button" onClick={handleTestConnection} disabled={!awsAccessKey || !awsSecretKey || !awsAccountId || testingConnection}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50">
                  {testingConnection ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Testing AWS Connection...
                    </>
                  ) : (
                    <>🔍 Test AWS Connection</>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Kubernetes production fields */}
          {type === 'KUBERNETES_METRICS_MOCK' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">⚙️ Kubernetes Cluster Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Kubeconfig File Path</label>
                  <input type="text" value={k8sKubeconfigPath} onChange={e => setK8sKubeconfigPath(e.target.value)}
                    className="mt-1 w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="/home/user/.kube/config or ~/.kube/config" />
                  <p className="text-xs text-gray-500 mt-1">Leave blank if using remote cluster endpoint</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Cluster API Endpoint (Alternative)</label>
                  <input type="text" value={k8sClusterEndpoint} onChange={e => setK8sClusterEndpoint(e.target.value)}
                    className="mt-1 w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://k8s-api.company.com:6443" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Service Account Token</label>
                  <input type="password" value={k8sServiceAccountToken} onChange={e => setK8sServiceAccountToken(e.target.value)}
                    className="mt-1 w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="eyJhbGciOiJSUzI1..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Prometheus Endpoint</label>
                  <input type="text" value={k8sPrometheusEndpoint} onChange={e => setK8sPrometheusEndpoint(e.target.value)}
                    className="mt-1 w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="http://prometheus:9090" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Cost Model Endpoint</label>
                  <input type="text" value={k8sCostModelEndpoint} onChange={e => setK8sCostModelEndpoint(e.target.value)}
                    className="mt-1 w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="http://cost-model:9003" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Default Namespace</label>
                  <input type="text" value={k8sNamespace} onChange={e => setK8sNamespace(e.target.value)}
                    className="mt-1 w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="finops-monitoring" />
                </div>
              </div>
              
              <div className="mt-4">
                <button type="button" onClick={handleTestConnection} disabled={(!k8sKubeconfigPath && !k8sClusterEndpoint) || testingConnection}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50">
                  {testingConnection ? '🔄 Testing K8s Connection...' : '🔍 Test K8s Connection'}
                </button>
              </div>
            </div>
          )}

          {/* Splunk production fields */}
          {type === 'SPLUNK_MOCK' && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">🔍 Splunk Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Splunk Host *</label>
                  <input type="text" value={splunkHost} onChange={e => setSplunkHost(e.target.value)}
                    className="mt-1 w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="splunk.company.com" required={type === 'SPLUNK_MOCK'} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Management Port</label>
                  <input type="number" value={splunkPort} onChange={e => setSplunkPort(e.target.value)}
                    className="mt-1 w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="8089" />
                </div>
                <div className="md:col-span-2">
                  <label className="flex items-center">
                    <input type="checkbox" checked={splunkUseToken} onChange={e => setSplunkUseToken(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50" />
                    <span className="ml-2 text-sm text-gray-700">Use Auth Token instead of Username/Password</span>
                  </label>
                </div>
                
                {splunkUseToken ? (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Auth Token *</label>
                    <input type="password" value={splunkAuthToken} onChange={e => setSplunkAuthToken(e.target.value)}
                      className="mt-1 w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Splunk <base64-token>" required={type === 'SPLUNK_MOCK' && splunkUseToken} />
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Username *</label>
                      <input type="text" value={splunkUsername} onChange={e => setSplunkUsername(e.target.value)}
                        className="mt-1 w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="finops_service_account" required={type === 'SPLUNK_MOCK' && !splunkUseToken} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Password *</label>
                      <input type="password" value={splunkPassword} onChange={e => setSplunkPassword(e.target.value)}
                        className="mt-1 w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="••••••••" required={type === 'SPLUNK_MOCK' && !splunkUseToken} />
                    </div>
                  </>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Default Index</label>
                  <input type="text" value={splunkDefaultIndex} onChange={e => setSplunkDefaultIndex(e.target.value)}
                    className="mt-1 w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="billing" />
                </div>
              </div>
              
              <div className="mt-4">
                <button type="button" onClick={handleTestConnection} disabled={!splunkHost || testingConnection}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50">
                  {testingConnection ? '🔄 Testing Splunk Connection...' : '🔍 Test Splunk Connection'}
                </button>
              </div>
            </div>
          )}

          {/* Kibana/Elasticsearch production fields */}
          {type === 'KIBANA_MOCK' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">📈 Kibana/Elasticsearch Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Elasticsearch Hosts *</label>
                  <input type="text" value={esHosts} onChange={e => setEsHosts(e.target.value)}
                    className="mt-1 w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://es1.company.com:9200,https://es2.company.com:9200" required={type === 'KIBANA_MOCK'} />
                  <p className="text-xs text-gray-500 mt-1">Comma-separated list of Elasticsearch endpoints</p>
                </div>
                
                <div className="md:col-span-2">
                  <label className="flex items-center">
                    <input type="checkbox" checked={esUseApiKey} onChange={e => setEsUseApiKey(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50" />
                    <span className="ml-2 text-sm text-gray-700">Use API Key instead of Username/Password</span>
                  </label>
                </div>
                
                {esUseApiKey ? (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">API Key *</label>
                    <input type="password" value={esApiKey} onChange={e => setEsApiKey(e.target.value)}
                      className="mt-1 w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="base64_encoded_api_key" required={type === 'KIBANA_MOCK' && esUseApiKey} />
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Username *</label>
                      <input type="text" value={esUsername} onChange={e => setEsUsername(e.target.value)}
                        className="mt-1 w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="finops_readonly" required={type === 'KIBANA_MOCK' && !esUseApiKey} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Password *</label>
                      <input type="password" value={esPassword} onChange={e => setEsPassword(e.target.value)}
                        className="mt-1 w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="••••••••" required={type === 'KIBANA_MOCK' && !esUseApiKey} />
                    </div>
                  </>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Kibana Host</label>
                  <input type="text" value={kibanaHost} onChange={e => setKibanaHost(e.target.value)}
                    className="mt-1 w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://kibana.company.com:5601" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Kibana Space</label>
                  <input type="text" value={kibanaSpace} onChange={e => setKibanaSpace(e.target.value)}
                    className="mt-1 w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="finops" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Cost Index Pattern</label>
                  <input type="text" value={costIndexPattern} onChange={e => setCostIndexPattern(e.target.value)}
                    className="mt-1 w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="billing-*" />
                </div>
              </div>
              
              <div className="mt-4">
                <button type="button" onClick={handleTestConnection} disabled={!esHosts || testingConnection}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50">
                  {testingConnection ? '🔄 Testing Kibana Connection...' : '🔍 Test Kibana Connection'}
                </button>
              </div>
            </div>
          )}

          {/* Azure production fields */}
          {type === 'AZURE_COST_MGMT_MOCK' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">🔷 Azure Cost Management Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Subscription ID *</label>
                  <input type="text" value={azureSubscriptionId} onChange={e => setAzureSubscriptionId(e.target.value)}
                    className="mt-1 w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="12345678-1234-1234-1234-123456789012" required={type === 'AZURE_COST_MGMT_MOCK'} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tenant ID *</label>
                  <input type="text" value={azureTenantId} onChange={e => setAzureTenantId(e.target.value)}
                    className="mt-1 w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="87654321-4321-4321-4321-210987654321" required={type === 'AZURE_COST_MGMT_MOCK'} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Client ID (Application ID) *</label>
                  <input type="text" value={azureClientId} onChange={e => setAzureClientId(e.target.value)}
                    className="mt-1 w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="11111111-2222-3333-4444-555555555555" required={type === 'AZURE_COST_MGMT_MOCK'} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Client Secret *</label>
                  <input type="password" value={azureClientSecret} onChange={e => setAzureClientSecret(e.target.value)}
                    className="mt-1 w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="your-client-secret" required={type === 'AZURE_COST_MGMT_MOCK'} />
                </div>
              </div>
              
              <div className="mt-4">
                <button type="button" onClick={handleTestConnection} disabled={!azureSubscriptionId || !azureTenantId || !azureClientId || !azureClientSecret || testingConnection}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50">
                  {testingConnection ? '🔄 Testing Azure Connection...' : '🔍 Test Azure Connection'}
                </button>
              </div>
            </div>
          )}

          {/* CSV fields (unchanged) */}
          {type === 'CSV' && (
            <div>
              <label htmlFor="csv-path" className="block text-sm font-medium text-gray-700">CSV File Path *</label>
              <input type="text" id="csv-path" value={csvPath} onChange={e => setCsvPath(e.target.value)}
                className="mt-1 w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" 
                required={type === 'CSV'} placeholder="e.g., sample_data.csv or /data/billing_export.csv" />
              <p className="text-xs text-gray-500 mt-1">Path should be accessible by the backend server.</p>
            </div>
          )}

          {/* Messages */}
          {error && (
            <div className="rounded-md bg-red-50 p-4 border border-red-200">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}
          
          {success && (
            <div className="rounded-md bg-green-50 p-4 border border-green-200">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-green-800">{success}</p>
                </div>
              </div>
            </div>
          )}

          {/* <div className="rounded-md bg-blue-50 p-4 border border-blue-200">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-800">
                  <strong>Demo Mode:</strong> This form collects production-ready configurations to demonstrate enterprise capabilities. 
                  The backend will use mock data for the hackathon demo, but all configuration fields are production-ready.
                </p>
              </div>
            </div>
          </div> */}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 bg-white sticky bottom-0">
            <button type="button" onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              Cancel
            </button>
            <button type="submit" disabled={isLoading}
              className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition duration-150 ease-in-out">
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Configuring...
                </>
              ) : (
                'Add Data Source'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddDataSourceForm;