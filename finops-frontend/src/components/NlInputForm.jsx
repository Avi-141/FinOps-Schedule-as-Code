import { useState, useEffect } from 'react';

const NlInputForm = ({ onSubmitQuery, editingCheck, onCancelEdit, isLoading, dataSources = [] }) => { 
  const [query, setQuery] = useState('');
  const [selectedDataSourceId, setSelectedDataSourceId] = useState('');

  // Function to clean up data source type names for display
  const getCleanTypeName = (type) => {
    return type
      .replace('_MOCK', '') // Remove _MOCK suffix
      .replace(/_/g, ' ') // Replace underscores with spaces
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()) // Title case
      .join(' ');
  };

  useEffect(() => {
    if (editingCheck) {
      setQuery(editingCheck.query || ''); 
      setSelectedDataSourceId(editingCheck.data_source_id || editingCheck.dataSourceId || '');
    } else {
      setQuery('');
      if (dataSources.length > 0) {
        const defaultCsv = dataSources.find(ds => ds.name && ds.name.toLowerCase().includes('default csv'));
        if (defaultCsv) {
          setSelectedDataSourceId(defaultCsv.id);
        } else {
          setSelectedDataSourceId(dataSources[0].id);
        }
      } else {
        setSelectedDataSourceId('');
      }
    }
  }, [editingCheck, dataSources]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isLoading) return;

    if (!query.trim()) {
      alert("Please enter a query.");
      return;
    }
    if (dataSources.length > 0 && !selectedDataSourceId) {
      alert("Please select a Data Source.");
      return;
    }
    onSubmitQuery(query.trim(), selectedDataSourceId); 
    if (!editingCheck) {
        // Optionally clear form for new submissions
    }
  };

  const handleCancel = () => {
    if (!isLoading) {
        onCancelEdit();
    }
  };

  return (
    <section className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4 text-gray-700">
        {editingCheck ? 'Edit FinOps Check' : 'Create New FinOps Check'}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="nl-query" className="block text-sm font-medium text-gray-600 mb-1">
            {editingCheck ? 'Update your FinOps check query (will be re-parsed by AI):' : 'Enter your FinOps check in plain English:'}
          </label>
          <textarea
            id="nl-query"
            rows={3}
            className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={"e.g., Every weekday at 2 AM UTC, check AWS EC2 spend if it's 20% above the 7-day average, suggest resizing from m5.large to t3.medium"}
            disabled={isLoading}
          />
        </div>

        {dataSources && dataSources.length > 0 ? (
          <div>
            <label htmlFor="data-source-select" className="block text-sm font-medium text-gray-700 mb-1">
              Data Source for this Check:
            </label>
            <select
              id="data-source-select"
              value={selectedDataSourceId}
              onChange={(e) => setSelectedDataSourceId(e.target.value)}
              className="w-full p-3 bg-white border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out"
              disabled={isLoading}
            >
              {dataSources.map(ds => (
                <option key={ds.id} value={ds.id}>
                  {ds.name} ({getCleanTypeName(ds.type)})
                </option>
              ))}
            </select>
          </div>
        ) : (
            <p className="text-sm text-gray-500">Loading data sources or no data sources configured...</p>
        )}
        
        {!editingCheck && (
            <p className="mt-1 text-xs text-gray-500">
              Your natural language command will be parsed by AI to schedule the check.
            </p>
        )}

        <div className="flex justify-end space-x-3 pt-2">
          {editingCheck && (
            <button
              type="button" onClick={handleCancel}
              className="px-6 py-2 bg-gray-300 text-gray-700 font-semibold rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition duration-150 ease-in-out disabled:opacity-50"
              disabled={isLoading}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            className={`px-6 py-2 text-white font-semibold rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition duration-150 ease-in-out disabled:opacity-50 ${
              editingCheck 
                ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500' 
                : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
            }`}
            disabled={isLoading}
          >
            {isLoading ? (editingCheck ? 'Updating...' : 'Scheduling...') : (editingCheck ? 'Update Check' : 'Schedule Check')}
          </button>
        </div>
      </form>
    </section>
  );
};
export default NlInputForm;