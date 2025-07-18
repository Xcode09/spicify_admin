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
    holidaySpecial: { title: '', imageUrl: '', audioUrl: '' },
    sneakPeek: { imageUrl: '', audioUrl: '' },
  });
  const [bonusScenes, setBonusScenes] = useState([]);
  const [polls, setPolls] = useState([]);
  const [posts, setPosts] = useState([]);
  const [newPoll, setNewPoll] = useState({
    question: '',
    multiChoice: false,
    options: [{ key: 'A', label: '', votes: 0 }],
  });
  const [activePoll, setActivePoll] = useState(null);
  const [hasVoted, setHasVoted] = useState(false);
  // Add these to your existing state declarations
const [newPost, setNewPost] = useState({
  description: '',
  imageUrl: '',
  imageFile: null,
});
const [editingPost, setEditingPost] = useState(null);

  // Firestore references
  const clubDocRef = doc(db, 'subscriber_club', 'clubData');
  const scenesColRef = collection(clubDocRef, 'bonusScenes');
  const pollsColRef = collection(clubDocRef, 'poll');
  const postsColRef = collection(clubDocRef, 'posts');
  const activePollDocRef = doc(db, 'subscriber_club', 'clubData', 'poll', 'active');
  
  const auth = getAuth();

  // Load all data on component mount
  useEffect(() => {
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
    const toastId = toast.loading('Saving club configuration...');
    
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
    
    // Only update local state if needed (optimization)
    if (['title', 'author'].includes(field)) {
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
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold">Subscriber Club Manager</h1>

      {/* Club Data Section */}
<div className="bg-white p-4 rounded shadow space-y-4">
  <h2 className="text-xl font-semibold">Club Configuration</h2>
  
  {/* Welcome Message */}
  <div className="space-y-2">
    <label className="block font-medium">Welcome Message</label>
    <input
      className="w-full border px-4 py-2 rounded"
      placeholder="Welcome your subscribers..."
      value={form.welcomeMessage}
      onChange={(e) => setForm({ ...form, welcomeMessage: e.target.value })}
    />
  </div>

  {/* Quote of the Week */}
  <div className="space-y-2">
    <label className="block font-medium">Quote of the Week</label>
    <input
      className="w-full border px-4 py-2 rounded"
      placeholder="Inspirational quote for subscribers..."
      value={form.quoteOfWeek}
      onChange={(e) => setForm({ ...form, quoteOfWeek: e.target.value })}
    />
  </div>

  {/* Sneak Peek Section */}
{/* Sneak Peek Section */}
<div className="border-t pt-4 mt-4">
  <h3 className="font-bold mb-2">Sneak Peek Content</h3>
  <p className="text-sm text-gray-600 mb-2">Preview of upcoming content for subscribers</p>
  
  <div className="space-y-4">
    {/* Image Section */}
    <div>
      <label className="block font-medium mb-1">Image</label>
      <div className="flex gap-2">
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
          className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded cursor-pointer border border-gray-300 transition-colors"
        >
          {form.sneakPeek.imageFile ? 'Change Image' : 'Choose Image'}
        </label>
        <input
          className="flex-1 border px-4 py-2 rounded"
          placeholder="Or enter image URL"
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
            className="text-red-500 hover:text-red-700"
          >
            Clear
          </button>
        )}
      </div>
      {form.sneakPeek.imageUrl && (
        <div className="mt-2">
          <img 
            src={form.sneakPeek.imageUrl} 
            alt="Preview" 
            className="max-h-40 rounded border"
          />
        </div>
      )}
      {form.sneakPeek.imageFile && (
        <p className="text-sm text-gray-500 mt-1">
          New image selected (will be uploaded when you save)
        </p>
      )}
    </div>

    {/* Audio Section */}
    <div>
      <label className="block font-medium mb-1">Audio</label>
      <div className="flex gap-2">
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
          className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded cursor-pointer border border-gray-300 transition-colors"
        >
          {form.sneakPeek.audioFile ? 'Change Audio' : 'Choose Audio'}
        </label>
        <input
          className="flex-1 border px-4 py-2 rounded"
          placeholder="Or enter audio URL"
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
            className="text-red-500 hover:text-red-700"
          >
            Clear
          </button>
        )}
      </div>
      {form.sneakPeek.audioUrl && (
        <div className="mt-2">
          <audio controls src={form.sneakPeek.audioUrl} className="w-full" />
        </div>
      )}
      {form.sneakPeek.audioFile && (
        <p className="text-sm text-gray-500 mt-1">
          New audio selected (will be uploaded when you save)
        </p>
      )}
    </div>
  </div>
