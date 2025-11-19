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
  const [spiceLevel, setSpiceLevel] = useState("Mild");
  const [coverFile, setCoverFile] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecommended, setIsRecommended] = useState(false);
  const [availableGenres, setAvailableGenres] = useState([]);
  const [fallbackGenres, setFallbackGenres] = useState([]);
  const [existingCover, setExistingCover] = useState("");
  const [existingAudio, setExistingAudio] = useState("");

  const [hubButtons, setHubButtons] = useState({
  listen: true,
  read: true,
  watch: false,
});

const [readingModeEnabled, setReadingModeEnabled] = useState(true);
const [watchModeEnabled, setWatchModeEnabled] = useState(false);

const [isDownloadable, setIsDownloadable] = useState(false);

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
          setSpiceLevel(book.spiceLevel || "Mild");
          setIsRecommended(book.isRecommended || false);
          setTeaserQuote(book.teaserQuote || "");
          setExistingCover(book.bookCover || "");
          setExistingAudio(book.audioUrl || "");
          setHubButtons(book.hubButtons || { listen: true, read: true, watch: false });
setReadingModeEnabled(book.readingModeEnabled ?? true);
setWatchModeEnabled(book.watchModeEnabled ?? false);
setIsDownloadable(book.isDownloadable ?? false);
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
  spiceLevel,
  bookCover: bookCoverUrl,
  audioUrl,
  isRecommended,
  teaserQuote,

  // ⭐ NEW FIELDS ⭐
  hubButtons,
  readingModeEnabled,
  watchModeEnabled,
  isDownloadable,

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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Edit Audiobook</h1>
            <button 
              onClick={() => navigate("/dashboard/audiobooks")}
              className="text-gray-600 hover:text-gray-800"
            >
              ← Back to List
            </button>
          </div>

          <form onSubmit={handleUpdate} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information Card */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h2 className="text-lg font-semibold text-gray-700 mb-4">Basic Information</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                    <input
                      type="text"
                      placeholder="Book Title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-black focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Author *</label>
                    <input
                      type="text"
                      placeholder="Author Name"
                      value={author}
                      onChange={(e) => setAuthor(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-black focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Summary</label>
                    <textarea
                      placeholder="Book summary..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-black focus:border-transparent"
                      rows={4}
                    />
                  </div>
                </div>
              </div>

              {/* Metadata Card */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h2 className="text-lg font-semibold text-gray-700 mb-4">Metadata</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                    <input
                      type="text"
                      placeholder="Language"
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-black focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Teaser Quote</label>
                    <input
                      type="text"
                      placeholder="Teaser quote for the book"
                      value={teaserQuote}
                      onChange={(e) => setTeaserQuote(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-black focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Spice Level</label>
                    <select
                      value={spiceLevel}
                      onChange={(e) => setSpiceLevel(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-black focus:border-transparent"
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
                      className="h-4 w-4 text-black focus:ring-black border-gray-300 rounded"
                    />
                    <label htmlFor="isRecommended" className="ml-2 block text-sm text-gray-700">
                      Mark as Recommended
                    </label>
                  </div>
                </div>
              </div>

              {/* Tags Card */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 md:col-span-2">
                <h2 className="text-lg font-semibold text-gray-700 mb-4">Tags</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {(availableGenres.length > 0 ? availableGenres : fallbackGenres).map((genre) => (
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
                  ))}
                </div>
              </div>
              {/* Hub Buttons */}
<div className="mt-4">
  <h3 className="text-sm font-semibold mb-2">Hub Buttons</h3>

  <div className="flex flex-col gap-2">

    {/* Listen Button */}
    <label className="flex items-center gap-2">
      <input
        type="checkbox"
        checked={hubButtons.listen}
        onChange={(e) =>
          setHubButtons({ ...hubButtons, listen: e.target.checked })
        }
      />
      <span className="text-sm text-gray-700">Listen</span>
    </label>

    {/* Read Button */}
    <label className="flex items-center gap-2">
      <input
        type="checkbox"
        checked={hubButtons.read}
        onChange={(e) =>
          setHubButtons({ ...hubButtons, read: e.target.checked })
        }
      />
      <span className="text-sm text-gray-700">Read</span>
    </label>

    {/* Watch Button */}
    <label className="flex items-center gap-2">
      <input
        type="checkbox"
        checked={hubButtons.watch}
        onChange={(e) =>
          setHubButtons({ ...hubButtons, watch: e.target.checked })
        }
      />
      <span className="text-sm text-gray-700">Watch</span>
    </label>

  </div>
</div>


  {/* Reading Mode */}
<div className="flex items-center gap-2">
  <input
    type="checkbox"
    checked={readingModeEnabled}
    onChange={(e) => setReadingModeEnabled(e.target.checked)}
  />
  <label className="text-sm text-gray-700">Reading Mode Enabled</label>
</div>

{/* Watch Mode */}
<div className="flex items-center gap-2">
  <input
    type="checkbox"
    checked={watchModeEnabled}
    onChange={(e) => setWatchModeEnabled(e.target.checked)}
  />
  <label className="text-sm text-gray-700">Watch Mode Enabled</label>
</div>

{/* Download Option */}
<div className="flex items-center gap-2">
  <input
    type="checkbox"
    checked={isDownloadable}
    onChange={(e) => setIsDownloadable(e.target.checked)}
  />
  <label className="text-sm text-gray-700">Allow Download</label>
</div>

              {/* Media Card */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 md:col-span-2">
                <h2 className="text-lg font-semibold text-gray-700 mb-4">Media Files</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Cover Image</label>
                    <div className="flex items-center space-x-4">
                      <div className="flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setCoverFile(e.target.files[0])}
                          className="block w-full text-sm text-gray-500
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-md file:border-0
                            file:text-sm file:font-semibold
                            file:bg-black file:text-white
                            hover:file:bg-gray-800"
                        />
                      </div>
                      {existingCover && (
                        <div className="shrink-0">
                          <img 
                            src={existingCover} 
                            alt="Current cover" 
                            className="w-20 h-20 object-cover rounded-md border border-gray-200" 
                          />
                        </div>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">JPEG, PNG, or WebP. Max 5MB.</p>
                  </div>

                  {/* <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Audio File</label>
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={(e) => setAudioFile(e.target.files[0])}
                      className="block w-full text-sm text-gray-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-md file:border-0
                        file:text-sm file:font-semibold
                        file:bg-black file:text-white
                        hover:file:bg-gray-800"
                    />
                    {existingAudio && (
                      <p className="mt-2 text-sm text-gray-600">
                        <span className="font-medium">Current audio:</span> {existingAudio.split('/').pop()}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">MP3, WAV, or AAC. Max 50MB.</p>
                  </div> */}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => navigate("/dashboard/audiobooks")}
                className="px-6 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className={`px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black ${
                  isLoading ? "opacity-70 cursor-not-allowed" : ""
                }`}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Updating...
                  </span>
                ) : "Update Audiobook"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}