// src/components/ContentManager.js
import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

const ContentManager = ({ pageType }) => {
  const [content, setContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const docRef = doc(db, 'siteContent', pageType);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setContent(docSnap.data().content);
        } else {
          // Initialize with default content if document doesn't exist
          const defaultContent = getDefaultContent(pageType);
          await setDoc(docRef, { content: defaultContent });
          setContent(defaultContent);
        }
      } catch (error) {
        console.error("Error fetching content: ", error);
        setMessage('Error loading content');
      } finally {
        setIsLoading(false);
      }
    };

    fetchContent();
  }, [pageType]);

  const getDefaultContent = (type) => {
    switch(type) {
      case 'privacyPolicy':
        return '<h1>Privacy Policy</h1><p>Edit your privacy policy here...</p>';
      case 'terms':
        return '<h1>Terms of Service</h1><p>Edit your terms of service here...</p>';
      case 'about':
        return '<h1>About Us</h1><p>Edit your about page content here...</p>';
      default:
        return '';
    }
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      await setDoc(doc(db, 'siteContent', pageType), { content });
      setMessage('Content saved successfully!');
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving content: ", error);
      setMessage('Error saving content');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 capitalize">
          {pageType.replace(/([A-Z])/g, ' $1').trim()}
        </h1>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors"
          >
            Edit
          </button>
        ) : (
          <div className="flex space-x-2">
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-md ${
          message.includes('Error') ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
        }`}>
          {message}
        </div>
      )}

      {isEditing ? (
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full h-96 p-4 border border-gray-300 rounded-md focus:ring-2 focus:ring-black focus:border-transparent"
        />
      ) : (
        <div 
          className="prose max-w-none p-6 bg-white rounded-lg shadow-sm border border-gray-200"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      )}
    </div>
  );
};

export default ContentManager;