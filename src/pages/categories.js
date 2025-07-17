import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { toast } from 'react-toastify';

export default function CategoriesManager() {
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState('');
  const [loading, setLoading] = useState(true);

  const docRef = doc(db, 'categories', 'topics');

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setCategories(docSnap.data().list || []);
        } else {
          toast.error('Categories document not found.');
        }
      } catch (error) {
        console.error('Fetch error:', error);
        toast.error('Failed to fetch categories');
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const addCategory = async () => {
    const trimmed = newCategory.trim();
    if (!trimmed || categories.includes(trimmed)) {
      toast.info('Category is empty or already exists.');
      return;
    }

    const updatedList = [...categories, trimmed];

    try {
      await updateDoc(docRef, {
        list: updatedList,
        lastUpdated: new Date()
      });
      setCategories(updatedList);
      setNewCategory('');
      toast.success('Category added');
    } catch (error) {
      console.error('Add error:', error);
      toast.error('Failed to add category');
    }
  };

  const deleteCategory = async (index) => {
    const updatedList = [...categories];
    updatedList.splice(index, 1);

    try {
      await updateDoc(docRef, {
        list: updatedList,
        lastUpdated: new Date()
      });
      setCategories(updatedList);
      toast.success('Category deleted');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete category');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin h-12 w-12 border-t-2 border-b-2 border-blue-500 rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">Genres Manager</h1>

      {/* Add New Genre */}
<div className="flex mb-6">
  <input
    type="text"
    value={newCategory}
    onChange={(e) => setNewCategory(e.target.value)}
    placeholder="New category"
    className="flex-grow px-4 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
  />
  <button
    onClick={addCategory}
    className="bg-black text-white px-4 py-2 rounded-r-md hover:bg-gray-800 transition-colors ml-2"
  >
    Add
  </button>
</div>

      {/* Category List */}
      {categories.length === 0 ? (
        <p className="text-gray-500">No categories found.</p>
      ) : (
        <ul className="space-y-2">
          {categories.map((cat, idx) => (
            <li
              key={idx}
              className="flex justify-between items-center bg-gray-100 px-4 py-2 rounded"
            >
              <span>{cat}</span>
              <button
                onClick={() => deleteCategory(idx)}
                className="text-red-500 hover:text-red-700"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
