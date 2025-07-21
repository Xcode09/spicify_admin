import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, addDoc, Timestamp, getDoc, doc } from "firebase/firestore";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import BunnyUploader from "../services/BunnyUploader";

const spiceLevels = ["Level 1", "Level 2", "Level 3", "Level 4", "Level 5"];

export default function Addbooks() {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("");
  const [teaserQuote, setTeaserQuote] = useState("");
  const [tags, setTags] = useState([]);
  const [spiceLevel, setSpiceLevel] = useState("Mild"); // Default to first option
  const [coverFile, setCoverFile] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecommended, setIsRecommended] = useState(false);
  const [availableGenres, setAvailableGenres] = useState([]);
  const [fallbackGenres, setFallbackGenres] = useState([]);

  const navigate = useNavigate();

  // Fetch genres from Firestore
  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const docRef = doc(db, "categories", "topics");
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setAvailableGenres(data.list || []);
          setFallbackGenres(data.fallbackTopics || []);
        } else {
          console.log("No genres found, using fallback");
          setAvailableGenres(fallbackGenres);
        }
      } catch (error) {
        console.error("Error fetching genres:", error);
        toast.error("Failed to load genres");
      }
    };

    fetchGenres();
  }, []);

  const handleTagChange = (e) => {
    const { value, checked } = e.target;
    if (checked) {
      setTags([...tags, value]);
    } else {
      setTags(tags.filter((g) => g !== value));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    if (!title || !coverFile) {
      toast.error("Title and cover image are required.");
      setIsLoading(false);
      return;
    }

    try {
      let bookCoverUrl = "";
      let audioUrl = "";

      // Upload cover to Bunny CDN
      if (coverFile) {
        const coverPath = `book-covers/${Date.now()}_${coverFile.name}`;
        bookCoverUrl = await BunnyUploader.upload(coverFile);
      }

      // Upload audio to Bunny CDN if provided
      if (audioFile) {
        const audioPath = `audiobooks/${Date.now()}_${audioFile.name}`;
        audioUrl = await BunnyUploader.upload(audioFile);
      }

      // Prepare book data for Firestore
      const bookData = {
        title,
        author,
        summary: description,
        language,
        tags,
        spiceLevel, // Use the selected spice level
        bookCover: bookCoverUrl,
        audioUrl,
        isRecommended,
        teaserQuote,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      // Save to Firestore books collection
      const docRef = await addDoc(collection(db, "audiobooks"), bookData);
      
      toast.success("Audiobook created successfully!");
      navigate("/dashboard/audiobooks");
    } catch (error) {
      console.error("Error:", error);
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-2xl font-bold text-red-500 mb-4">Create New Audiobook</h1>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input
          type="text"
          placeholder="Title *"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="p-2 bg-gray-800 border border-gray-700 rounded"
          required
        />

        <input
          type="text"
          placeholder="Author *"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          className="p-2 bg-gray-800 border border-gray-700 rounded"
          required
        />

        <textarea
          placeholder="Summary"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="p-2 bg-gray-800 border border-gray-700 rounded col-span-1 md:col-span-2"
          rows={4}
        />

        <input
          type="text"
          placeholder="Language"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="p-2 bg-gray-800 border border-gray-700 rounded"
        />

        <input
          type="text"
          placeholder="Teaser Quote"
          value={teaserQuote}
          onChange={(e) => setTeaserQuote(e.target.value)}
          className="p-2 bg-gray-800 border border-gray-700 rounded"
        />

        <div className="col-span-1">
          <label className="block mb-1 text-gray-400">Spice Level</label>
          <select
            value={spiceLevel}
            onChange={(e) => setSpiceLevel(e.target.value)}
            className="p-2 bg-gray-800 border border-gray-700 rounded w-full"
          >
            {spiceLevels.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </div>

        <div className="col-span-1 flex items-center">
          <input
            type="checkbox"
            id="isRecommended"
            checked={isRecommended}
            onChange={(e) => setIsRecommended(e.target.checked)}
            className="mr-2"
          />
          <label htmlFor="isRecommended" className="text-gray-400">
            Recommended
          </label>
        </div>

        <div className="col-span-1 md:col-span-2">
          <label className="block mb-1 text-gray-400">Tags</label>
          <div className="flex flex-wrap gap-2">
            {availableGenres.length > 0 ? (
              availableGenres.map((genre) => (
                <label key={genre} className="text-sm">
                  <input
                    type="checkbox"
                    value={genre}
                    onChange={handleTagChange}
                    checked={tags.includes(genre)}
                    className="mr-1"
                  />
                  {genre}
                </label>
              ))
            ) : (
              fallbackGenres.map((genre) => (
                <label key={genre} className="text-sm">
                  <input
                    type="checkbox"
                    value={genre}
                    onChange={handleTagChange}
                    checked={tags.includes(genre)}
                    className="mr-1"
                  />
                  {genre}
                </label>
              ))
            )}
          </div>
        </div>

        <div className="col-span-1">
          <label className="block mb-1 text-gray-400">Cover Image *</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setCoverFile(e.target.files[0])}
            className="p-2 bg-gray-800 border border-gray-700 rounded w-full"
            required
          />
        </div>

        <div className="col-span-1 md:col-span-2">
          <button
            type="submit"
            disabled={isLoading}
            className={`bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded w-full ${
              isLoading ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              "Save Audiobook"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}