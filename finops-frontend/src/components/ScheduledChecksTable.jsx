const ScheduledChecksTable = ({ checks, onEdit, onDelete, onToggleStatus }) => {

  const getLastRunStatusClass = (runStatus) => {
    if (!runStatus) return 'text-gray-500'; // Not run yet or unknown
    if (runStatus === 'anomaly_detected') return 'text-red-600 font-semibold';
    if (runStatus === 'no_anomaly') return 'text-green-600';
    if (runStatus.startsWith('failure')) return 'text-orange-500';
    return 'text-gray-700'; // Default for 'success' or other statuses
  };


  const getStatusClass = (status) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800';
      case 'Paused':
        return 'bg-yellow-100 text-yellow-800';
      case 'Error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <section className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4 text-gray-700">Scheduled Checks</h2>
      {checks.length === 0 ? (
        <p className="text-gray-500">No checks scheduled yet. Use the form above to create one.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Query Snippet</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Schedule</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Condition</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Suggestion</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {checks.map((check) => {
                console.log("Check object being rendered in table:", JSON.stringify(check, null, 2))
                return(
                   <tr key={check.id}>
                  <td className="px-4 py-4 text-sm text-gray-700 max-w-xs truncate" title={check.query}>
                    {check.query.substring(0, 40) + (check.query.length > 40 ? '...' : '')}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-500">{check.schedule}</td>
                  <td className="px-4 py-4 text-sm text-gray-500">{check.condition}</td>
                  <td className="px-4 py-4 text-sm text-gray-500">{check.suggestion}</td>
                  <td className="px-4 py-4 text-sm">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(check.status)}`}>
                      {check.status}
                    </span>
                  </td>
                  <td className={`px-4 py-4 text-sm whitespace-nowrap ${getLastRunStatusClass(check.last_run_status)}`}>
                  {check.last_run_status ? check.last_run_status.replace('_', ' ') : 'Not run yet'}
                  {check.last_run_at && (
                    <div className="text-xs text-gray-400">
                      {new Date(check.last_run_at).toLocaleString()}
                    </div>
                  )}
                  </td>
                  <td className="px-4 py-4 text-sm font-medium space-x-2 whitespace-nowrap">
                    <button onClick={() => onEdit(check.id)} className="text-indigo-600 hover:text-indigo-900 transition duration-150 ease-in-out">Edit</button>
                    <button onClick={() => onDelete(check.id)} className="text-red-600 hover:text-red-900 transition duration-150 ease-in-out">Delete</button>
                    <button onClick={() => onToggleStatus(check.id)} className="text-gray-600 hover:text-gray-900 transition duration-150 ease-in-out">
                      {check.status === 'active' ? 'Pause' : 'Activate'}
                    </button>
                  </td>
                </tr>
                )
          })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default ScheduledChecksTable;