import React, { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase'; // adjust path as needed

const DashboardHome = () => {
  const [stats, setStats] = useState({
    audiobooks: 0,
    users: 0,
    subscribers: 0,
    favourites: 0,
    categories: 0,
  });
  

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
    watchCollectionCount('favourites', 'favourites');
    watchCollectionCount('categories', 'categories');

    return () => unsubscribes.forEach(unsub => unsub());
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Dashboard Overview</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard title="Total Audiobooks" value={stats.audiobooks} />
        <StatCard title="Active Users" value={stats.users} />
        <StatCard title="Subscriber Club Items" value={stats.subscribers} />
        <StatCard title="Total Favourites" value={stats.favourites} />
        <StatCard title="Total Categories" value={stats.categories} />
      </div>
    </div>
  );
};

const StatCard = ({ title, value }) => (
  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
    <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
    <p className="text-3xl font-bold mt-1">{value}</p>
  </div>
);

export default DashboardHome;
