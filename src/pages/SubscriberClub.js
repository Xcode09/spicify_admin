// SubscriberClubManager.jsx
import React, { useEffect, useState } from 'react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  setDoc,
  deleteDoc,
  addDoc,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../firebase';
import { getAuth } from 'firebase/auth';

import BunnyUploader from "../services/BunnyUploader";
import { toast } from "react-toastify";

export default function SubscriberClubManager() {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
  welcomeMessage: '',
  quoteOfWeek: '',
  isHolidaySpecial: false,
  holidaySpecial: { 
    title: '', 
    imageUrl: '', 
    audioUrl: '',
    scheduledAt: '' 
  },
  sneakPeek: { 
    imageUrl: '', 
    audioUrl: '',
    scheduledAt: '' 
  },
});

const [bonusScenes, setBonusScenes] = useState([]);
const [polls, setPolls] = useState([]);
const [posts, setPosts] = useState([]);
const [newPost, setNewPost] = useState({
  description: '',
  imageUrl: '',
  imageFile: null,
  scheduledAt: ''
});
const [newPoll, setNewPoll] = useState({
  question: '',
  multiChoice: false,
  options: [{ key: 'A', label: '', votes: 0 }],
  scheduledAt: ''
});
  const [activePoll, setActivePoll] = useState(null);
  const [hasVoted, setHasVoted] = useState(false);

