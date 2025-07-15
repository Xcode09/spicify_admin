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

  // Firestore references
  const clubDocRef = doc(db, 'subscriber_club', 'clubData');
  const scenesColRef = collection(clubDocRef, 'bonusScenes');
  const pollsColRef = collection(clubDocRef, 'polls');
  const postsColRef = collection(clubDocRef, 'posts');
  const activePollDocRef = doc(db, 'subscriber_club', 'clubData', 'polls', 'active');
  
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
      await setDoc(clubDocRef, form);
      alert('Updated successfully');
    } catch (error) {
      console.error("Error updating club data:", error);
      alert('Error updating club data');
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
      await updateDoc(doc(scenesColRef, id), { [field]: value });
      loadData();
    } catch (error) {
      console.error("Error updating scene:", error);
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
  <div className="border-t pt-4 mt-4">
    <h3 className="font-bold mb-2">Sneak Peek Content</h3>
    <p className="text-sm text-gray-600 mb-2">Preview of upcoming content for subscribers</p>
    
    <div className="space-y-2">
      <div>
        <label className="block font-medium">Image URL</label>
        <input
          className="w-full border px-4 py-2 rounded"
          placeholder="https://example.com/sneakpeek-image.jpg"
          value={form.sneakPeek.imageUrl}
          onChange={(e) =>
            setForm({
              ...form,
              sneakPeek: { ...form.sneakPeek, imageUrl: e.target.value },
            })
          }
        />
      </div>
      
      <div>
        <label className="block font-medium">Audio URL</label>
        <input
          className="w-full border px-4 py-2 rounded"
          placeholder="https://example.com/sneakpeek-audio.mp3"
          value={form.sneakPeek.audioUrl}
          onChange={(e) =>
            setForm({
              ...form,
              sneakPeek: { ...form.sneakPeek, audioUrl: e.target.value },
            })
          }
        />
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
      />
      <label htmlFor="holidayToggle" className="font-bold">
        Holiday Special
      </label>
    </div>
    
    {form.isHolidaySpecial && (
      <div className="space-y-2 bg-yellow-50 p-3 rounded">
        <p className="text-sm text-gray-600 mb-2">Special content for seasonal celebrations</p>
        
        <div>
          <label className="block font-medium">Title</label>
          <input
            className="w-full border px-4 py-2 rounded"
            placeholder="Christmas Special 2023"
            value={form.holidaySpecial.title}
            onChange={(e) =>
              setForm({
                ...form,
                holidaySpecial: { ...form.holidaySpecial, title: e.target.value },
              })
            }
          />
        </div>
        
        <div>
          <label className="block font-medium">Image URL</label>
          <input
            className="w-full border px-4 py-2 rounded"
            placeholder="https://example.com/holiday-image.jpg"
            value={form.holidaySpecial.imageUrl}
            onChange={(e) =>
              setForm({
                ...form,
                holidaySpecial: { ...form.holidaySpecial, imageUrl: e.target.value },
              })
            }
          />
        </div>
        
        <div>
          <label className="block font-medium">Audio URL</label>
          <input
            className="w-full border px-4 py-2 rounded"
            placeholder="https://example.com/holiday-audio.mp3"
            value={form.holidaySpecial.audioUrl}
            onChange={(e) =>
              setForm({
                ...form,
                holidaySpecial: { ...form.holidaySpecial, audioUrl: e.target.value },
              })
            }
          />
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
            <input
              className="w-full border px-4 py-2 rounded"
              placeholder="Author"
              value={scene.author}
              onChange={(e) => handleSceneUpdate(scene.id, 'author', e.target.value)}
            />
            <input
              className="w-full border px-4 py-2 rounded"
              placeholder="Image URL"
              value={scene.imageUrl}
              onChange={(e) => handleSceneUpdate(scene.id, 'imageUrl', e.target.value)}
            />
            <input
              className="w-full border px-4 py-2 rounded"
              placeholder="Audio URL"
              value={scene.audioUrl}
              onChange={(e) => handleSceneUpdate(scene.id, 'audioUrl', e.target.value)}
            />
            <button
              onClick={() => handleSceneDelete(scene.id)}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
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
      </div>
    </div>
  );
}