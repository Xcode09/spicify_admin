import React, { useState, useEffect } from 'react';
import { db, storage } from '../firebase';
import { collection, getDocs, deleteDoc, doc,query, orderBy } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiEdit2, FiTrash2, FiPlus, FiSearch } from 'react-icons/fi';

export default function Audiobooks() {
  const [audiobooks, setAudiobooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const navigate = useNavigate();

  // Fetch all audiobooks
  useEffect(() => {
    const fetchAudiobooks = async () => {
      try {
        setLoading(true);
        const q = query(
    collection(db, 'audiobooks'),
    orderBy('createdAt', 'desc') // latest first
  );
        const querySnapshot = await getDocs(collection(db, 'audiobooks'));
        const books = querySnapshot.docs.map(doc => ({
          id: doc.id,
          coverUrl: doc.data().bookCover,
          title: doc.data().title,
          author: doc.data().author,
          genres: doc.data().tags || [],
          rate: doc.data().rate,
          audioUrl: doc.data().audioUrl,
          isRecommended: doc.data().isRecommended || false
        }));
        setAudiobooks(books);
      } catch (error) {
        console.error('Fetch error:', error);
        toast.error(`Failed to load audiobooks: ${error.message}`, {
          position: 'top-right',
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAudiobooks();
  }, []);

  // Delete audiobook
  const handleDelete = async (id, coverUrl) => {
    if (!window.confirm('Are you sure you want to delete this audiobook?')) return;

    try {
      setDeletingId(id);
      
      // // Delete cover image from storage if exists
      // if (coverUrl) {
      //   try {
      //     const coverRef = ref(storage, coverUrl);
      //     await deleteObject(coverRef);
      //   } catch (storageError) {
      //     console.warn('Could not delete cover image:', storageError);
      //     // Continue with document deletion even if image deletion fails
      //   }
      // }

      // Delete document from Firestore
      await deleteDoc(doc(db, 'audiobooks', id));
      
      // Update local state
      setAudiobooks(prev => prev.filter(book => book.id !== id));
      
      toast.success('🎧 Audiobook deleted successfully!', {
        position: 'top-right',
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
      });
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(`❌ Failed to delete: ${error.message}`, {
        position: 'top-right',
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
      });
    } finally {
      setDeletingId(null);
    }
  };

  // Filter audiobooks based on search term
  const filteredAudiobooks = audiobooks.filter(book =>
    book.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Audiobooks Library</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {audiobooks.length} {audiobooks.length === 1 ? 'audiobook' : 'audiobooks'} available
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Link
            to="/dashboard/audiobooks/new"
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-5 py-2.5 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <FiPlus className="text-lg" />
            <span>Add New</span>
          </Link>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-8 max-w-md">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <FiSearch className="text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search audiobooks by title..."
          className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm transition-all"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Content */}
      {filteredAudiobooks.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-8 text-center border border-gray-200 dark:border-gray-700">
          <div className="text-gray-400 dark:text-gray-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <h3 className="text-xl font-medium text-gray-700 dark:text-gray-300 mb-2">
            {searchTerm ? 'No matching audiobooks found' : 'No audiobooks available'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {searchTerm ? 'Try a different search term' : 'Get started by adding a new audiobook'}
          </p>
          {!searchTerm && (
            <Link
              to="/dashboard/audiobooks/new"
              className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
            >
              <FiPlus className="mr-2" />
              Create First Audiobook
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredAudiobooks.map((book) => (
            <div 
              key={book.id} 
              className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow duration-300 group"
            >
              <div className="relative h-48 bg-gray-100 dark:bg-gray-700 overflow-hidden">
                {book.coverUrl ? (
                  <img
                    src={book.coverUrl}
                    alt={book.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                  </div>
                )}
              </div>
              
              <div className="p-5">
                <h3 className="font-bold text-lg text-gray-800 dark:text-white mb-1 line-clamp-1">{book.title}</h3>
                {book.author && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">by {book.author}</p>
                )}
                {book.genres?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {book.genres.slice(0, 3).map((genre, index) => (
                      <span 
                        key={index} 
                        className="px-2 py-0.5 text-xs font-medium bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-100 rounded-full"
                      >
                        {genre}
                      </span>
                    ))}
                    {book.genres.length > 3 && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full">
                        +{book.genres.length - 3}
                      </span>
                    )}
                  </div>
                )}
                
                <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <button
                    onClick={() => navigate(`/dashboard/audiobooks/edit/${book.id}`)}
                    className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium text-sm transition-colors"
                    disabled={deletingId === book.id}
                  >
                    <FiEdit2 className="text-base" />
                    Edit
                  </button>
                  
                  <button
                    onClick={() => handleDelete(book.id, book.coverUrl)}
                    className="flex items-center gap-1.5 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium text-sm transition-colors"
                    disabled={deletingId === book.id}
                  >
                    {deletingId === book.id ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-1.5 h-3.5 w-3.5 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Deleting...
                      </>
                    ) : (
                      <>
                        <FiTrash2 className="text-base" />
                        Delete
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}