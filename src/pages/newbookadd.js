import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, addDoc, Timestamp, getDoc, doc } from "firebase/firestore";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import BunnyUploader from "../services/BunnyUploader";

const spiceLevels = ["Mild", "Hot", "Insane"];

export default function Addbooks() {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("");
  const [teaserQuote, setTeaserQuote] = useState("");
  const [tags, setTags] = useState([]);
  const [spiceLevel, setSpiceLevel] = useState("Mild");
  const [coverFile, setCoverFile] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecommended, setIsRecommended] = useState(false);
  const [availableGenres, setAvailableGenres] = useState([]);
  const [fallbackGenres, setFallbackGenres] = useState([]);

  const navigate = useNavigate();

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

      if (coverFile) {
        bookCoverUrl = await BunnyUploader.upload(coverFile);
      }

      if (audioFile) {
        audioUrl = await BunnyUploader.upload(audioFile);
      }

      const bookData = {
        title,
        author,
        summary: description,
        language,
        tags,
        spiceLevel,
        bookCover: bookCoverUrl,
        audioUrl,
        isRecommended,
        teaserQuote,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      await addDoc(collection(db, "audiobooks"), bookData);
      
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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800">Create New Audiobook</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Title */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Title *</label>
                <input
                  type="text"
                  placeholder="Enter book title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-black focus:border-transparent"
                  required
                />
              </div>

              {/* Author */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Author *</label>
                <input
                  type="text"
                  placeholder="Enter author name"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-black focus:border-transparent"
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-2 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Summary</label>
                <textarea
                  placeholder="Enter book summary"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-black focus:border-transparent"
                  rows={4}
                />
              </div>

              {/* Language */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Language</label>
                <input
                  type="text"
                  placeholder="Enter language"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-black focus:border-transparent"
                />
              </div>

              {/* Teaser Quote */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Teaser Quote</label>
                <input
                  type="text"
                  placeholder="Enter teaser quote"
                  value={teaserQuote}
                  onChange={(e) => setTeaserQuote(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-black focus:border-transparent"
                />
              </div>

              {/* Spice Level */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Spice Level</label>
                <select
                  value={spiceLevel}
                  onChange={(e) => setSpiceLevel(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-black focus:border-transparent"
                >
                  {spiceLevels.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </div>

              {/* Recommended */}
              <div className="space-y-2 flex items-center">
                <input
                  type="checkbox"
                  id="isRecommended"
                  checked={isRecommended}
                  onChange={(e) => setIsRecommended(e.target.checked)}
                  className="h-4 w-4 text-black focus:ring-black border-gray-300 rounded"
                />
                <label htmlFor="isRecommended" className="ml-2 block text-sm text-gray-700">
                  Recommended
                </label>
              </div>

              {/* Cover Image */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Cover Image *</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setCoverFile(e.target.files[0])}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-black focus:border-transparent"
                  required
                />
              </div>

              {/* Audio File */}
              {/* <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Audio File (Optional)</label>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => setAudioFile(e.target.files[0])}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-black focus:border-transparent"
                />
              </div> */}

              {/* Tags */}
              <div className="space-y-2 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Tags</label>
                <div className="bg-gray-50 p-4 rounded-md">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {availableGenres.length > 0 ? (
                      availableGenres.map((genre) => (
                        <div key={genre} className="flex items-center">
                          <input
                            type="checkbox"
                            id={`genre-${genre}`}
                            value={genre}
                            onChange={handleTagChange}
                            checked={tags.includes(genre)}
                            className="h-4 w-4 text-black focus:ring-black border-gray-300 rounded"
                          />
                          <label htmlFor={`genre-${genre}`} className="ml-2 text-sm text-gray-700">
                            {genre}
                          </label>
                        </div>
                      ))
                    ) : (
                      fallbackGenres.map((genre) => (
                        <div key={genre} className="flex items-center">
                          <input
                            type="checkbox"
                            id={`genre-${genre}`}
                            value={genre}
                            onChange={handleTagChange}
                            checked={tags.includes(genre)}
                            className="h-4 w-4 text-black focus:ring-black border-gray-300 rounded"
                          />
                          <label htmlFor={`genre-${genre}`} className="ml-2 text-sm text-gray-700">
                            {genre}
                          </label>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full md:w-auto px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 ${
                  isLoading ? "opacity-70 cursor-not-allowed" : ""
                }`}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : (
                  "Save Audiobook"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}