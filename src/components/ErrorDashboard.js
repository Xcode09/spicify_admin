// src/components/ErrorDashboard.jsx
import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

export default function ErrorDashboard() {
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'app_errors'), orderBy('timestamp', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const errorsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate()
      }));
      setErrors(errorsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const refreshErrors = () => {
    //setLoading(true);
    // The snapshot listener will automatically update
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center mb-6">
        <ExclamationTriangleIcon className="h-8 w-8 text-red-500 mr-3" />
        <h1 className="text-2xl font-bold text-gray-800">Error Logs</h1>
        <div className="ml-4 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
          {errors.length} total
        </div>
        <button 
          onClick={refreshErrors}
          className="ml-auto flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowPathIcon className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {errors.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            {loading ? 'Loading errors...' : 'No errors found'}
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {errors.map((error) => (
              <li key={error.id} className="p-4 hover:bg-gray-50">
                <div className="flex justify-between">
                  <div>
                    <p className="font-medium text-red-600">{error.message}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {error.timestamp?.toLocaleString()}
                    </p>
                    {error.location && (
                      <p className="text-xs text-gray-400 mt-1">
                        Location: {error.location}
                      </p>
                    )}
                  </div>
                </div>
                {error.stack && (
                  <details className="mt-2">
                    <summary className="text-sm text-blue-600 cursor-pointer">
                      Show stack trace
                    </summary>
                    <pre className="text-xs bg-gray-100 p-2 mt-1 rounded overflow-x-auto">
                      {error.stack}
                    </pre>
                  </details>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}