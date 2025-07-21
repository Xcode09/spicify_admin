import React, { useEffect, useState } from 'react';
import { db } from '../../firebase';
import { collection, doc, deleteDoc, getDocs } from "firebase/firestore";
import { FiTrash2, FiClock, FiEdit } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

export default function NotificationsList() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const getCollection = async (collectionName) => {
    try {
      const snapshot = await getDocs(collection(db, collectionName));
      return snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date()
      }));
    } catch (err) {
      setError("Failed to fetch notifications");
      console.error(err);
      return [];
    }
  };

  const deleteDocById = async (collectionName, id) => {
    try {
      await deleteDoc(doc(db, collectionName, id));
    } catch (err) {
      setError("Failed to delete notification");
      console.error(err);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const data = await getCollection('notifications');
      setNotifications(data);
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this notification?")) {
      await deleteDocById('notifications', id);
      setNotifications(prev => prev.filter(item => item.id !== id));
    }
  };

  const handleEdit = (id) => {
    navigate(`/dashboard/notifications/edit/${id}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4" role="alert">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-gray-800">Notifications</h2>
        {/* <button 
          onClick={() => navigate('/dashboard/notifications/create')}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition duration-200"
        >
          Create New
        </button> */}
      </div>

      {notifications.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <p className="text-gray-500">No notifications found</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {notifications.map(({ id, title, body, createdAt }) => (
            <div 
              key={id} 
              className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition duration-200"
            >
              <div className="p-6">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">{title}</h3>
                  <div className="flex space-x-2">
                    {/* <button 
                      onClick={() => handleEdit(id)}
                      className="text-blue-500 hover:text-blue-700 p-1 rounded-full hover:bg-blue-50"
                      aria-label="Edit"
                    >
                      <FiEdit size={18} />
                    </button> */}
                    <button 
                      onClick={() => handleDelete(id)}
                      className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50"
                      aria-label="Delete"
                    >
                      <FiTrash2 size={18} />
                    </button>
                  </div>
                </div>
                <p className="text-gray-600 mb-4">{body}</p>
                <div className="flex items-center text-sm text-gray-500">
                  <FiClock className="mr-1" size={14} />
                  <span>{createdAt.toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}