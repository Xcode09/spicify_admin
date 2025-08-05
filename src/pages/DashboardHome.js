import React, { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase'; // adjust path as needed
import { useNavigate } from 'react-router-dom';

const DashboardHome = () => {
  const [stats, setStats] = useState({
    audiobooks: 0,
    users: 0,
    subscribers: 0,
    notifications: 0,
    categories: 0,
  });
  
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribes = [];

    const watchCollectionCount = (collectionName, key) => {
      const unsubscribe = onSnapshot(collection(db, collectionName), (snapshot) => {
        setStats(prev => ({ ...prev, [key]: snapshot.size }));
      });
      unsubscribes.push(unsubscribe);
    };

    watchCollectionCount('audiobooks', 'audiobooks');
    watchCollectionCount('users', 'users');
    watchCollectionCount('subscriber_club', 'subscribers');
    watchCollectionCount('notifications', 'notifications');
    watchCollectionCount('categories', 'categories');

    return () => unsubscribes.forEach(unsub => unsub());
  }, []);

  // Define routes for each card
  const cardRoutes = {
    audiobooks: './audiobooks',
    users: './users',
    subscribers: './subscriber-club',
    notifications: './notifications',
    categories: './categories'
  };

  const handleCardClick = (key) => {
    navigate(cardRoutes[key]);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Dashboard Overview</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard 
          title="Total Audiobooks" 
          value={stats.audiobooks} 
          onClick={() => handleCardClick('audiobooks')} 
        />
        <StatCard 
          title="Active Users" 
          value={stats.users} 
          onClick={() => handleCardClick('users')} 
        />
        <StatCard 
          title="Subscriber Club Items" 
          value={stats.subscribers} 
          onClick={() => handleCardClick('subscribers')} 
        />
        <StatCard 
          title="Total Notifications" 
          value={stats.notifications} 
          onClick={() => handleCardClick('notifications')} 
        />
        <StatCard 
          title="Total Genres" 
          value={stats.categories} 
          onClick={() => handleCardClick('categories')} 
        />
      </div>
    </div>
  );
};

const StatCard = ({ title, value, onClick }) => (
  <div 
    className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
    onClick={onClick}
  >
    <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
    <p className="text-3xl font-bold mt-1">{value}</p>
  </div>
);

export default DashboardHome;