const [editingPost, setEditingPost] = useState(null);
const [books, setBooks] = useState([]);
const [selectedBookId, setSelectedBookId] = useState("");

  // Firestore references
  const clubDocRef = doc(db, 'subscriber_club', 'clubData');
  const scenesColRef = collection(clubDocRef, 'bonusScenes');
  const pollsColRef = collection(clubDocRef, 'poll');
  const postsColRef = collection(clubDocRef, 'posts');
  const activePollDocRef = doc(db, 'subscriber_club', 'clubData', 'poll', 'active');
  
  const auth = getAuth();

  // Load all data on component mount
  useEffect(() => {

    const unsub = onSnapshot(collection(db, "audiobooks"), (snapshot) => {
          const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
          setBooks(list);
        });
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [docSnap, scenesSnap, pollsSnap, postsSnap, activePollSnap] = await Promise.all([
        getDoc(clubDocRef),
        getDocs(scenesColRef),
        getDocs(pollsColRef),
        getDocs(postsColRef),
        getDoc(activePollDocRef).catch(() => null), // Handle case where active poll doesn't exist
      ]);

      if (docSnap.exists()) {
        setForm(docSnap.data());
      }

      setBonusScenes(scenesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setPolls(pollsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setPosts(postsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));

      // Handle active poll
      if (activePollSnap?.exists()) {
        setActivePoll(activePollSnap.data());
        
        // Check if current user has voted
        const user = auth.currentUser;
        if (user) {
          const voteDoc = await getDoc(doc(db, 'subscriber_club', 'clubData', 'pollVotes', user.uid));
          setHasVoted(voteDoc.exists());
        }
      } else {
        setActivePoll(null);
        setHasVoted(false);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Club data management
  const updateClubDoc = async () => {
  try {
    setLoading(true);
    toast.loading('Saving club configuration...');
    
    // Create a copy of the form data
    const formData = { ...form };
    
    // Upload sneak peek media
    if (form.sneakPeek.imageFile) {
      const imageUrl = await BunnyUploader.upload(form.sneakPeek.imageFile);
      formData.sneakPeek.imageUrl = imageUrl;
      formData.sneakPeek.imageFile = null;
    }
    if (form.sneakPeek.audioFile) {
      const audioUrl = await BunnyUploader.upload(form.sneakPeek.audioFile);
      formData.sneakPeek.audioUrl = audioUrl;
      formData.sneakPeek.audioFile = null;
    }

    // Upload holiday special media
    if (form.isHolidaySpecial && form.holidaySpecial.imageFile) {
      const imageUrl = await BunnyUploader.upload(form.holidaySpecial.imageFile);
      formData.holidaySpecial.imageUrl = imageUrl;
      formData.holidaySpecial.imageFile = null;
    }
    if (form.isHolidaySpecial && form.holidaySpecial.audioFile) {
      const audioUrl = await BunnyUploader.upload(form.holidaySpecial.audioFile);
      formData.holidaySpecial.audioUrl = audioUrl;
      formData.holidaySpecial.audioFile = null;
    }

    // Update local state
    setForm(formData);
    
    // Prepare data for Firestore (exclude file objects)
    const firestoreData = {
      ...formData,
      sneakPeek: {
        imageUrl: formData.sneakPeek.imageUrl,
        audioUrl: formData.sneakPeek.audioUrl
      }
    };

    
    if (formData.isHolidaySpecial) {
      firestoreData.holidaySpecial = {
        title: formData.holidaySpecial.title,
        imageUrl: formData.holidaySpecial.imageUrl,
        audioUrl: formData.holidaySpecial.audioUrl
      };
    }

    // Save to Firestore
    await setDoc(clubDocRef, firestoreData);
    toast.success('Club configuration updated successfully!');
    toast.dismiss();
    setLoading(false);
  } catch (error) {
    console.error("Error updating club data:", error);
    toast.error(`Error: ${error.message}`);
    setLoading(false);
  } finally {
    setLoading(false);
  }
};

  // Bonus scenes management
  const handleSceneAdd = async () => {
    const newScene = {
      title: 'New Scene',
      author: '',
      imageUrl: '',
      audioUrl: '',
      createdAt: new Date(),
    };
    try {
      await addDoc(scenesColRef, newScene);
      loadData();
    } catch (error) {
      console.error("Error adding scene:", error);
    }
  };

  const handleSceneUpdate = async (id, field, value) => {
  try {
    // Special handling for file uploads
    if (field === 'imageFile' || field === 'audioFile') {
      // Create preview URL immediately for better UX
      const previewUrl = URL.createObjectURL(value);
      
      // Optimistically update local state
      setBonusScenes(prevScenes => 
        prevScenes.map(scene => 
          scene.id === id 
            ? { ...scene, [field]: value, [field.replace('File', 'Url')]: previewUrl }
            : scene
        )
      );

      try {
        // Upload file to Bunny.net
        const fileUrl = await BunnyUploader.upload(value);
        
        // Update Firestore with permanent URL
        await updateDoc(doc(scenesColRef, id), {
          [field.replace('File', 'Url')]: fileUrl
        });

        // Update local state with permanent URL
        setBonusScenes(prevScenes => 
          prevScenes.map(scene => 
            scene.id === id 
              ? { ...scene, [field]: null, [field.replace('File', 'Url')]: fileUrl }
              : scene
          )
        );

        // Clean up the blob URL
        URL.revokeObjectURL(previewUrl);

      } catch (uploadError) {
        console.error("Upload failed:", uploadError);
        // Revert local state on failure
        setBonusScenes(prevScenes => 
          prevScenes.map(scene => 
            scene.id === id 
              ? { ...scene, [field]: null, [field.replace('File', 'Url')]: scene[field.replace('File', 'Url')] || '' }
              : scene
          )
        );
        throw uploadError;
      }
      return;
    }

    // Regular field updates (non-file fields)
    await updateDoc(doc(scenesColRef, id), { [field]: value });

    // Convert scheduledAt to Date object if needed
    const firestoreValue = field === 'scheduledAt' 
      ? value instanceof Date ? value : new Date(value)
      : value;

    // Regular field updates (non-file fields)
    await updateDoc(doc(scenesColRef, id), { [field]: firestoreValue });
    
    // Update local state for fields that need immediate UI updates
    if (['title', 'author', 'selectedBookId', 'scheduledAt'].includes(field)) {
      setBonusScenes(prevScenes => 
        prevScenes.map(scene => 
          scene.id === id ? { ...scene, [field]: value } : scene
        )
      );
    }

  } catch (error) {
    console.error(`Error updating ${field}:`, error);
    toast.error(`Failed to update ${field.replace('File', '')}: ${error.message}`);
    throw error; // Re-throw to allow calling code to handle
  }
};

  const handleSceneDelete = async (id) => {
    try {
      await deleteDoc(doc(scenesColRef, id));
      loadData();
    } catch (error) {
      console.error("Error deleting scene:", error);
    }
  };

  // Poll management
  const handlePollAdd = async () => {
    if (!newPoll.question || newPoll.options.some(opt => !opt.label)) {
      alert('Please fill in all poll fields');
      return;
    }

    try {
      await setDoc(activePollDocRef, {
        ...newPoll,
        createdAt: new Date(),
        totalVotes: 0,
      });
      setNewPoll({
        question: '',
        multiChoice: false,
        options: [{ key: 'A', label: '', votes: 0 }],
      });
      loadData();
    } catch (error) {
      console.error("Error creating poll:", error);
    }
  };

  const updatePollOption = (index, field, value) => {
    const options = [...newPoll.options];
    options[index] = { ...options[index], [field]: value };
    setNewPoll({ ...newPoll, options });
  };

  const addPollOption = () => {
    const nextKey = String.fromCharCode('A'.charCodeAt(0) + newPoll.options.length);
    setNewPoll({
      ...newPoll,
      options: [...newPoll.options, { key: nextKey, label: '', votes: 0 }],
    });
  };
  
const handlePostAdd = async () => {
  if (!newPost.description) {
    alert('Please enter a post description');
    return;
  }

  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    let imageUrl = newPost.imageUrl;
    
    // If there's an image file, upload it first
    if (newPost.imageFile) {
      setLoading(true);
      imageUrl = await BunnyUploader.upload(newPost.imageFile);
    }

    const postData = {
      description: newPost.description,
      imageUrl: imageUrl,
      authorName: user.displayName || 'Admin',
      authorAvatarUrl: user.photoURL || 'https://i.ibb.co/QDgYxYm/user.jpg',
      createdAt: new Date(),
      scheduledAt: newPost.scheduledAt ? new Date(newPost.scheduledAt) : null,
      likes: 0,
      likedBy: [],
      comments: 0,
    };

    await addDoc(postsColRef, postData);
    
    setNewPost({
      description: '',
      imageUrl: '',
      imageFile: null,
    });
    loadData();
  } catch (error) {
    console.error("Error adding post:", error);
    alert('Error adding post');
  }
};

const handlePostUpdate = async (postId, updatedData) => {
  try {
    await updateDoc(doc(postsColRef, postId), updatedData);
    loadData();
    setEditingPost(null);
  } catch (error) {
    console.error("Error updating post:", error);
  }
};

const handlePostDelete = async (postId) => {
  if (!window.confirm('Are you sure you want to delete this post?')) return;
  
  try {
    await deleteDoc(doc(postsColRef, postId));
    loadData();
  } catch (error) {
    console.error("Error deleting post:", error);
  }
};

const toggleLike = async (post) => {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const isLiked = post.likedBy.includes(user.uid);
    const newLikedBy = isLiked 
      ? post.likedBy.filter(id => id !== user.uid) 
      : [...post.likedBy, user.uid];

    await updateDoc(doc(postsColRef, post.id), {
      likes: isLiked ? post.likes - 1 : post.likes + 1,
      likedBy: newLikedBy,
    });

    loadData();
  } catch (error) {
    console.error("Error toggling like:", error);
  }
};

  const removePollOption = (index) => {
    if (newPoll.options.length <= 1) return;
    const options = [...newPoll.options];
    options.splice(index, 1);
    setNewPoll({ ...newPoll, options });
  };

  const endActivePoll = async () => {
    if (!activePoll) return;

    try {
      // Archive the active poll
      await addDoc(pollsColRef, {
        ...activePoll,
        endedAt: new Date(),
        status: 'archived',
        totalVotes: activePoll.options.reduce((sum, opt) => sum + opt.votes, 0),
      });

      // Delete the active poll
      await deleteDoc(activePollDocRef);

      // Clear active poll state
      setActivePoll(null);
      setHasVoted(false);

      loadData();
    } catch (error) {
      console.error("Error ending poll:", error);
    }
  };

  const vote = async (selectedKey) => {
    const user = auth.currentUser;
    if (!user || !activePoll || hasVoted) return;

    try {
      // Update the vote count
      const updatedOptions = activePoll.options.map(opt =>
        opt.key === selectedKey ? { ...opt, votes: opt.votes + 1 } : opt
      );

      await setDoc(activePollDocRef, {
        ...activePoll,
        options: updatedOptions,
        totalVotes: activePoll.totalVotes + 1,
      }, { merge: true });

      // Record the user's vote
      await setDoc(doc(db, 'subscriber_club', 'clubData', 'pollVotes', user.uid), {
        pollId: 'active', // Reference to the active poll
        votedOption: selectedKey,
        timestamp: new Date(),
      });

      setHasVoted(true);
      loadData();
    } catch (error) {
      console.error("Error voting:", error);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
       {/* Header Section */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Subscriber Club Manager</h1>
        <p className="text-gray-600 mt-2">Manage all subscriber-exclusive content and features</p>
      </header>

      {/* Club Data Section */}
 {/* Club Configuration Section */}
      <section className="bg-white rounded-xl shadow-md p-6">
        <div className="flex justify-between items-center border-b pb-4 mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">Club Configuration</h2>
          <button
            onClick={updateClubDoc}
            className="bg-black hover:bg-gray-800 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
          >
            Save Configuration
          </button>
        </div>

        {/* Welcome Message */}
        <div className="mb-6">
          <label className="block text-lg font-medium text-gray-700 mb-2">Welcome Message</label>
          <textarea
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Welcome your subscribers with a friendly message..."
            value={form.welcomeMessage}
            onChange={(e) => setForm({ ...form, welcomeMessage: e.target.value })}
            rows={3}
          />
        </div>

        {/* Quote of the Week */}
        <div className="mb-6">
          <label className="block text-lg font-medium text-gray-700 mb-2">Quote of the Week</label>
          <textarea
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Inspire your subscribers with a weekly quote..."
            value={form.quoteOfWeek}
            onChange={(e) => setForm({ ...form, quoteOfWeek: e.target.value })}
            rows={2}
          />
        </div>

        {/* Sneak Peek Section */}
        <div className="border-t pt-6 mb-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Sneak Peek Content</h3>
          <p className="text-gray-600 mb-4">Preview of upcoming exclusive content for subscribers</p>
          
          {/* Image Upload */}
          <div className="mb-6">
            <label className="block text-lg font-medium text-gray-700 mb-2">Preview Image</label>
            <div className="flex gap-3 items-center">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const url = URL.createObjectURL(file);
                    setForm({
                      ...form,
                      sneakPeek: { 
                        ...form.sneakPeek, 
                        imageFile: file, 
                        imageUrl: url 
                      }
                    });
                  }
                }}
                className="hidden"
                id="sneakPeekImageUpload"
              />
              <label
                htmlFor="sneakPeekImageUpload"
                className="bg-gray-100 hover:bg-gray-200 px-4 py-2.5 rounded-lg cursor-pointer border border-gray-300 transition-colors font-medium"
              >
                {form.sneakPeek.imageFile ? 'Change Image' : 'Upload Image'}
              </label>
              <input
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Or paste image URL"
                value={form.sneakPeek.imageUrl}
                onChange={(e) =>
                  setForm({
                    ...form,
                    sneakPeek: { 
                      ...form.sneakPeek, 
                      imageUrl: e.target.value, 
                      imageFile: null 
                    },
                  })
                }
              />
              {form.sneakPeek.imageFile && (
                <button
                  onClick={() => setForm({
                    ...form,
                    sneakPeek: { 
                      ...form.sneakPeek, 
                      imageUrl: '', 
                      imageFile: null 
                    }
                  })}
                  className="text-red-500 hover:text-red-700 px-3 py-2"
                >
                  Clear
                </button>
              )}
            </div>
            {form.sneakPeek.imageUrl && (
              <div className="mt-3">
                <img 
                  src={form.sneakPeek.imageUrl} 
                  alt="Preview" 
                  className="max-h-60 rounded-lg border shadow-sm"
                />
              </div>
            )}
            {form.sneakPeek.imageFile && (
              <p className="text-sm text-gray-500 mt-2">
                Image selected (will be uploaded when you save)
              </p>
            )}
          </div>

          {/* Audio Upload */}
          <div className="mb-6">
            <label className="block text-lg font-medium text-gray-700 mb-2">Preview Audio</label>
            <div className="flex gap-3 items-center">
              <input
                type="file"
                accept="audio/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const url = URL.createObjectURL(file);
                    setForm({
                      ...form,
                      sneakPeek: { 
                        ...form.sneakPeek, 
                        audioFile: file, 
                        audioUrl: url 
                      }
                    });
                  }
                }}
                className="hidden"
                id="sneakPeekAudioUpload"
              />
              <label
                htmlFor="sneakPeekAudioUpload"
                className="bg-gray-100 hover:bg-gray-200 px-4 py-2.5 rounded-lg cursor-pointer border border-gray-300 transition-colors font-medium"
              >
                {form.sneakPeek.audioFile ? 'Change Audio' : 'Upload Audio'}
              </label>
              <input
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Or paste audio URL"
                value={form.sneakPeek.audioUrl}
                onChange={(e) =>
                  setForm({
                    ...form,
                    sneakPeek: { 
                      ...form.sneakPeek, 
                      audioUrl: e.target.value, 
                      audioFile: null 
                    },
                  })
                }
              />
              {form.sneakPeek.audioFile && (
                <button
                  onClick={() => setForm({
                    ...form,
                    sneakPeek: { 
                      ...form.sneakPeek, 
                      audioUrl: '', 
                      audioFile: null 
                    }
                  })}
                  className="text-red-500 hover:text-red-700 px-3 py-2"
                >
                  Clear
                </button>
              )}
            </div>
            {form.sneakPeek.audioUrl && (
              <div className="mt-3">
                <audio controls src={form.sneakPeek.audioUrl} className="w-full rounded-lg" />
              </div>
            )}
            {form.sneakPeek.audioFile && (
              <p className="text-sm text-gray-500 mt-2">
                Audio selected (will be uploaded when you save)
              </p>
            )}


  {/* Add this date picker at the end of the sneak peek section */}
  <div className="mt-4">
    <label className="block text-sm font-medium text-gray-700 mb-1">
      Scheduled Date & Time (optional)
    </label>
    <input
      type="datetime-local"
      className="w-full border p-2 rounded"
      value={form.sneakPeek.scheduledAt}
      onChange={(e) => setForm({
        ...form,
        sneakPeek: {
          ...form.sneakPeek,
          scheduledAt: e.target.value
        }
      })}
      min={new Date().toISOString().slice(0, 16)}
    />
  </div>
          </div>
        </div>

        {/* Holiday Special Section */}
        <div className="border-t pt-6">
          <div className="flex items-center gap-3 mb-4">
            <input
              type="checkbox"
              id="holidayToggle"
              checked={form.isHolidaySpecial}
              onChange={(e) => setForm({ ...form, isHolidaySpecial: e.target.checked })}
              className="h-5 w-5 rounded text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="holidayToggle" className="text-lg font-semibold text-gray-800 cursor-pointer">
              Enable Holiday Special
            </label>
          </div>
          
          {form.isHolidaySpecial && (
            <div className="bg-yellow-50 p-5 rounded-lg border border-yellow-200 space-y-4">
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-2">Holiday Title</label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Special holiday title..."
                  value={form.holidaySpecial.title}
                  onChange={(e) => setForm({
                    ...form,
                    holidaySpecial: { ...form.holidaySpecial, title: e.target.value }
                  })}
                />
              </div>

              {/* Holiday Image */}
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-2">Holiday Image</label>
                <div className="flex gap-3 items-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const previewUrl = URL.createObjectURL(file);
                        setForm({
                          ...form,
                          holidaySpecial: {
                            ...form.holidaySpecial,
                            imageFile: file,
                            imageUrl: previewUrl
                          }
                        });
                      }
                    }}
                    className="hidden"
                    id="holidayImageUpload"
                  />
                  <label
                    htmlFor="holidayImageUpload"
                    className="bg-yellow-100 hover:bg-yellow-200 px-4 py-2.5 rounded-lg cursor-pointer border border-yellow-300 transition-colors font-medium"
                  >
                    {form.holidaySpecial.imageFile ? 'Change Image' : 'Upload Image'}
                  </label>
                  <input
                    className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Or paste image URL"
                    value={form.holidaySpecial.imageUrl}
                    onChange={(e) => setForm({
                      ...form,
                      holidaySpecial: {
                        ...form.holidaySpecial,
                        imageUrl: e.target.value,
                        imageFile: null
                      }
                    })}
                  />
                  {form.holidaySpecial.imageFile && (
                    <button
                      onClick={() => setForm({
                        ...form,
                        holidaySpecial: {
                          ...form.holidaySpecial,
                          imageUrl: '',
                          imageFile: null
                        }
                      })}
                      className="text-red-500 hover:text-red-700 px-3 py-2"
                    >
                      Clear
                    </button>
                  )}
                </div>
                {form.holidaySpecial.imageUrl && (
                  <div className="mt-3">
                    <img 
                      src={form.holidaySpecial.imageUrl} 
                      alt="Holiday Preview" 
                      className="max-h-60 rounded-lg border shadow-sm"
                    />
                  </div>
                )}
              </div>

              {/* Holiday Audio */}
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-2">Holiday Audio</label>
                <div className="flex gap-3 items-center">
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const previewUrl = URL.createObjectURL(file);
                        setForm({
                          ...form,
                          holidaySpecial: {
                            ...form.holidaySpecial,
                            audioFile: file,
                            audioUrl: previewUrl
                          }
                        });
                      }
                    }}
                    className="hidden"
                    id="holidayAudioUpload"
                  />
                  <label
                    htmlFor="holidayAudioUpload"
                    className="bg-yellow-100 hover:bg-yellow-200 px-4 py-2.5 rounded-lg cursor-pointer border border-yellow-300 transition-colors font-medium"
                  >
                    {form.holidaySpecial.audioFile ? 'Change Audio' : 'Upload Audio'}
                  </label>
                  <input
                    className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Or paste audio URL"
                    value={form.holidaySpecial.audioUrl}
                    onChange={(e) => setForm({
                      ...form,
                      holidaySpecial: {
                        ...form.holidaySpecial,
                        audioUrl: e.target.value,
                        audioFile: null
                      }
                    })}
                  />
                  {form.holidaySpecial.audioFile && (
                    <button
                      onClick={() => setForm({
                        ...form,
                        holidaySpecial: {
                          ...form.holidaySpecial,
                          audioUrl: '',
                          audioFile: null
                        }
                      })}
                      className="text-red-500 hover:text-red-700 px-3 py-2"
                    >
                      Clear
                    </button>
                  )}
                </div>
                {form.holidaySpecial.audioUrl && (
                  <div className="mt-3">
                    <audio controls src={form.holidaySpecial.audioUrl} className="w-full rounded-lg" />
                  </div>
                )}
              </div>
            </div>
          )}
          {/* Add this date picker at the end */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Scheduled Date & Time (optional)
      </label>
      <input
        type="datetime-local"
        className="w-full border p-2 rounded"
        value={form.holidaySpecial.scheduledAt}
        onChange={(e) => setForm({
          ...form,
          holidaySpecial: {
            ...form.holidaySpecial,
            scheduledAt: e.target.value
          }
        })}
        min={new Date().toISOString().slice(0, 16)}
      />
    </div>
        </div>
      </section>

      {/* Bonus Scenes Section */}
{/* Bonus Scenes Section */}
      <section className="bg-white rounded-xl shadow-md p-6">
        <div className="flex justify-between items-center border-b pb-4 mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">Bonus Scenes</h2>
          <button
            onClick={handleSceneAdd}
            className="bg-black hover:bg-gray-800 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
          >
            Add New Scene
          </button>
        </div>
        
        {bonusScenes.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No bonus scenes added yet</p>
          </div>
        ) : (
          <div className="space-y-6">
            {bonusScenes.map((scene) => (
              <div key={scene.id} className="bg-gray-50 p-5 rounded-lg border border-gray-200">

              <div className="mb-4">
        <label>Select Audiobook:</label>
        <select
          className="w-full p-2 rounded border"
          value={selectedBookId}
          onChange={(e) => {
            setSelectedBookId(e.target.value);
            handleSceneUpdate(scene.id, 'selectedBookId', e.target.value);
          }}
        >
          <option value="">-- Choose --</option>
          {books.map((b) => (
            <option key={b.id} value={b.id}>
              {b.title}
            </option>
          ))}
        </select>
      </div>
                <input
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 mb-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-medium"
                  placeholder="Scene Title"
                  value={scene.title}
                  onChange={(e) => handleSceneUpdate(scene.id, 'title', e.target.value)}
                />
                
                {/* Scene Image */}
                <div className="mb-6">
                  <label className="block text-lg font-medium text-gray-700 mb-2">Scene Image</label>
                  <div className="flex gap-3 items-center">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            const previewUrl = URL.createObjectURL(file);
                            setBonusScenes(bonusScenes.map(s => 
                              s.id === scene.id ? { 
                                ...s, 
                                imageFile: file,
                                imageUrl: previewUrl 
                              } : s
                            ));
                            const imageUrl = await BunnyUploader.upload(file);
                            await handleSceneUpdate(scene.id, 'imageUrl', imageUrl);
                            URL.revokeObjectURL(previewUrl);
                          } catch (error) {
                            toast.error(`Image upload failed: ${error.message}`);
                            loadData();
                          }
                        }
                      }}
                      className="hidden"
                      id={`sceneImageUpload-${scene.id}`}
                    />
                    <label
                      htmlFor={`sceneImageUpload-${scene.id}`}
                      className="bg-gray-200 hover:bg-gray-300 px-4 py-2.5 rounded-lg cursor-pointer border border-gray-300 transition-colors font-medium"
                    >
                      {scene.imageFile ? 'Change Image' : 'Upload Image'}
                    </label>
                    <input
                      className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Or paste image URL"
                      value={scene.imageUrl}
                      onChange={(e) => {
                        handleSceneUpdate(scene.id, 'imageUrl', e.target.value);
                        setBonusScenes(bonusScenes.map(s => 
                          s.id === scene.id ? { ...s, imageFile: null } : s
                        ));
                      }}
                    />
                    {scene.imageFile && (
                      <button
                        onClick={() => {
                          setBonusScenes(bonusScenes.map(s => 
                            s.id === scene.id ? { 
                              ...s, 
                              imageFile: null,
                              imageUrl: '' 
                            } : s
                          ));
                          handleSceneUpdate(scene.id, 'imageUrl', '');
                        }}
                        className="text-red-500 hover:text-red-700 px-3 py-2"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  {scene.imageUrl && (
                    <div className="mt-3">
                      <img 
                        src={scene.imageUrl} 
                        alt="Scene Preview" 
                        className="max-h-60 rounded-lg border shadow-sm"
                      />
                    </div>
                  )}
                </div>

                {/* Scene Audio */}
                <div className="mb-6">
                  <label className="block text-lg font-medium text-gray-700 mb-2">Scene Audio</label>
                  <div className="flex gap-3 items-center">
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            const previewUrl = URL.createObjectURL(file);
                            setBonusScenes(bonusScenes.map(s => 
                              s.id === scene.id ? { 
                                ...s, 
                                audioFile: file,
                                audioUrl: previewUrl 
                              } : s
                            ));
                            const audioUrl = await BunnyUploader.upload(file);
                            await handleSceneUpdate(scene.id, 'audioUrl', audioUrl);
                            URL.revokeObjectURL(previewUrl);
                          } catch (error) {
                            toast.error(`Audio upload failed: ${error.message}`);
                            loadData();
                          }
                        }
                      }}
                      className="hidden"
                      id={`sceneAudioUpload-${scene.id}`}
                    />
                    <label
                      htmlFor={`sceneAudioUpload-${scene.id}`}
                      className="bg-gray-200 hover:bg-gray-300 px-4 py-2.5 rounded-lg cursor-pointer border border-gray-300 transition-colors font-medium"
                    >
                      {scene.audioFile ? 'Change Audio' : 'Upload Audio'}
                    </label>
                    <input
                      className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Or paste audio URL"
                      value={scene.audioUrl}
                      onChange={(e) => {
                        handleSceneUpdate(scene.id, 'audioUrl', e.target.value);
                        setBonusScenes(bonusScenes.map(s => 
                          s.id === scene.id ? { ...s, audioFile: null } : s
                        ));
                      }}
                    />
                    {scene.audioFile && (
                      <button
                        onClick={() => {
                          setBonusScenes(bonusScenes.map(s => 
                            s.id === scene.id ? { 
                              ...s, 
                              audioFile: null,
                              audioUrl: '' 
                            } : s
                          ));
                          handleSceneUpdate(scene.id, 'audioUrl', '');
                        }}
                        className="text-red-500 hover:text-red-700 px-3 py-2"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  {scene.audioUrl && (
                    <div className="mt-3">
                      <audio controls src={scene.audioUrl} className="w-full rounded-lg" />
                    </div>
                  )}
                </div>

            {/* Add this date picker before the delete button */}
    <div className="mt-4 mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Scheduled Date & Time (optional)
      </label>
      <input
        type="datetime-local"
        className="w-full border p-2 rounded"
        value={scene.scheduledAt || ''}
        onChange={(e) => handleSceneUpdate(scene.id, 'scheduledAt', e.target.value)}
        min={new Date().toISOString().slice(0, 16)}
      />
    </div>

                <button
                  onClick={() => handleSceneDelete(scene.id)}
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg font-medium transition-colors"
                >
                  Delete Scene
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Poll Management Section */}
       {/* Poll Management Section */}
      <section className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-2xl font-semibold text-gray-800 border-b pb-4 mb-6">Poll Management</h2>
        
        {/* Create New Poll */}
        <div className="border border-gray-200 p-6 rounded-xl mb-8">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Create New Poll</h3>
          <input
            className="w-full border border-gray-300 rounded-lg px-4 py-3 mb-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter your poll question..."
            value={newPoll.question}
            onChange={(e) => setNewPoll({ ...newPoll, question: e.target.value })}
          />
          
          <div className="flex items-center gap-3 mb-4">
            <input
              type="checkbox"
              checked={newPoll.multiChoice}
              onChange={(e) => setNewPoll({ ...newPoll, multiChoice: e.target.checked })}
              className="h-5 w-5 rounded text-blue-600 focus:ring-blue-500"
            />
            <label className="text-lg font-medium text-gray-700">Allow multiple choice</label>
          </div>
          
          
          <div className="space-y-3 mb-6">
            {newPoll.options.map((opt, i) => (
              <div key={i} className="flex gap-3 items-center">
                <span className="font-bold text-lg w-6">{opt.key}:</span>
                <input
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={`Option ${opt.key}`}
                  value={opt.label}
                  onChange={(e) => updatePollOption(i, 'label', e.target.value)}
                />
                <button
                  className="text-red-500 hover:text-red-700 w-9 h-9 flex items-center justify-center rounded-full hover:bg-red-50 transition-colors"
                  onClick={() => removePollOption(i)}
                  disabled={newPoll.options.length <= 1}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
                <div className="mt-4 mb-6">
    <label className="block text-sm font-medium text-gray-700 mb-1">
      Scheduled Date & Time (optional)
    </label>
    <input
      type="datetime-local"
      className="w-full border p-2 rounded"
      value={newPoll.scheduledAt}
      onChange={(e) => setNewPoll({
        ...newPoll,
        scheduledAt: e.target.value
      })}
      min={new Date().toISOString().slice(0, 16)}
    />
  </div>
          
          <div className="flex gap-4">
            <button
              className="bg-gray-200 hover:bg-gray-300 px-5 py-2.5 rounded-lg transition-colors font-medium"
              onClick={addPollOption}
            >
              + Add Option
            </button>
            
            {/* Add this date picker before the create button */}
  

            <button
              className="bg-black hover:bg-gray-800 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
              onClick={handlePollAdd}
              disabled={!newPoll.question || newPoll.options.some(opt => !opt.label)}
            >
              Create Poll
            </button>
          </div>
    
        </div>
        

        {/* Active Poll Display */}
        {activePoll && (
          <div className="border border-yellow-200 bg-yellow-50 p-6 rounded-xl mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-800">Active Poll</h3>
              <button
                onClick={endActivePoll}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                End Poll
              </button>
            </div>
            
            <p className="text-lg font-medium text-gray-800 mb-4">{activePoll.question}</p>
            
            <ul className="space-y-3 mb-4">
              {activePoll.options.map((opt, i) => (
                <li key={i} className="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-200">
                  <span className="flex items-center gap-2">
                    <span className="font-bold">{opt.key}:</span> 
                    <span>{opt.label}</span>
                    <span className="text-gray-500 text-sm">({opt.votes} votes)</span>
                  </span>
                  {!hasVoted && (
                    <button
                      onClick={() => vote(opt.key)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
                    >
                      Vote
                    </button>
                  )}
                </li>
              ))}
            </ul>
            
            {hasVoted && (
              <p className="text-green-600 font-medium mb-2">✓ You have already voted in this poll</p>
            )}
            
            <div className="text-gray-600">
              Total votes: <span className="font-medium">{activePoll.options.reduce((sum, opt) => sum + opt.votes, 0)}</span>
            </div>
          </div>
        )}

        {/* Archived Polls */}
        {polls.length > 0 && (
          <div className="border border-gray-200 p-6 rounded-xl">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Poll History</h3>
            <div className="space-y-4">
              {polls.map((poll, index) => (
                <details key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                  <summary className="bg-gray-50 p-4 cursor-pointer list-none">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-800">
                        {poll.question} ({new Date(poll.createdAt?.seconds * 1000).toLocaleDateString()})
                      </span>
                      <svg className="w-5 h-5 text-gray-500 transform transition-transform duration-200" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </summary>
                  <div className="p-4 bg-white">
                    <ul className="space-y-2">
                      {poll.options?.map((opt, i) => (
                        <li key={i} className="flex justify-between">
                          <span>
                            <span className="font-medium">{opt.key}:</span> {opt.label}
                          </span>
                          <span className="text-gray-600">{opt.votes} votes</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 text-sm text-gray-600">
                      Total votes: {poll.options?.reduce((sum, opt) => sum + opt.votes, 0)}
                    </div>
                  </div>
                </details>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Posts Section */}
      <div className="bg-white p-4 rounded shadow space-y-4">
        <h2 className="text-xl font-semibold">Social Posts</h2>

        {/* Create New Post */}
  <div className="border p-4 rounded-lg bg-gray-50">
    <h3 className="font-bold mb-2">Create New Post</h3>
    
    <textarea
      className="w-full border px-4 py-2 rounded mb-2 min-h-[100px]"
      placeholder="What's on your mind?"
      value={newPost.description}
      onChange={(e) => setNewPost({...newPost, description: e.target.value})}
    />
    
    <div className="flex gap-2 items-center mb-4">
  <input
    type="file"
    accept="image/*"
    onChange={async (e) => {
      const file = e.target.files?.[0];
      if (file) {
        // Show preview while keeping the original file for upload
        const previewUrl = URL.createObjectURL(file);
        setNewPost({
          ...newPost,
          imageFile: file,
          imageUrl: previewUrl,
        });
      }
    }}
    className="hidden"
    id="postImageUpload"
  />
  <label
    htmlFor="postImageUpload"
    className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded cursor-pointer"
  >
    Upload Image
  </label>
  <input
    className="flex-1 border px-4 py-2 rounded"
    placeholder="Or enter image URL"
    value={newPost.imageUrl}
    onChange={(e) => setNewPost({
      ...newPost,
      imageUrl: e.target.value,
      imageFile: null, // Clear file if URL is entered manually
    })}
  />
</div>
    
    {newPost.imageUrl && (
      <div className="mb-4">
        <img 
          src={newPost.imageUrl} 
          alt="Post preview" 
          className="max-h-40 rounded border"
        />
      </div>
    )}
    {/* Add this date picker before the post button */}
  <div className="mt-4 mb-4">
    <label className="block text-sm font-medium text-gray-700 mb-1">
      Scheduled Date & Time (optional)
    </label>
    <input
      type="datetime-local"
      className="w-full border p-2 rounded"
      value={newPost.scheduledAt}
      onChange={(e) => setNewPost({
        ...newPost,
        scheduledAt: e.target.value
      })}
      min={new Date().toISOString().slice(0, 16)}
    />
  </div>

    <button
      onClick={handlePostAdd}
      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      disabled={!newPost.description}
    >
      Post
    </button>
  </div>
  
  {/* Posts List */}
  <div className="space-y-4">
    {posts.map((post) => (
      <div key={post.id} className="border rounded-lg p-4">
        {/* Post Header */}
        <div className="flex items-center gap-3 mb-3">
          <img 
            src={post.authorAvatarUrl} 
            alt="Author" 
            className="w-10 h-10 rounded-full"
          />
          <div>
            <p className="font-semibold">{post.authorName}</p>
            <p className="text-xs text-gray-500">
              {new Date(post.createdAt?.seconds * 1000).toLocaleString()}
            </p>
          </div>
        </div>
        
        {/* Post Content */}
        <p className="mb-3">{post.description}</p>
        
        {post.imageUrl && (
          <div className="mb-3">
            <img 
              src={post.imageUrl} 
              alt="Post" 
              className="max-w-full rounded-lg border"
            />
          </div>
        )}
        
        {/* Post Actions */}
        <div className="flex justify-between items-center border-t pt-3">
          <button 
            onClick={() => toggleLike(post)}
            className={`flex items-center gap-1 ${post.likedBy?.includes(auth.currentUser?.uid) ? 'text-red-500' : 'text-gray-500'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
            </svg>
            <span>{post.likes || 0}</span>
          </button>
          
          <div className="flex gap-2">
            <button 
              onClick={() => setEditingPost(editingPost === post.id ? null : post.id)}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
            </button>
            <button 
              onClick={() => handlePostDelete(post.id)}
              className="text-gray-500 hover:text-red-500"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Edit Post Form (conditionally shown) */}
        {editingPost === post.id && (
          <div className="mt-4 border-t pt-4">
            <textarea
              className="w-full border px-4 py-2 rounded mb-2 min-h-[100px]"
              value={post.description}
              onChange={(e) => handlePostUpdate(post.id, { description: e.target.value })}
            />
            <input
              className="w-full border px-4 py-2 rounded mb-2"
              placeholder="Image URL"
              value={post.imageUrl}
              onChange={(e) => handlePostUpdate(post.id, { imageUrl: e.target.value })}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEditingPost(null)}
                className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded"
              >
                Cancel
              </button>
              <button
                onClick={() => setEditingPost(null)}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        )}
      </div>
    ))}
    
    {posts.length === 0 && (
      <p className="text-center text-gray-500 py-4">No posts yet. Create the first one!</p>
    )}
  </div>
</div>
      </div>
    );
  }