</div>

{/* Holiday Special Section */}
<div className="border-t pt-4 mt-4">
  <div className="flex items-center gap-2 mb-2">
    <input
      type="checkbox"
      id="holidayToggle"
      checked={form.isHolidaySpecial}
      onChange={(e) => setForm({ ...form, isHolidaySpecial: e.target.checked })}
      className="h-4 w-4"
    />
    <label htmlFor="holidayToggle" className="font-bold cursor-pointer">
      Holiday Special
    </label>
  </div>
  
  {form.isHolidaySpecial && (
    <div className="space-y-4 bg-yellow-50 p-4 rounded-lg border border-yellow-100">
      {/* Title Section (unchanged) */}
      <div>
        <label className="block font-medium mb-1">Title</label>
        <input
          className="w-full border px-4 py-2 rounded"
          value={form.holidaySpecial.title}
          onChange={(e) => setForm({
            ...form,
            holidaySpecial: { ...form.holidaySpecial, title: e.target.value }
          })}
        />
      </div>

      {/* Updated Image Section */}
      <div>
        <label className="block font-medium mb-1">Holiday Image</label>
        <div className="flex gap-2 items-center">
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
            className="bg-yellow-100 hover:bg-yellow-200 px-4 py-2 rounded cursor-pointer border border-yellow-300 transition-colors"
          >
            {form.holidaySpecial.imageFile ? 'Change Image' : 'Choose Image'}
          </label>
          <input
            className="flex-1 border px-4 py-2 rounded"
            placeholder="Or enter image URL"
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
              className="text-red-500 hover:text-red-700"
            >
              Clear
            </button>
          )}
        </div>
        {form.holidaySpecial.imageUrl && (
          <div className="mt-2">
            <img 
              src={form.holidaySpecial.imageUrl} 
              alt="Holiday Preview" 
              className="max-h-40 rounded border"
              onLoad={() => {
                if (form.holidaySpecial.imageUrl?.startsWith('blob:')) {
                  URL.revokeObjectURL(form.holidaySpecial.imageUrl);
                }
              }}
            />
            {form.holidaySpecial.imageFile && (
              <p className="text-sm text-gray-500 mt-1">
                Preview (will be uploaded when saved)
              </p>
            )}
          </div>
        )}
      </div>

      {/* Updated Audio Section */}
      <div>
        <label className="block font-medium mb-1">Holiday Audio</label>
        <div className="flex gap-2 items-center">
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
            className="bg-yellow-100 hover:bg-yellow-200 px-4 py-2 rounded cursor-pointer border border-yellow-300 transition-colors"
          >
            {form.holidaySpecial.audioFile ? 'Change Audio' : 'Choose Audio'}
          </label>
          <input
            className="flex-1 border px-4 py-2 rounded"
            placeholder="Or enter audio URL"
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
              className="text-red-500 hover:text-red-700"
            >
              Clear
            </button>
          )}
        </div>
        {form.holidaySpecial.audioUrl && (
          <div className="mt-2">
            <audio controls src={form.holidaySpecial.audioUrl} className="w-full" />
            {form.holidaySpecial.audioFile && (
              <p className="text-sm text-gray-500 mt-1">
                Preview (will be uploaded when saved)
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )}
</div>


  <button
    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mt-4"
    onClick={updateClubDoc}
  >
    Save Club Configuration
  </button>
</div>

      {/* Bonus Scenes Section */}
<div className="bg-white p-4 rounded shadow">
  <h2 className="text-xl font-semibold">Bonus Scenes</h2>
  <button
    onClick={handleSceneAdd}
    className="bg-green-600 text-white px-4 py-2 rounded my-2 hover:bg-green-700"
  >
    Add New Scene
  </button>
  
  {bonusScenes.map((scene) => (
    <div key={scene.id} className="bg-gray-50 p-4 rounded shadow space-y-2 mb-4">
      <input
        className="w-full border px-4 py-2 rounded"
        placeholder="Title"
        value={scene.title}
        onChange={(e) => handleSceneUpdate(scene.id, 'title', e.target.value)}
      />
      
      {/* Image Section */}
      <div>
        <label className="block text-sm font-medium mb-1">Scene Image</label>
        <div className="flex gap-2 items-center">
          <input
            type="file"
            accept="image/*"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) {
                try {
                  // Show preview immediately
                  const previewUrl = URL.createObjectURL(file);
                  setBonusScenes(bonusScenes.map(s => 
                    s.id === scene.id ? { 
                      ...s, 
                      imageFile: file,
                      imageUrl: previewUrl 
                    } : s
                  ));
                  
                  // Upload to Bunny.net and update Firestore
                  const imageUrl = await BunnyUploader.upload(file);
                  await handleSceneUpdate(scene.id, 'imageUrl', imageUrl);
                  
                  // Clean up blob URL after upload is complete
                  URL.revokeObjectURL(previewUrl);
                } catch (error) {
                  toast.error(`Image upload failed: ${error.message}`);
                  // Revert to previous state if upload fails
                  loadData();
                }
              }
            }}
            className="hidden"
            id={`sceneImageUpload-${scene.id}`}
          />
          <label
            htmlFor={`sceneImageUpload-${scene.id}`}
            className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded cursor-pointer text-sm"
          >
            {scene.imageFile ? 'Change Image' : 'Choose Image'}
          </label>
          <input
            className="flex-1 border px-4 py-2 rounded text-sm"
            placeholder="Image URL"
            value={scene.imageUrl}
            onChange={(e) => {
              handleSceneUpdate(scene.id, 'imageUrl', e.target.value);
              // Clear any selected file when URL is manually entered
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
              className="text-red-500 hover:text-red-700 text-sm"
            >
              Clear
            </button>
          )}
        </div>
        {scene.imageUrl && (
          <div className="mt-2">
            <img 
              src={scene.imageUrl} 
              alt="Scene Preview" 
              className="max-h-40 rounded border"
              onLoad={() => {
                // Clean up blob URL if it's a local preview
                if (scene.imageUrl.startsWith('blob:')) {
                  URL.revokeObjectURL(scene.imageUrl);
                }
              }}
            />
            {scene.imageFile && (
              <p className="text-sm text-gray-500 mt-1">
                Uploading image... (preview only)
              </p>
            )}
          </div>
        )}
      </div>

      {/* Audio Section */}
      <div>
        <label className="block text-sm font-medium mb-1">Scene Audio</label>
        <div className="flex gap-2 items-center">
          <input
            type="file"
            accept="audio/*"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) {
                try {
                  // Show preview immediately
                  const previewUrl = URL.createObjectURL(file);
                  setBonusScenes(bonusScenes.map(s => 
                    s.id === scene.id ? { 
                      ...s, 
                      audioFile: file,
                      audioUrl: previewUrl 
                    } : s
                  ));
                  
                  // Upload to Bunny.net and update Firestore
                  const audioUrl = await BunnyUploader.upload(file);
                  await handleSceneUpdate(scene.id, 'audioUrl', audioUrl);
                  
                  // Clean up blob URL after upload is complete
                  URL.revokeObjectURL(previewUrl);
                } catch (error) {
                  toast.error(`Audio upload failed: ${error.message}`);
                  // Revert to previous state if upload fails
                  loadData();
                }
              }
            }}
            className="hidden"
            id={`sceneAudioUpload-${scene.id}`}
          />
          <label
            htmlFor={`sceneAudioUpload-${scene.id}`}
            className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded cursor-pointer text-sm"
          >
            {scene.audioFile ? 'Change Audio' : 'Choose Audio'}
          </label>
          <input
            className="flex-1 border px-4 py-2 rounded text-sm"
            placeholder="Audio URL"
            value={scene.audioUrl}
            onChange={(e) => {
              handleSceneUpdate(scene.id, 'audioUrl', e.target.value);
              // Clear any selected file when URL is manually entered
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
              className="text-red-500 hover:text-red-700 text-sm"
            >
              Clear
            </button>
          )}
        </div>
        {scene.audioUrl && (
          <div className="mt-2">
            <audio controls src={scene.audioUrl} className="w-full" />
            {scene.audioFile && (
              <p className="text-sm text-gray-500 mt-1">
                Uploading audio... (preview only)
              </p>
            )}
          </div>
        )}
      </div>

      <button
        onClick={() => handleSceneDelete(scene.id)}
        className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 text-sm"
      >
        Delete Scene
      </button>
    </div>
  ))}
