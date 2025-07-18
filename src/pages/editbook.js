import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { doc, getDoc, updateDoc, Timestamp } from "firebase/firestore";
import { toast } from "react-toastify";
import { useParams, useNavigate } from "react-router-dom";
import BunnyUploader from "../services/BunnyUploader";

const spiceLevels = ["Mild", "Medium", "Spicy", "Extreme"];

export default function EditBook() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("");
  const [teaserQuote, setTeaserQuote] = useState("");
  const [tags, setTags] = useState([]);
  const [spiceLevel, setSpiceLevel] = useState("Mild"); // Changed from rate to spiceLevel
  const [coverFile, setCoverFile] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecommended, setIsRecommended] = useState(false);
  const [availableGenres, setAvailableGenres] = useState([]);
  const [fallbackGenres, setFallbackGenres] = useState([]);
  const [existingCover, setExistingCover] = useState("");
  const [existingAudio, setExistingAudio] = useState("");

  // Fetch genres and book data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const genresDoc = await getDoc(doc(db, "categories", "topics"));
        if (genresDoc.exists()) {
          const data = genresDoc.data();
          setAvailableGenres(data.list || []);
          setFallbackGenres(data.fallbackTopics || []);
        }

        const bookDoc = await getDoc(doc(db, "audiobooks", id));
        if (bookDoc.exists()) {
          const book = bookDoc.data();
          setTitle(book.title);
          setAuthor(book.author);
          setDescription(book.summary || "");
          setLanguage(book.language || "");
          setTags(book.tags || []);
          setSpiceLevel(book.spiceLevel || "Mild"); // Set spiceLevel instead of rate
          setIsRecommended(book.isRecommended || false);
          setTeaserQuote(book.teaserQuote || "");
          setExistingCover(book.bookCover || "");
          setExistingAudio(book.audioUrl || "");
        } else {
          toast.error("Audiobook not found.");
          navigate("/dashboard/audiobooks");
        }
      } catch (error) {
        toast.error("Error loading data.");
        console.error(error);
      }
    };

    fetchData();
  }, [id, navigate]);

  const handleTagChange = (e) => {
    const { value, checked } = e.target;
    if (checked) {
      setTags([...tags, value]);
    } else {
      setTags(tags.filter((g) => g !== value));
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let bookCoverUrl = existingCover;
      let audioUrl = existingAudio;

      if (coverFile) {
        const coverPath = `book-covers/${Date.now()}_${coverFile.name}`;
        bookCoverUrl = await BunnyUploader.upload(coverFile);
      }

      if (audioFile) {
        const audioPath = `audiobooks/${Date.now()}_${audioFile.name}`;
        audioUrl = await BunnyUploader.upload(audioFile);
      }

      const updatedData = {
        title,
        author,
        summary: description,
        language,
        tags,
        spiceLevel, // Use spiceLevel instead of rate
        bookCover: bookCoverUrl,
        audioUrl,
        isRecommended,
        teaserQuote,
        updatedAt: Timestamp.now(),
      };

      await updateDoc(doc(db, "audiobooks", id), updatedData);

      toast.success("Audiobook updated successfully!");
      navigate("/dashboard/audiobooks");
    } catch (error) {
      console.error(error);
      toast.error("Failed to update audiobook.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-2xl font-bold text-yellow-500 mb-4">Edit Audiobook</h1>
      <form onSubmit={handleUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        <div className="flex items-center">
          <input
            type="checkbox"
            id="isRecommended"
            checked={isRecommended}
            onChange={(e) => setIsRecommended(e.target.checked)}
            className="mr-2"
          />
          <label htmlFor="isRecommended" className="text-gray-400">Recommended</label>
        </div>

        <div className="col-span-1 md:col-span-2">
          <label className="text-gray-400 block mb-1">Tags</label>
          <div className="flex flex-wrap gap-2">
            {(availableGenres.length > 0 ? availableGenres : fallbackGenres).map((genre) => (
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
            ))}
          </div>
        </div>

        <div>
          <label className="text-gray-400 block mb-1">Cover Image (optional)</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setCoverFile(e.target.files[0])}
            className="p-2 bg-gray-800 border border-gray-700 rounded w-full"
          />
          {existingCover && (
            <img src={existingCover} alt="Current cover" className="mt-2 w-32 h-32 object-cover rounded" />
          )}
        </div>

        <div>
          <label className="text-gray-400 block mb-1">Audio File (optional)</label>
          <input
            type="file"
            accept="audio/*"
            onChange={(e) => setAudioFile(e.target.files[0])}
            className="p-2 bg-gray-800 border border-gray-700 rounded w-full"
          />
          {existingAudio && <p className="text-sm mt-1 text-gray-400">Audio already uploaded</p>}
        </div>

        <div className="col-span-1 md:col-span-2">
          <button
            type="submit"
            disabled={isLoading}
            className={`bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded w-full ${
              isLoading ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {isLoading ? "Updating..." : "Update Audiobook"}
          </button>
        </div>
      </form>
    </div>
  );
}