</div>

      {/* Poll Management Section */}
      <div className="bg-white p-4 rounded shadow space-y-4">
        <h2 className="text-xl font-semibold">Poll Management</h2>
        
        {/* Create New Poll */}
        <div className="border p-4 rounded">
          <h3 className="font-bold mb-2">Create New Poll</h3>
          <input
            className="w-full border px-4 py-2 rounded mb-2"
            placeholder="Poll question"
            value={newPoll.question}
            onChange={(e) => setNewPoll({ ...newPoll, question: e.target.value })}
          />
          <label className="flex gap-2 items-center mb-2">
            <input
              type="checkbox"
              checked={newPoll.multiChoice}
              onChange={(e) => setNewPoll({ ...newPoll, multiChoice: e.target.checked })}
            />
            Allow multiple choice
          </label>
          
          <div className="space-y-2 mb-2">
            {newPoll.options.map((opt, i) => (
              <div key={i} className="flex gap-2 items-center">
                <span className="font-bold">{opt.key}:</span>
                <input
                  className="flex-1 border px-2 py-1 rounded"
                  placeholder={`Option ${opt.key}`}
                  value={opt.label}
                  onChange={(e) => updatePollOption(i, 'label', e.target.value)}
                />
                <button
                  className="text-sm text-red-600 hover:text-red-800"
                  onClick={() => removePollOption(i)}
                  disabled={newPoll.options.length <= 1}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          
          <button
            className="bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded mr-2"
            onClick={addPollOption}
          >
            + Add Option
          </button>
          
          <button
            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
            onClick={handlePollAdd}
            disabled={!newPoll.question || newPoll.options.some(opt => !opt.label)}
          >
            Save Poll
          </button>
        </div>

        {/* Active Poll Display */}
        {activePoll && (
          <div className="border p-4 rounded bg-yellow-50">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold">Active Poll</h3>
              <button
                onClick={endActivePoll}
                className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
              >
                Archive Poll
              </button>
            </div>
            
            <p className="font-semibold mb-2">{activePoll.question}</p>
            
            <ul className="space-y-2">
              {activePoll.options.map((opt, i) => (
                <li key={i} className="flex justify-between items-center">
                  <span>
                    <span className="font-bold">{opt.key}:</span> {opt.label} 
                    <span className="text-gray-600 ml-2">({opt.votes} votes)</span>
                  </span>
                  {!hasVoted && (
                    <button
                      onClick={() => vote(opt.key)}
                      className="bg-blue-600 text-white px-2 py-1 rounded text-sm hover:bg-blue-700"
                    >
                      Vote
                    </button>
                  )}
                </li>
              ))}
            </ul>
            
            {hasVoted && (
              <p className="mt-2 text-green-600">✓ You have already voted in this poll</p>
            )}
            
            <div className="mt-2 text-sm text-gray-600">
              Total votes: {activePoll.options.reduce((sum, opt) => sum + opt.votes, 0)}
            </div>
          </div>
        )}

        {/* Archived Polls */}
        {polls.length > 0 && (
          <div className="border p-4 rounded mt-4">
            <h3 className="font-bold mb-2">Archived Polls</h3>
            <div className="space-y-2">
              {polls.map((poll, index) => (
                <details key={index} className="border rounded p-2">
                  <summary className="font-semibold cursor-pointer">
                    {poll.question} ({new Date(poll.createdAt?.seconds * 1000).toLocaleDateString()})
                  </summary>
                  <ul className="mt-2 pl-4 space-y-1">
                    {poll.options?.map((opt, i) => (
                      <li key={i}>
                        {opt.key}: {opt.label} ({opt.votes} votes)
                      </li>
                    ))}
                  </ul>
                  <div className="text-sm text-gray-600 mt-1">
                    Total votes: {poll.options?.reduce((sum, opt) => sum + opt.votes, 0)}
                  </div>
                </details>
              ))}
            </div>
          </div>
        )}
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
    </div>

    
  );
}