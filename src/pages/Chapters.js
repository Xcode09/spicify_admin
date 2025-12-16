import React, { useEffect, useState, useRef } from "react";
import {
  collection,
  doc,
  onSnapshot,
  updateDoc,
  setDoc,
  deleteDoc,
  addDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { toast } from "react-toastify";
import BunnyUploader from "../services/BunnyUploader";

import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FiEdit2, FiTrash2, FiVideo, FiUpload, FiLoader, FiPlus, FiList, FiX, FiSave, FiEdit } from "react-icons/fi";
import { MdAudiotrack, MdTextFields, MdLock, MdLockOpen, MdLocalMovies, MdPlayCircle, MdCheckCircle } from "react-icons/md";

/**
 * UploadIndicator component
 */
function UploadIndicator({ isUploading, progress }) {
  if (!isUploading) return null;
  
  return (
    <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
      <FiLoader className="animate-spin" />
      <span>Uploading... {progress > 0 && `${Math.round(progress)}%`}</span>
    </div>
  );
}

/**
 * UploadProgress component for individual uploads
 */
function UploadProgress({ file, progress, status }) {
  return (
    <div className="flex items-center justify-between p-2 bg-gray-50 rounded border">
      <div className="flex items-center gap-2">
        {status === 'uploading' && <FiLoader className="animate-spin text-blue-600" />}
        {status === 'completed' && <MdCheckCircle className="text-green-600" />}
        {status === 'error' && <span className="text-red-600">✗</span>}
        <span className="text-sm truncate max-w-[200px]">{file.name}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500">
          {status === 'uploading' ? 'Uploading...' : status === 'completed' ? 'Ready' : 'Failed'}
        </span>
        {progress > 0 && progress < 100 && (
          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Episode Editor Component
 */
function EpisodeEditor({ 
  episode, 
  onSave, 
  onCancel, 
  isEditing,
  onDelete,
  uploadProgress = 0
}) {
  const [title, setTitle] = useState(episode?.title || "");
  const [description, setDescription] = useState(episode?.description || "");
  const [videoFile, setVideoFile] = useState(null);
  const [videoURL, setVideoURL] = useState(episode?.videoUrl || "");
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailURL, setThumbnailURL] = useState(episode?.thumbnailUrl || "");
  const [duration, setDuration] = useState(episode?.duration || "");
  const [isUploading, setIsUploading] = useState(false);

  const handleSave = async () => {
    if (!title) {
      toast.error("Please enter episode title");
      return;
    }

    if (!videoURL && !videoFile) {
      toast.error("Please add video URL or upload video file");
      return;
    }

    setIsUploading(true);

    let finalVideoURL = videoURL;
    let finalThumbnailURL = thumbnailURL;

    try {
      // Upload video if new file is provided
      if (videoFile) {
        toast.info("Uploading video...");
        finalVideoURL = await BunnyUploader.upload(videoFile);
      }

      // Upload thumbnail if new file is provided
      if (thumbnailFile) {
        toast.info("Uploading thumbnail...");
        finalThumbnailURL = await BunnyUploader.upload(thumbnailFile);
      }

      const updatedEpisode = {
        ...episode,
        title,
        description,
        videoUrl: finalVideoURL,
        thumbnailUrl: finalThumbnailURL,
        duration,
        updatedAt: new Date().toISOString()
      };

      await onSave(updatedEpisode);
      toast.success(isEditing ? "Episode updated!" : "Episode saved!");
      
      if (!isEditing) {
        // Reset form for new episode
        setTitle("");
        setDescription("");
        setVideoFile(null);
        setVideoURL("");
        setThumbnailFile(null);
        setThumbnailURL("");
        setDuration("");
      }
    } catch (error) {
      toast.error("Failed to save episode: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-white border rounded-lg p-6 shadow-sm">
      <h4 className="text-lg font-bold mb-4">
        {isEditing ? `✏️ Edit Episode: ${episode.title}` : "➕ Add New Episode"}
      </h4>
      
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="font-semibold block mb-2">Episode Title *</label>
            <input
              className="w-full p-3 rounded border"
              placeholder="Enter episode title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isUploading}
            />
          </div>
          <div>
            <label className="font-semibold block mb-2">Duration (optional)</label>
            <input
              className="w-full p-3 rounded border"
              placeholder="e.g., 45:30"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              disabled={isUploading}
            />
          </div>
        </div>

        <div>
          <label className="font-semibold block mb-2">Episode Description</label>
          <textarea
            className="w-full p-3 rounded border"
            placeholder="Enter episode description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isUploading}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="font-semibold block mb-2">Episode Video *</label>
            <div className="space-y-2">
              <input
                type="file"
                accept="video/*"
                onChange={(e) => setVideoFile(e.target.files[0])}
                className="w-full p-2 rounded border"
                disabled={isUploading}
              />
              <input
                className="w-full p-2 rounded border"
                placeholder="Or paste video URL"
                value={videoURL}
                onChange={(e) => setVideoURL(e.target.value)}
                disabled={isUploading}
              />
              {videoURL && (
                <div className="text-xs text-green-600 flex items-center gap-1">
                  <MdCheckCircle />
                  {videoFile ? "New file selected" : "URL ready"}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="font-semibold block mb-2">Episode Thumbnail</label>
            <div className="space-y-2">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setThumbnailFile(e.target.files[0])}
                className="w-full p-2 rounded border"
                disabled={isUploading}
              />
              <input
                className="w-full p-2 rounded border"
                placeholder="Or paste thumbnail URL"
                value={thumbnailURL}
                onChange={(e) => setThumbnailURL(e.target.value)}
                disabled={isUploading}
              />
              {thumbnailURL && (
                <div className="text-xs text-green-600 flex items-center gap-1">
                  <MdCheckCircle />
                  {thumbnailFile ? "New file selected" : "URL ready"}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Current video/thumbnail preview for editing */}
        {isEditing && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 p-4 bg-gray-50 rounded">
            <div>
              <h5 className="font-semibold mb-2">Current Video:</h5>
              {episode.videoUrl && (
                <div className="flex items-center gap-2 text-sm">
                  <FiVideo className="text-blue-600" />
                  <a 
                    href={episode.videoUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline truncate"
                  >
                    View current video
                  </a>
                </div>
              )}
            </div>
            <div>
              <h5 className="font-semibold mb-2">Current Thumbnail:</h5>
              {episode.thumbnailUrl && (
                <img 
                  src={episode.thumbnailUrl} 
                  alt="Current thumbnail"
                  className="w-20 h-20 object-cover rounded"
                />
              )}
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <button
            onClick={handleSave}
            disabled={isUploading || !title || (!videoURL && !videoFile)}
            className={`px-6 py-2 rounded flex items-center gap-2 ${
              isUploading || !title || (!videoURL && !videoFile)
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-purple-600 text-white hover:bg-purple-700'
            }`}
          >
            {isUploading ? (
              <>
                <FiLoader className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <FiSave />
                {isEditing ? "Update Episode" : "Save Episode"}
              </>
            )}
          </button>

          {isEditing && (
            <>
              <button
                onClick={() => onDelete(episode.id)}
                disabled={isUploading}
                className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-2"
              >
                <FiTrash2 />
                Delete
              </button>
              <button
                onClick={onCancel}
                disabled={isUploading}
                className="px-6 py-2 border rounded hover:bg-gray-100"
              >
                Cancel Edit
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Episode Manager Modal
 */
function EpisodeManagerModal({ 
  isOpen, 
  onClose, 
  series, 
  onSave
}) {
  const [episodes, setEpisodes] = useState(series?.episodes || []);
  const [editingEpisodeId, setEditingEpisodeId] = useState(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [activeUploads, setActiveUploads] = useState([]);

  useEffect(() => {
    if (series?.episodes) {
      setEpisodes(series.episodes);
    }
    // Reset states when modal opens
    setEditingEpisodeId(null);
    setIsAddingNew(false);
  }, [series, isOpen]);

  if (!isOpen) return null;

  const addActiveUpload = (file, type) => {
    const uploadId = Date.now() + Math.random();
    setActiveUploads(prev => [...prev, {
      id: uploadId,
      file,
      type,
      progress: 0,
      status: 'uploading'
    }]);
    return uploadId;
  };

  const updateUploadProgress = (uploadId, progress, status) => {
    setActiveUploads(prev => prev.map(upload => 
      upload.id === uploadId ? { ...upload, progress, status } : upload
    ));
  };

  const removeUpload = (uploadId) => {
    setActiveUploads(prev => prev.filter(upload => upload.id !== uploadId));
  };

  const uploadFileWithProgress = async (file, fileType) => {
    return new Promise((resolve, reject) => {
      const uploadId = addActiveUpload(file, fileType);
      
      BunnyUploader.upload(file, (progress) => {
        updateUploadProgress(uploadId, progress, 'uploading');
      })
        .then(url => {
          updateUploadProgress(uploadId, 100, 'completed');
          setTimeout(() => removeUpload(uploadId), 1000);
          resolve(url);
        })
        .catch(err => {
          updateUploadProgress(uploadId, 0, 'error');
          reject(err);
        });
    });
  };

  const handleSaveEpisode = async (episodeData) => {
    setIsUploading(true);
    
    try {
      let updatedEpisodes;
      
      if (editingEpisodeId) {
        // Update existing episode
        updatedEpisodes = episodes.map(ep => 
          ep.id === editingEpisodeId ? { ...ep, ...episodeData } : ep
        );
        setEditingEpisodeId(null);
      } else if (isAddingNew) {
        // Add new episode
        const newEpisode = {
          ...episodeData,
          id: Date.now(),
          order: episodes.length,
          createdAt: new Date().toISOString()
        };
        updatedEpisodes = [...episodes, newEpisode];
        setIsAddingNew(false);
      } else {
        // This shouldn't happen
        return;
      }
      
      setEpisodes(updatedEpisodes);
    } catch (error) {
      toast.error("Failed to save episode: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteEpisode = async (episodeId) => {
    if (!window.confirm("Are you sure you want to delete this episode?")) {
      return;
    }
    
    const updatedEpisodes = episodes.filter(ep => ep.id !== episodeId);
    // Reorder remaining episodes
    const reordered = updatedEpisodes.map((ep, i) => ({ ...ep, order: i }));
    setEpisodes(reordered);
    setEditingEpisodeId(null);
    toast.success("Episode deleted!");
  };

  const handleSaveAll = async () => {
    try {
      await onSave(episodes);
      toast.success("All episodes saved successfully!");
      onClose();
    } catch (error) {
      toast.error("Failed to save episodes: " + error.message);
    }
  };

  const handleStartEditing = (episodeId) => {
    setEditingEpisodeId(episodeId);
    setIsAddingNew(false);
  };

  const handleStartAdding = () => {
    setIsAddingNew(true);
    setEditingEpisodeId(null);
  };

  const handleCancelEdit = () => {
    setEditingEpisodeId(null);
    setIsAddingNew(false);
  };

  const editingEpisode = episodes.find(ep => ep.id === editingEpisodeId);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-purple-50 to-white">
          <div>
            <h2 className="text-2xl font-bold text-purple-800">Manage Episodes: {series?.title}</h2>
            <p className="text-gray-600 mt-1">Add, edit, or remove episodes from this series</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm bg-purple-100 text-purple-800 px-3 py-1 rounded-full">
              {episodes.length} episodes
            </span>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <FiX size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          {/* Active uploads indicator */}
          {activeUploads.length > 0 && (
            <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-700 mb-2 flex items-center gap-2">
                <FiUpload className="animate-pulse" />
                Uploads in Progress ({activeUploads.filter(u => u.status === 'uploading').length})
              </h4>
              <div className="space-y-2">
                {activeUploads.map(upload => (
                  <UploadProgress 
                    key={upload.id}
                    file={upload.file}
                    progress={upload.progress}
                    status={upload.status}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Episode Editor or Add New Button */}
          <div className="mb-6">
            {isAddingNew || editingEpisodeId ? (
              <EpisodeEditor
                episode={editingEpisode}
                onSave={handleSaveEpisode}
                onCancel={handleCancelEdit}
                onDelete={handleDeleteEpisode}
                isEditing={!!editingEpisodeId}
              />
            ) : (
              <div className="text-center p-8 bg-gradient-to-r from-gray-50 to-white border-2 border-dashed border-gray-300 rounded-lg">
                <FiPlus className="text-4xl text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">Add New Episode</h3>
                <p className="text-gray-500 mb-4">Start by adding episodes to your series</p>
                <button
                  onClick={handleStartAdding}
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 mx-auto"
                >
                  <FiPlus /> Add New Episode
                </button>
              </div>
            )}
          </div>

          {/* Episodes List */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <FiList /> Episodes ({episodes.length})
              </h3>
              {!isAddingNew && !editingEpisodeId && episodes.length > 0 && (
                <button
                  onClick={handleStartAdding}
                  className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center gap-2"
                >
                  <FiPlus /> Add Another Episode
                </button>
              )}
            </div>
            
            {episodes.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <p className="text-gray-500">No episodes yet. Add your first episode above.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {episodes.map((episode, index) => (
                  <div key={episode.id} className={`border rounded-lg p-4 transition-all ${
                    editingEpisodeId === episode.id 
                      ? 'border-purple-500 bg-purple-50' 
                      : 'bg-white hover:bg-gray-50'
                  }`}>
                    <div className="flex justify-between items-start">
                      <div className="flex items-start gap-4">
                        <div className="flex flex-col items-center">
                          <span className={`text-2xl font-bold ${editingEpisodeId === episode.id ? 'text-purple-600' : 'text-gray-400'}`}>
                            {index + 1}
                          </span>
                          <div className="text-xs text-gray-500 mt-1">EPISODE</div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-bold text-lg">{episode.title}</h4>
                            {episode.duration && (
                              <span className="text-sm bg-gray-100 text-gray-800 px-2 py-1 rounded">
                                {episode.duration}
                              </span>
                            )}
                          </div>
                          {episode.description && (
                            <p className="text-gray-600 mb-3">{episode.description}</p>
                          )}
                          
                          <div className="flex items-center gap-4 text-sm">
                            {episode.videoUrl && (
                              <div className="flex items-center gap-1">
                                <FiVideo className="text-blue-600" />
                                <span className="text-blue-600">Video ready</span>
                              </div>
                            )}
                            {episode.thumbnailUrl && (
                              <div className="flex items-center gap-1">
                                <MdCheckCircle className="text-green-600" />
                                <span className="text-green-600">Thumbnail ready</span>
                              </div>
                            )}
                            <div className="text-gray-500">
                              Added: {new Date(episode.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleStartEditing(episode.id)}
                          className={`p-2 rounded ${
                            editingEpisodeId === episode.id
                              ? 'bg-purple-100 text-purple-700'
                              : 'text-blue-600 hover:bg-blue-50'
                          }`}
                          disabled={isUploading || (editingEpisodeId && editingEpisodeId !== episode.id)}
                          title="Edit episode"
                        >
                          <FiEdit2 />
                        </button>
                        <button
                          onClick={() => handleDeleteEpisode(episode.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded"
                          disabled={isUploading || editingEpisodeId}
                          title="Delete episode"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </div>
                    
                    {/* Thumbnail preview */}
                    {episode.thumbnailUrl && (
                      <div className="mt-4">
                        <img 
                          src={episode.thumbnailUrl} 
                          alt={`Thumbnail for ${episode.title}`}
                          className="w-full max-w-xs h-48 object-cover rounded-lg"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center gap-3 p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-500">
            {episodes.length} episodes ready to save
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 border rounded hover:bg-gray-100"
              disabled={isUploading}
            >
              Cancel
            </button>
            <button
              onClick={handleSaveAll}
              disabled={isUploading || activeUploads.some(u => u.status === 'uploading')}
              className={`px-6 py-2 rounded flex items-center gap-2 ${
                isUploading || activeUploads.some(u => u.status === 'uploading')
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}
            >
              {isUploading ? (
                <>
                  <FiLoader className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <FiSave />
                  Save All Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * SortableItem - reused for both audio and text lists.
 * Shows a clear badge for type, a short preview, lock state and action buttons.
 */
function SortableItem({ chapter, onEdit, onDelete, onToggleLock, onManageEpisodes }) {
  const { setNodeRef, attributes, listeners, transform, transition } =
    useSortable({ id: chapter.chapterId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // small preview: for text, join paragraph blocks (first 240 chars)
  const textPreview =
    chapter.chapterType === "text" && chapter.contentBlocks && chapter.contentBlocks.length
      ? chapter.contentBlocks
          .filter((b) => b.type === "paragraph")
          .map((b) => b.content)
          .join("\n")
          .slice(0, 240)
      : "";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white p-4 rounded-lg shadow-sm border mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-move flex items-start sm:items-center gap-3 w-full"
        role="button"
        aria-label={`Drag ${chapter.chapterName}`}
      >
        <div className="flex items-center gap-2 min-w-[72px]">
          {chapter.chapterType === "audio" ? (
            <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-2 py-1 rounded">
              <MdAudiotrack className="text-lg" />
              <span className="text-sm font-semibold">Audio</span>
            </div>
          ) : chapter.chapterType === "text" ? (
            <div className="flex items-center gap-2 bg-green-50 text-green-700 px-2 py-1 rounded">
              <MdTextFields className="text-lg" />
              <span className="text-sm font-semibold">Text</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-purple-50 text-purple-700 px-2 py-1 rounded">
              <MdLocalMovies className="text-lg" />
              <span className="text-sm font-semibold">Series</span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm sm:text-base truncate">{chapter.chapterName}</h3>

          {chapter.chapterType === "audio" ? (
            <p className="text-xs text-gray-500 truncate max-w-full">
              {chapter.chapterUrl ? chapter.chapterUrl : "No audio URL"}
            </p>
          ) : chapter.chapterType === "text" ? (
            <div className="text-xs text-gray-600 mt-1 max-w-full">
              <pre
                className="whitespace-pre-wrap overflow-hidden text-ellipsis"
                style={{ margin: 0, fontFamily: "inherit" }}
              >
                {textPreview || "No text content"}
                {textPreview.length >= 240 ? "…" : ""}
              </pre>
            </div>
          ) : (
            <p className="text-xs text-gray-500 truncate max-w-full">
              {chapter.seriesData?.episodeCount || 0} episodes
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 sm:mt-0 flex items-center gap-2">
        {chapter.chapterType === "series" && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onManageEpisodes(chapter);
            }}
            className="px-3 py-1 rounded text-sm flex items-center gap-1 border border-purple-600 text-purple-600 hover:bg-purple-50"
            title="Manage Episodes"
          >
            <FiEdit className="text-xs" />
            <span className="hidden sm:inline">Episodes</span>
          </button>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleLock(chapter.chapterId);
          }}
          className="px-3 py-1 rounded text-sm flex items-center gap-1 border"
          title={chapter.isLocked ? "Unlock chapter" : "Lock chapter"}
        >
          {chapter.isLocked ? (
            <>
              <MdLock className="text-sm" />
              <span className="hidden sm:inline">Locked</span>
            </>
          ) : (
            <>
              <MdLockOpen className="text-sm" />
              <span className="hidden sm:inline">Unlocked</span>
            </>
          )}
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(chapter);
          }}
          className="p-2 rounded text-blue-600 hover:bg-blue-50"
          title="Edit"
        >
          <FiEdit2 />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(chapter.chapterId);
          }}
          className="p-2 rounded text-red-600 hover:bg-red-50"
          title="Delete"
        >
          <FiTrash2 />
        </button>
      </div>
    </div>
  );
}

/**
 * Series Card Component
 */
function SeriesCard({ series, chapter, onEdit, onDelete, onToggleLock, onManageEpisodes }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-4">
          {series?.thumbnailUrl && (
            <img 
              src={series.thumbnailUrl} 
              alt={series.title} 
              className="w-32 h-48 object-cover rounded-lg"
            />
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm">
                <MdLocalMovies /> Series
              </span>
              <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm">
                {series?.episodes?.length || 0} episodes
              </span>
            </div>
            <h3 className="text-2xl font-bold mb-2">{series?.title || chapter.chapterName}</h3>
            <p className="text-gray-600 mb-4">{series?.description}</p>
            
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <MdPlayCircle />
                <span>{series?.trailerUrl ? "Trailer available" : "No trailer"}</span>
              </div>
              <div>
                Created: {series?.createdAt ? new Date(series.createdAt).toLocaleDateString() : 'N/A'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Episodes Preview */}
      {series?.episodes && series.episodes.length > 0 && (
        <div className="mt-6">
          <h4 className="font-bold text-lg mb-3">Episodes Preview</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {series.episodes.slice(0, 3).map((episode, idx) => (
              <div key={idx} className="border rounded-lg p-3 hover:bg-gray-50">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-bold text-gray-400">#{idx + 1}</span>
                  <h5 className="font-semibold truncate">{episode.title}</h5>
                </div>
                {episode.thumbnailUrl && (
                  <img 
                    src={episode.thumbnailUrl} 
                    alt={episode.title}
                    className="w-full h-32 object-cover rounded mb-2"
                  />
                )}
                {episode.duration && (
                  <span className="text-xs text-gray-500">{episode.duration}</span>
                )}
              </div>
            ))}
          </div>
          {series.episodes.length > 3 && (
            <div className="text-center mt-3">
              <span className="text-gray-500">
                ... and {series.episodes.length - 3} more episodes
              </span>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-6 flex flex-wrap gap-2 pt-4 border-t">
        <button
          onClick={() => onManageEpisodes(chapter)}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center gap-2"
        >
          <FiEdit2 /> Edit Episodes
        </button>
        <button
          onClick={() => onToggleLock(chapter.chapterId)}
          className="px-4 py-2 border rounded hover:bg-gray-100 flex items-center gap-2"
        >
          {chapter.isLocked ? <MdLock /> : <MdLockOpen />}
          {chapter.isLocked ? "Unlock" : "Lock"}
        </button>
        <button
          onClick={() => onEdit(chapter)}
          className="px-4 py-2 border border-blue-600 text-blue-600 rounded hover:bg-blue-50 flex items-center gap-2"
        >
          <FiEdit2 /> Edit Series Info
        </button>
        <button
          onClick={() => onDelete(chapter.chapterId)}
          className="px-4 py-2 border border-red-600 text-red-600 rounded hover:bg-red-50 flex items-center gap-2"
        >
          <FiTrash2 /> Delete
        </button>
      </div>
    </div>
  );
}

/**
 * MAIN COMPONENT - Tabs version (big mobile-friendly tabs).
 * Now with three tabs: audio, text, and series.
 */
export default function ChapterManager() {
  // General state
  const [books, setBooks] = useState([]);
  const [selectedBookId, setSelectedBookId] = useState("");
  const [chapters, setChapters] = useState([]);
  const [seriesCollection, setSeriesCollection] = useState([]);

  // Which tab is active: "audio" or "text" or "series"
  const [activeTab, setActiveTab] = useState("audio");

  // Editing state
  const [editingId, setEditingId] = useState(null);

  // Loading and upload states
  const [isUploadingSeries, setIsUploadingSeries] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeUploads, setActiveUploads] = useState([]);

  // Episode manager modal state
  const [episodeManagerOpen, setEpisodeManagerOpen] = useState(false);
  const [selectedSeries, setSelectedSeries] = useState(null);
  const [selectedSeriesChapter, setSelectedSeriesChapter] = useState(null);

  // Audio-specific states (form)
  const [audioFormTitle, setAudioFormTitle] = useState("");
  const [audioFile, setAudioFile] = useState(null);
  const [audioURL, setAudioURL] = useState("");

  // Text-specific states (form)
  const [textFormTitle, setTextFormTitle] = useState("");
  const [textContent, setTextContent] = useState("");
  const [contentBlocks, setContentBlocks] = useState([]); // text + images

  // Series-specific states (form)
  const [seriesFormTitle, setSeriesFormTitle] = useState("");
  const [seriesDescription, setSeriesDescription] = useState("");
  const [trailerFile, setTrailerFile] = useState(null);
  const [trailerURL, setTrailerURL] = useState("");
  const [trailerUploaded, setTrailerUploaded] = useState(false);
  const [seriesThumbnail, setSeriesThumbnail] = useState(null);
  const [seriesThumbnailURL, setSeriesThumbnailURL] = useState("");
  const [seriesThumbnailUploaded, setSeriesThumbnailUploaded] = useState(false);
  const [episodes, setEpisodes] = useState([]);
  const [newEpisodeTitle, setNewEpisodeTitle] = useState("");
  const [newEpisodeDescription, setNewEpisodeDescription] = useState("");
  const [newEpisodeVideoFile, setNewEpisodeVideoFile] = useState(null);
  const [newEpisodeVideoURL, setNewEpisodeVideoURL] = useState("");
  const [newEpisodeThumbnail, setNewEpisodeThumbnail] = useState(null);
  const [newEpisodeThumbnailURL, setNewEpisodeThumbnailURL] = useState("");
  const [newEpisodeDuration, setNewEpisodeDuration] = useState("");

  // Refs for file inputs
  const seriesThumbnailRef = useRef(null);
  const trailerRef = useRef(null);
  const episodeVideoRef = useRef(null);
  const episodeThumbnailRef = useRef(null);

  // Load books
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "audiobooks"), (snapshot) => {
      const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setBooks(list);
    });

    return () => unsub();
  }, []);

  // Load chapters after book selected
  useEffect(() => {
    if (!selectedBookId) {
      setChapters([]);
      setSeriesCollection([]);
      return;
    }

    const unsub = onSnapshot(doc(db, "audiobooks", selectedBookId), async (docSnap) => {
      if (docSnap.exists()) {
        const book = docSnap.data();

        if (book.chapters) {
          const sorted = [...book.chapters].sort((a, b) => a.order - b.order);
          setChapters(sorted);
        } else {
          setChapters([]);
        }
      }
    });

    return () => unsub();
  }, [selectedBookId]);

  // Load series data for selected book
  useEffect(() => {
    if (!selectedBookId) {
      setSeriesCollection([]);
      return;
    }

    const unsub = onSnapshot(collection(db, "series"), (snapshot) => {
      const seriesList = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((series) => series.bookId === selectedBookId);
      setSeriesCollection(seriesList);
    });

    return () => unsub();
  }, [selectedBookId]);

  const updateChaptersInFirestore = async (updatedChapters) => {
    const ref = doc(db, "audiobooks", selectedBookId);
    await updateDoc(ref, { chapters: updatedChapters });
  };

  // Open episode manager for a series
  const handleManageEpisodes = (chapter) => {
    const series = seriesCollection.find(s => s.id === chapter.seriesId);
    if (series) {
      setSelectedSeries(series);
      setSelectedSeriesChapter(chapter);
      setEpisodeManagerOpen(true);
    } else {
      toast.error("Series data not found");
    }
  };

  // Save episodes from episode manager
  const handleSaveEpisodes = async (updatedEpisodes) => {
    if (!selectedSeries) return;

    try {
      const seriesRef = doc(db, "series", selectedSeries.id);
      await updateDoc(seriesRef, {
        episodes: updatedEpisodes,
        updatedAt: new Date().toISOString()
      });

      // Also update the chapter data
      const seriesChapter = chapters.find(c => c.chapterId === selectedSeriesChapter.chapterId);
      if (seriesChapter) {
        const updatedChapters = chapters.map(c => {
          if (c.chapterId === seriesChapter.chapterId) {
            return {
              ...c,
              seriesData: {
                ...c.seriesData,
                episodeCount: updatedEpisodes.length
              }
            };
          }
          return c;
        });
        
        await updateChaptersInFirestore(updatedChapters);
        setChapters(updatedChapters);
      }
      
      toast.success("Episodes updated successfully!");
    } catch (error) {
      console.error("Error saving episodes:", error);
      toast.error("Failed to save episodes");
      throw error;
    }
  };

  // Add a new upload to active uploads
  const addActiveUpload = (file, type) => {
    const uploadId = Date.now() + Math.random();
    setActiveUploads(prev => [...prev, {
      id: uploadId,
      file,
      type,
      progress: 0,
      status: 'uploading'
    }]);
    return uploadId;
  };

  // Update upload progress
  const updateUploadProgress = (uploadId, progress, status) => {
    setActiveUploads(prev => prev.map(upload => 
      upload.id === uploadId ? { ...upload, progress, status } : upload
    ));
  };

  // Remove completed upload
  const removeUpload = (uploadId) => {
    setActiveUploads(prev => prev.filter(upload => upload.id !== uploadId));
  };

  const addEpisodeToSeries = () => {
    if (!newEpisodeTitle) {
      toast.error("Please enter episode title");
      return;
    }

    if (!newEpisodeVideoURL && !newEpisodeVideoFile) {
      toast.error("Please add video URL or upload video file");
      return;
    }

    const newEpisode = {
      id: Date.now(), // Temporary ID
      title: newEpisodeTitle,
      description: newEpisodeDescription,
      videoUrl: newEpisodeVideoURL,
      videoFile: newEpisodeVideoFile,
      thumbnailUrl: newEpisodeThumbnailURL,
      thumbnailFile: newEpisodeThumbnail,
      duration: newEpisodeDuration,
      order: episodes.length,
      createdAt: new Date().toISOString(),
      videoUploaded: !!newEpisodeVideoURL && !newEpisodeVideoFile, // If URL provided or file already uploaded
      thumbnailUploaded: !!newEpisodeThumbnailURL && !newEpisodeThumbnail,
    };

    setEpisodes([...episodes, newEpisode]);
    
    // Reset episode form
    setNewEpisodeTitle("");
    setNewEpisodeDescription("");
    setNewEpisodeVideoFile(null);
    setNewEpisodeVideoURL("");
    setNewEpisodeThumbnail(null);
    setNewEpisodeThumbnailURL("");
    setNewEpisodeDuration("");
    
    toast.success("Episode added! Upload files if needed.");
  };

  const removeEpisode = (index) => {
    const updatedEpisodes = [...episodes];
    updatedEpisodes.splice(index, 1);
    // Reorder episodes
    const reordered = updatedEpisodes.map((ep, i) => ({ ...ep, order: i }));
    setEpisodes(reordered);
  };

  // Image upload (used in text tab)
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const uploadId = addActiveUpload(file, 'text-image');
    toast.info("Uploading image...");

    try {
      const url = await BunnyUploader.upload(file, (progress) => {
        updateUploadProgress(uploadId, progress, 'uploading');
      });

      setContentBlocks((prev) => [
        ...prev,
        {
          type: "image",
          url,
        },
      ]);

      updateUploadProgress(uploadId, 100, 'completed');
      setTimeout(() => removeUpload(uploadId), 2000);
      
      toast.dismiss();
      toast.success("Image added!");
    } catch (err) {
      updateUploadProgress(uploadId, 0, 'error');
      toast.dismiss();
      toast.error("Image upload failed");
      console.error(err);
    }
  };

  // Series thumbnail upload
  const handleSeriesThumbnailUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSeriesThumbnail(file);
    setSeriesThumbnailUploaded(false);
    
    const uploadId = addActiveUpload(file, 'series-thumbnail');
    toast.info("Uploading series thumbnail...");

    try {
      const url = await BunnyUploader.upload(file, (progress) => {
        updateUploadProgress(uploadId, progress, 'uploading');
      });

      setSeriesThumbnailURL(url);
      setSeriesThumbnailUploaded(true);
      updateUploadProgress(uploadId, 100, 'completed');
      setTimeout(() => removeUpload(uploadId), 2000);
      
      toast.dismiss();
      toast.success("Series thumbnail uploaded!");
    } catch (err) {
      updateUploadProgress(uploadId, 0, 'error');
      toast.dismiss();
      toast.error("Thumbnail upload failed");
      console.error(err);
    }
  };

  // Episode thumbnail upload
  const handleEpisodeThumbnailUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setNewEpisodeThumbnail(file);
    
    const uploadId = addActiveUpload(file, 'episode-thumbnail');
    toast.info("Uploading episode thumbnail...");

    try {
      const url = await BunnyUploader.upload(file, (progress) => {
        updateUploadProgress(uploadId, progress, 'uploading');
      });

      setNewEpisodeThumbnailURL(url);
      updateUploadProgress(uploadId, 100, 'completed');
      setTimeout(() => removeUpload(uploadId), 2000);
      
      toast.dismiss();
      toast.success("Episode thumbnail uploaded!");
    } catch (err) {
      updateUploadProgress(uploadId, 0, 'error');
      toast.dismiss();
      toast.error("Thumbnail upload failed");
      console.error(err);
    }
  };

  // Episode video upload
  const handleEpisodeVideoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setNewEpisodeVideoFile(file);
    
    const uploadId = addActiveUpload(file, 'episode-video');
    toast.info("Uploading episode video...");

    try {
      const url = await BunnyUploader.upload(file, (progress) => {
        updateUploadProgress(uploadId, progress, 'uploading');
      });

      setNewEpisodeVideoURL(url);
      updateUploadProgress(uploadId, 100, 'completed');
      setTimeout(() => removeUpload(uploadId), 2000);
      
      toast.dismiss();
      toast.success("Episode video uploaded!");
    } catch (err) {
      updateUploadProgress(uploadId, 0, 'error');
      toast.dismiss();
      toast.error("Video upload failed");
      console.error(err);
    }
  };

  // Series trailer upload
  const handleTrailerUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setTrailerFile(file);
    setTrailerUploaded(false);
    
    const uploadId = addActiveUpload(file, 'trailer');
    toast.info("Uploading trailer...");

    try {
      const url = await BunnyUploader.upload(file, (progress) => {
        updateUploadProgress(uploadId, progress, 'uploading');
      });

      setTrailerURL(url);
      setTrailerUploaded(true);
      updateUploadProgress(uploadId, 100, 'completed');
      setTimeout(() => removeUpload(uploadId), 2000);
      
      toast.dismiss();
      toast.success("Trailer uploaded!");
    } catch (err) {
      updateUploadProgress(uploadId, 0, 'error');
      toast.dismiss();
      toast.error("Trailer upload failed");
      console.error(err);
    }
  };

  // Check if all required uploads are completed
  const checkUploadsComplete = () => {
    // Check series thumbnail
    if (seriesThumbnail && !seriesThumbnailUploaded) {
      toast.error("Series thumbnail is still uploading");
      return false;
    }
    
    // Check trailer
    if (trailerFile && !trailerUploaded) {
      toast.error("Trailer is still uploading");
      return false;
    }
    
    // Check episodes
    for (let i = 0; i < episodes.length; i++) {
      const episode = episodes[i];
      if (episode.videoFile && !episode.videoUploaded) {
        toast.error(`Episode "${episode.title}" video is still uploading`);
        return false;
      }
      if (episode.thumbnailFile && !episode.thumbnailUploaded) {
        toast.error(`Episode "${episode.title}" thumbnail is still uploading`);
        return false;
      }
    }
    
    // Check active uploads
    if (activeUploads.some(upload => upload.status === 'uploading')) {
      toast.error("Some files are still uploading. Please wait...");
      return false;
    }
    
    return true;
  };

  // Upload a single file with progress tracking
  const uploadFileWithProgress = async (file, fileType) => {
    return new Promise((resolve, reject) => {
      const uploadId = addActiveUpload(file, fileType);
      
      BunnyUploader.upload(file, (progress) => {
        updateUploadProgress(uploadId, progress, 'uploading');
      })
        .then(url => {
          updateUploadProgress(uploadId, 100, 'completed');
          setTimeout(() => removeUpload(uploadId), 1000);
          resolve(url);
        })
        .catch(err => {
          updateUploadProgress(uploadId, 0, 'error');
          reject(err);
        });
    });
  };

  // Utility: split chapters by type
  const audioChapters = chapters.filter((c) => c.chapterType === "audio");
  const textChapters = chapters.filter((c) => c.chapterType === "text");
  const seriesChapters = chapters.filter((c) => c.chapterType === "series");

  // ---------- SUBMIT for AUDIO tab ----------
  const handleSubmitAudio = async () => {
    if (!audioFormTitle) return toast.error("Please enter chapter title");

    let finalAudioURL = audioURL;

    // upload audio if provided
    if (audioFile) {
      toast.info("Uploading audio...");
      setIsUploadingSeries(true);
      try {
        finalAudioURL = await uploadFileWithProgress(audioFile, 'audio');
        setAudioURL(finalAudioURL);
      } catch (err) {
        toast.error("Audio upload failed");
        setIsUploadingSeries(false);
        return;
      }
      setIsUploadingSeries(false);
    }

    const isEditing = editingId !== null && editingId !== undefined;
    const nextId =
      isEditing
        ? editingId
        : chapters.length > 0
        ? Math.max(...chapters.map((c) => c.chapterId)) + 1
        : 0;

    const baseChapter = {
      chapterId: nextId,
      chapterName: audioFormTitle,
      chapterType: "audio",
    };

    const typeFields = {
      isDownloadable: true,
      chapterUrl: finalAudioURL || "",
      contentBlocks: [],
      textContent: "",
    };

    const newChapter = {
      ...baseChapter,
      ...typeFields,
    };

    let updated = [...chapters];

    if (isEditing) {
      const index = updated.findIndex((c) => c.chapterId === editingId);
      if (index === -1) {
        updated.push(newChapter);
      } else {
        const original = updated[index];
        const merged = {
          ...original,
          ...newChapter,
          chapterId: original.chapterId,
          order: original.order,
          isFree: original.isFree,
          isLocked: original.isLocked,
        };
        updated[index] = merged;
      }
    } else {
      updated.push({
        ...newChapter,
        order: chapters.length,
        isFree: chapters.length === 0,
        isLocked: chapters.length !== 0,
      });
    }

    // After change, re-index: put audio chapters first (so audio tab shows top), then text chapters.
    const newAudio = updated.filter((c) => c.chapterType === "audio");
    const newText = updated.filter((c) => c.chapterType !== "audio"); // text and others

    const normalized = [...newAudio, ...newText]
      .map((c, i) => ({
        ...c,
        order: i,
      }));

    await updateChaptersInFirestore(normalized);
    toast.success(isEditing ? "Audio chapter updated" : "Audio chapter added!");

    // reset audio form
    setAudioFormTitle("");
    setAudioURL("");
    setAudioFile(null);
    setEditingId(null);
  };

  // ---------- SUBMIT for TEXT tab ----------
  const handleSubmitText = async () => {
    if (!textFormTitle) return toast.error("Please enter chapter title");

    const isEditing = editingId !== null && editingId !== undefined;
    const nextId =
      isEditing
        ? editingId
        : chapters.length > 0
        ? Math.max(...chapters.map((c) => c.chapterId)) + 1
        : 0;

    const baseChapter = {
      chapterId: nextId,
      chapterName: textFormTitle,
      chapterType: "text",
    };

    const typeFields = {
      isDownloadable: false,
      chapterUrl: "",
      contentBlocks: contentBlocks,
      textContent: contentBlocks
        .filter((b) => b.type === "paragraph")
        .map((b) => b.content)
        .join("\n"),
    };

    const newChapter = {
      ...baseChapter,
      ...typeFields,
    };

    let updated = [...chapters];

    if (isEditing) {
      const index = updated.findIndex((c) => c.chapterId === editingId);
      if (index === -1) {
        updated.push(newChapter);
      } else {
        const original = updated[index];
        const merged = {
          ...original,
          ...newChapter,
          chapterId: original.chapterId,
          order: original.order,
          isFree: original.isFree,
          isLocked: original.isLocked,
        };
        updated[index] = merged;
      }
    } else {
      updated.push({
        ...newChapter,
        order: chapters.length,
        isFree: chapters.length === 0,
        isLocked: chapters.length !== 0,
      });
    }

    // Re-index: Put audio chapters first then text chapters, to keep a predictable ordering
    const newAudio = updated.filter((c) => c.chapterType === "audio");
    const newText = updated.filter((c) => c.chapterType !== "audio");

    const normalized = [...newAudio, ...newText]
      .map((c, i) => ({
        ...c,
        order: i,
      }));

    await updateChaptersInFirestore(normalized);
    toast.success(isEditing ? "Text chapter updated" : "Text chapter added!");

    // reset text form
    setTextFormTitle("");
    setTextContent("");
    setContentBlocks([]);
    setEditingId(null);
  };

  // ---------- SUBMIT for SERIES tab ----------
  const handleSubmitSeries = async () => {
    // Validation
    if (!seriesFormTitle) return toast.error("Please enter series title");
    if (!seriesDescription) return toast.error("Please enter series description");
    if (episodes.length === 0) return toast.error("Please add at least one episode");
    
    // Check if uploads are complete
    if (!checkUploadsComplete()) {
      return;
    }

    setIsUploadingSeries(true);
    setUploadProgress(0);

    try {
      // Upload series thumbnail if provided as file
      let finalThumbnailURL = seriesThumbnailURL;
      if (seriesThumbnail && !seriesThumbnailURL.startsWith('http')) {
        toast.info("Uploading series thumbnail...");
        finalThumbnailURL = await uploadFileWithProgress(seriesThumbnail, 'series-thumbnail');
        setUploadProgress(20);
      }

      // Upload trailer if provided as file
      let finalTrailerURL = trailerURL;
      if (trailerFile && !trailerURL.startsWith('http')) {
        toast.info("Uploading trailer...");
        finalTrailerURL = await uploadFileWithProgress(trailerFile, 'trailer');
        setUploadProgress(40);
      }

      // Upload all episode videos and thumbnails
      const processedEpisodes = [];
      const totalEpisodes = episodes.length;
      
      for (let i = 0; i < totalEpisodes; i++) {
        const episode = episodes[i];
        let episodeVideoUrl = episode.videoUrl;
        let episodeThumbnailUrl = episode.thumbnailUrl;

        // Calculate progress
        const episodeProgress = 40 + (i / totalEpisodes) * 50;

        // Upload episode video if file is provided and not already a URL
        if (episode.videoFile && !episode.videoUrl.startsWith('http')) {
          toast.info(`Uploading episode ${i + 1} video...`);
          episodeVideoUrl = await uploadFileWithProgress(episode.videoFile, 'episode-video');
          setUploadProgress(episodeProgress);
        }

        // Upload episode thumbnail if file is provided and not already a URL
        if (episode.thumbnailFile && !episode.thumbnailUrl.startsWith('http')) {
          toast.info(`Uploading episode ${i + 1} thumbnail...`);
          episodeThumbnailUrl = await uploadFileWithProgress(episode.thumbnailFile, 'episode-thumbnail');
          setUploadProgress(episodeProgress + 5);
        }

        processedEpisodes.push({
          id: episode.id,
          title: episode.title,
          description: episode.description,
          videoUrl: episodeVideoUrl,
          thumbnailUrl: episodeThumbnailUrl,
          duration: episode.duration,
          order: episode.order,
          createdAt: episode.createdAt,
        });
      }

      setUploadProgress(95);

      const seriesData = {
        title: seriesFormTitle,
        description: seriesDescription,
        trailerUrl: finalTrailerURL,
        thumbnailUrl: finalThumbnailURL,
        episodes: processedEpisodes,
        bookId: selectedBookId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Add series to Firestore in 'series' collection
      const seriesRef = await addDoc(collection(db, "series"), seriesData);
      
      // Also add as a chapter in the audiobook
      const isEditing = editingId !== null && editingId !== undefined;
      const nextId =
        isEditing
          ? editingId
          : chapters.length > 0
          ? Math.max(...chapters.map((c) => c.chapterId)) + 1
          : 0;

      const seriesChapter = {
        chapterId: nextId,
        chapterName: seriesFormTitle,
        chapterType: "series",
        seriesId: seriesRef.id, // Reference to the series document
        isDownloadable: false,
        chapterUrl: "",
        contentBlocks: [],
        textContent: "",
        seriesData: {
          title: seriesFormTitle,
          description: seriesDescription,
          episodeCount: episodes.length,
        },
      };

      let updated = [...chapters];

      if (isEditing) {
        const index = updated.findIndex((c) => c.chapterId === editingId);
        if (index === -1) {
          updated.push(seriesChapter);
        } else {
          const original = updated[index];
          const merged = {
            ...original,
            ...seriesChapter,
            chapterId: original.chapterId,
            order: original.order,
            isFree: original.isFree,
            isLocked: original.isLocked,
          };
          updated[index] = merged;
        }
      } else {
        updated.push({
          ...seriesChapter,
          order: chapters.length,
          isFree: chapters.length === 0,
          isLocked: chapters.length !== 0,
        });
      }

      // Re-index chapters
      const normalized = updated.map((c, i) => ({ ...c, order: i }));
      await updateChaptersInFirestore(normalized);

      setUploadProgress(100);
      
      // Small delay to show completion
      await new Promise(resolve => setTimeout(resolve, 500));
      
      toast.success(isEditing ? "Series updated!" : "Series added!");
      
      // Reset form
      resetSeriesForm();
      setEditingId(null);
    } catch (error) {
      console.error("Error adding series:", error);
      toast.error("Failed to add series: " + error.message);
    } finally {
      setIsUploadingSeries(false);
      setUploadProgress(0);
    }
  };

  // Reset series form
  const resetSeriesForm = () => {
    setSeriesFormTitle("");
    setSeriesDescription("");
    setTrailerFile(null);
    setTrailerURL("");
    setTrailerUploaded(false);
    setSeriesThumbnail(null);
    setSeriesThumbnailURL("");
    setSeriesThumbnailUploaded(false);
    setEpisodes([]);
    setNewEpisodeTitle("");
    setNewEpisodeDescription("");
    setNewEpisodeVideoFile(null);
    setNewEpisodeVideoURL("");
    setNewEpisodeThumbnail(null);
    setNewEpisodeThumbnailURL("");
    setNewEpisodeDuration("");
    setActiveUploads([]);
  };

  // Reset all forms
  const resetAllForms = () => {
    setAudioFormTitle("");
    setAudioURL("");
    setAudioFile(null);

    setTextFormTitle("");
    setTextContent("");
    setContentBlocks([]);

    resetSeriesForm();
    setEditingId(null);
  };

  // Edit handler sets the right form according to chapter type and opens corresponding tab
  const handleEdit = (chapter) => {
    setEditingId(chapter.chapterId);

    if (chapter.chapterType === "audio") {
      // populate audio form
      setAudioFormTitle(chapter.chapterName);
      setAudioURL(chapter.chapterUrl || "");
      setAudioFile(null);

      // clear other forms
      resetSeriesForm();
      setTextFormTitle("");
      setTextContent("");
      setContentBlocks([]);

      // switch to audio tab
      setActiveTab("audio");
    } else if (chapter.chapterType === "text") {
      // populate text form
      setTextFormTitle(chapter.chapterName);
      setContentBlocks(chapter.contentBlocks || []);
      setTextContent(chapter.textContent || "");

      // clear other forms
      resetSeriesForm();
      setAudioFormTitle("");
      setAudioURL("");
      setAudioFile(null);

      // switch to text tab
      setActiveTab("text");
    } else if (chapter.chapterType === "series") {
      // Find series data from series collection
      const series = seriesCollection.find(s => s.id === chapter.seriesId);
      if (series) {
        // populate series form
        setSeriesFormTitle(series.title);
        setSeriesDescription(series.description);
        setTrailerURL(series.trailerUrl || "");
        setTrailerUploaded(true);
        setSeriesThumbnailURL(series.thumbnailUrl || "");
        setSeriesThumbnailUploaded(true);
        setEpisodes(series.episodes || []);

        // clear other forms
        setAudioFormTitle("");
        setAudioURL("");
        setAudioFile(null);
        setTextFormTitle("");
        setTextContent("");
        setContentBlocks([]);

        // switch to series tab
        setActiveTab("series");
      } else {
        toast.error("Series data not found");
      }
    }
  };

  const handleDelete = async (id) => {
    const chapterToDelete = chapters.find(c => c.chapterId === id);
    
    // If it's a series chapter, also delete from series collection
    if (chapterToDelete?.chapterType === "series" && chapterToDelete?.seriesId) {
      try {
        await deleteDoc(doc(db, "series", chapterToDelete.seriesId));
        toast.success("Series deleted from collection");
      } catch (error) {
        console.error("Error deleting series:", error);
      }
    }
    
    const updated = chapters.filter((c) => c.chapterId !== id);
    const normalized = updated
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((c, i) => ({ ...c, order: i }));

    await updateChaptersInFirestore(normalized);
    setChapters(normalized);
    toast.success("Chapter deleted");
  };

  const handleToggleLock = async (id) => {
    const updated = chapters.map((c) =>
      c.chapterId === id ? { ...c, isLocked: !c.isLocked } : c
    );

    await updateChaptersInFirestore(updated);
    setChapters(updated);
  };

  // Drag end for audio list: reorder audio chapters, then combine with text chapters and reindex
  const handleDragEndAudio = async ({ active, over }) => {
    if (!over || active.id === over.id) return;

    const oldIdx = audioChapters.findIndex((c) => c.chapterId === active.id);
    const newIdx = audioChapters.findIndex((c) => c.chapterId === over.id);

    const reorderedAudio = arrayMove(audioChapters, oldIdx, newIdx).map((c, i) => ({
      ...c,
      // temporary order within audio group (will be normalized below)
      __audioIndex: i,
    }));

    const other = chapters.filter((c) => c.chapterType !== "audio");

    // Combine audio first then others (text)
    const combined = [
      ...reorderedAudio.map((c) => {
        const { __audioIndex, ...rest } = c;
        return rest;
      }),
      ...other,
    ];

    const normalized = combined.map((c, i) => ({ ...c, order: i }));

    await updateChaptersInFirestore(normalized);
    setChapters(normalized);
  };

  // Drag end for text list: reorder text chapters, then combine audio first then text and reindex
  const handleDragEndText = async ({ active, over }) => {
    if (!over || active.id === over.id) return;

    const oldIdx = textChapters.findIndex((c) => c.chapterId === active.id);
    const newIdx = textChapters.findIndex((c) => c.chapterId === over.id);

    const reorderedText = arrayMove(textChapters, oldIdx, newIdx).map((c, i) => ({
      ...c,
      __textIndex: i,
    }));

    const audio = chapters.filter((c) => c.chapterType === "audio");
    const series = chapters.filter((c) => c.chapterType === "series");

    const combined = [
      ...audio,
      ...reorderedText.map((c) => {
        const { __textIndex, ...rest } = c;
        return rest;
      }),
      ...series,
    ];

    const normalized = combined.map((c, i) => ({ ...c, order: i }));

    await updateChaptersInFirestore(normalized);
    setChapters(normalized);
  };

  // Render
  return (
    <div className="p-4 sm:p-6 max-w-full mx-auto">
      <h1 className="text-2xl sm:text-3xl font-bold mb-5 text-center sm:text-left">
        📚 Chapter Manager
      </h1>

      {/* Book selector */}
      <div className="bg-white p-4 sm:p-5 rounded-lg shadow mb-5">
        <label className="font-semibold block mb-2">Select Audiobook</label>
        <select
          className="w-full p-3 rounded border"
          value={selectedBookId}
          onChange={(e) => {
            setSelectedBookId(e.target.value);
            // reset forms when switching books
            resetAllForms();
          }}
        >
          <option value="">-- Choose Audiobook --</option>
          {books.map((b) => (
            <option key={b.id} value={b.id}>
              {b.title}
            </option>
          ))}
        </select>
      </div>

      {/* Tabs */}
      {selectedBookId && (
        <div className="mb-6">
          <div className="flex gap-3">
            <button
              onClick={() => setActiveTab("audio")}
              className={`flex-1 py-3 rounded-lg shadow-sm focus:outline-none transform active:scale-98 transition-all ${
                activeTab === "audio"
                  ? "bg-red-600 text-white"
                  : "bg-white border"
              }`}
            >
              <div className="flex items-center justify-center gap-3">
                <MdAudiotrack />
                <div className="text-sm sm:text-base text-left">
                  <div className="font-semibold">🎧 Audio Chapters</div>
                  <div className="text-xs text-white/80">
                    Add & manage audio chapters
                  </div>
                </div>
              </div>
            </button>

            <button
              onClick={() => setActiveTab("text")}
              className={`flex-1 py-3 rounded-lg shadow-sm focus:outline-none transform active:scale-98 transition-all ${
                activeTab === "text" ? "bg-red-600 text-white" : "bg-white border"
              }`}
            >
              <div className="flex items-center justify-center gap-3">
                <MdTextFields />
                <div className="text-sm sm:text-base text-left">
                  <div className="font-semibold">📖 Text Chapters</div>
                  <div className="text-xs text-white/80">
                    Add & manage text chapters
                  </div>
                </div>
              </div>
            </button>

            <button
              onClick={() => setActiveTab("series")}
              className={`flex-1 py-3 rounded-lg shadow-sm focus:outline-none transform active:scale-98 transition-all ${
                activeTab === "series" ? "bg-red-600 text-white" : "bg-white border"
              }`}
            >
              <div className="flex items-center justify-center gap-3">
                <MdLocalMovies />
                <div className="text-sm sm:text-base text-left">
                  <div className="font-semibold">🎬 Series</div>
                  <div className="text-xs text-white/80">
                    Add & manage series with episodes
                  </div>
                </div>
              </div>
            </button>
          </div>

          {/* Active uploads indicator */}
          {activeUploads.length > 0 && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-700 mb-2 flex items-center gap-2">
                <FiUpload className="animate-pulse" />
                Uploads in Progress ({activeUploads.filter(u => u.status === 'uploading').length})
              </h4>
              <div className="space-y-2">
                {activeUploads.map(upload => (
                  <UploadProgress 
                    key={upload.id}
                    file={upload.file}
                    progress={upload.progress}
                    status={upload.status}
                  />
                ))}
              </div>
              <p className="text-xs text-blue-600 mt-2">
                Please wait for all uploads to complete before saving.
              </p>
            </div>
          )}

          {/* Episode Manager Modal */}
          <EpisodeManagerModal
            isOpen={episodeManagerOpen}
            onClose={() => {
              setEpisodeManagerOpen(false);
              setSelectedSeries(null);
              setSelectedSeriesChapter(null);
            }}
            series={selectedSeries}
            onSave={handleSaveEpisodes}
          />

          {/* Tab content */}
          <div className="mt-5">
            {/* AUDIO TAB */}
            {activeTab === "audio" && (
              <div>
                {/* Add / Edit Audio Form */}
                <div className="bg-white p-4 sm:p-5 rounded-lg shadow mb-5 border">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">
                      {editingId !== null && chapters.find(c => c.chapterId === editingId && c.chapterType === 'audio') ? "✏️ Edit Audio Chapter" : "➕ Add Audio Chapter"}
                    </h2>

                    <div className="text-sm text-gray-500">
                      Helpful: add audio file or paste a URL.
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="font-semibold block mb-1">Title</label>
                      <input
                        className="w-full p-3 rounded border"
                        placeholder="Chapter title"
                        value={audioFormTitle}
                        onChange={(e) => setAudioFormTitle(e.target.value)}
                      />
                    </div>

                    <div className="sm:col-span-2 bg-gray-50 p-3 rounded border">
                      <label className="font-semibold block mb-2">Audio</label>
                      <input
                        type="file"
                        accept="audio/*"
                        onChange={(e) => setAudioFile(e.target.files[0])}
                        className="w-full mb-3 p-2 rounded border"
                      />
                      <input
                        className="w-full p-2 rounded border"
                        placeholder="Or paste audio URL"
                        value={audioURL}
                        onChange={(e) => setAudioURL(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={handleSubmitAudio}
                      disabled={isUploadingSeries}
                      className={`px-5 py-3 rounded w-full sm:w-auto flex items-center justify-center gap-2 ${
                        isUploadingSeries 
                          ? 'bg-gray-400 cursor-not-allowed' 
                          : 'bg-red-600 text-white hover:bg-red-700'
                      }`}
                    >
                      {isUploadingSeries ? (
                        <>
                          <FiLoader className="animate-spin" />
                          Uploading...
                        </>
                      ) : editingId !== null && chapters.find(c => c.chapterId === editingId && c.chapterType === 'audio') ? (
                        "Update Audio"
                      ) : (
                        "Add Audio"
                      )}
                    </button>

                    {(editingId !== null) && (
                      <button
                        onClick={() => resetAllForms()}
                        className="bg-gray-500 text-white px-5 py-3 rounded w-full sm:w-auto"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>

                {/* Audio list */}
                <div>
                  <h3 className="font-semibold mb-3">All Audio Chapters</h3>

                  {audioChapters.length === 0 ? (
                    <div className="text-sm text-gray-500">No audio chapters yet.</div>
                  ) : (
                    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEndAudio}>
                      <SortableContext
                        items={audioChapters.map((c) => c.chapterId)}
                        strategy={verticalListSortingStrategy}
                      >
                        {audioChapters.map((ch) => (
                          <SortableItem
                            key={ch.chapterId}
                            chapter={ch}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onToggleLock={handleToggleLock}
                            onManageEpisodes={() => {}}
                          />
                        ))}
                      </SortableContext>
                    </DndContext>
                  )}
                </div>
              </div>
            )}

            {/* TEXT TAB */}
            {activeTab === "text" && (
              <div>
                {/* Add / Edit Text Form */}
                <div className="bg-white p-4 sm:p-5 rounded-lg shadow mb-5 border">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">
                      {editingId !== null && chapters.find(c => c.chapterId === editingId && c.chapterType === 'text') ? "✏️ Edit Text Chapter" : "➕ Add Text Chapter"}
                    </h2>

                    <div className="text-sm text-gray-500">
                      Pasted text keeps exact formatting (spaces & line breaks).
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="font-semibold block mb-1">Title</label>
                    <input
                      className="w-full p-3 rounded border mb-3"
                      placeholder="Chapter title"
                      value={textFormTitle}
                      onChange={(e) => setTextFormTitle(e.target.value)}
                    />

                    <label className="font-semibold block mb-1">Text / Paragraph</label>
                    <textarea
                      placeholder="Write or paste text exactly as you want it to appear..."
                      value={textContent}
                      onChange={(e) => setTextContent(e.target.value)}
                      className="w-full p-3 rounded border mb-3"
                      rows={6}
                    />

                    <div className="flex flex-col sm:flex-row gap-2 mb-3">
                      <button
                        onClick={() => {
                          if (!textContent) return toast.error("Empty paragraph");
                          // preserve text exactly
                          setContentBlocks([...contentBlocks, { type: "paragraph", content: textContent }]);
                          setTextContent("");
                        }}
                        className="bg-red-600 text-white px-4 py-2 rounded"
                      >
                        Add Paragraph
                      </button>

                      <div>
                        <input
                          id="inlineImageInput2"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageUpload}
                        />
                        <button
                          onClick={() => document.getElementById("inlineImageInput2").click()}
                          className="bg-blue-600 text-white px-4 py-2 rounded"
                        >
                          Add Image
                        </button>
                      </div>
                    </div>

                    {/* preview */}
                    {contentBlocks.length > 0 ? (
                      <div className="bg-white border rounded p-3 mt-2">
                        <h4 className="font-semibold mb-2">Preview</h4>

                        <div className="space-y-3">
                          {contentBlocks.map((block, idx) => (
                            <div key={idx} className="p-3 border rounded bg-gray-50 relative">
                              {block.type === "paragraph" && (
                                <pre className="whitespace-pre-wrap" style={{ margin: 0, fontFamily: "inherit" }}>
                                  {block.content}
                                </pre>
                              )}

                              {block.type === "image" && (
                                <img src={block.url} alt={`inline-${idx}`} className="w-full rounded-lg" />
                              )}

                              <button
                                className="absolute top-2 right-2 text-sm text-red-600 font-semibold"
                                onClick={() => {
                                  const updated = [...contentBlocks];
                                  updated.splice(idx, 1);
                                  setContentBlocks(updated);
                                }}
                              >
                                ✖ Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500 mt-2">No content added yet.</div>
                    )}
                  </div>

                  <div className="mt-4 flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={handleSubmitText}
                      className="bg-green-600 text-white px-5 py-3 rounded w-full sm:w-auto"
                    >
                      {editingId !== null && chapters.find(c => c.chapterId === editingId && c.chapterType === 'text') ? "Update Text" : "Add Text"}
                    </button>

                    {(editingId !== null) && (
                      <button
                        onClick={() => resetAllForms()}
                        className="bg-gray-500 text-white px-5 py-3 rounded w-full sm:w-auto"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>

                {/* Text chapter list */}
                <div>
                  <h3 className="font-semibold mb-3">All Text Chapters</h3>

                  {textChapters.length === 0 ? (
                    <div className="text-sm text-gray-500">No text chapters yet.</div>
                  ) : (
                    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEndText}>
                      <SortableContext
                        items={textChapters.map((c) => c.chapterId)}
                        strategy={verticalListSortingStrategy}
                      >
                        {textChapters.map((ch) => (
                          <SortableItem
                            key={ch.chapterId}
                            chapter={ch}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onToggleLock={handleToggleLock}
                            onManageEpisodes={() => {}}
                          />
                        ))}
                      </SortableContext>
                    </DndContext>
                  )}
                </div>
              </div>
            )}

            {/* SERIES TAB */}
            {activeTab === "series" && (
              <div>
                {/* Add / Edit Series Form */}
                <div className="bg-white p-4 sm:p-5 rounded-lg shadow mb-5 border">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold">
                        {editingId !== null && chapters.find(c => c.chapterId === editingId && c.chapterType === 'series') ? "✏️ Edit Series" : "➕ Add New Series"}
                      </h2>
                      <UploadIndicator 
                        isUploading={isUploadingSeries} 
                        progress={uploadProgress} 
                      />
                    </div>

                    <div className="text-sm text-gray-500">
                      Create series with multiple episodes, like Netflix.
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Series Basic Info */}
                    <div className="md:col-span-2">
                      <h3 className="font-semibold mb-3 text-lg">Series Information</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="font-semibold block mb-1">Series Title *</label>
                          <input
                            className="w-full p-3 rounded border"
                            placeholder="Enter series title"
                            value={seriesFormTitle}
                            onChange={(e) => setSeriesFormTitle(e.target.value)}
                            disabled={isUploadingSeries}
                          />
                        </div>

                        <div>
                          <label className="font-semibold block mb-1">Series Description *</label>
                          <textarea
                            className="w-full p-3 rounded border"
                            placeholder="Enter series description"
                            rows={4}
                            value={seriesDescription}
                            onChange={(e) => setSeriesDescription(e.target.value)}
                            disabled={isUploadingSeries}
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="font-semibold block mb-2">
                              Series Thumbnail
                              {seriesThumbnail && !seriesThumbnailUploaded && (
                                <span className="ml-2 text-xs text-orange-600 animate-pulse">(Uploading...)</span>
                              )}
                            </label>
                            <div className="bg-gray-50 p-3 rounded border">
                              <input
                                ref={seriesThumbnailRef}
                                type="file"
                                accept="image/*"
                                onChange={handleSeriesThumbnailUpload}
                                className="w-full mb-3 p-2 rounded border"
                                disabled={isUploadingSeries}
                              />
                              <input
                                className="w-full p-2 rounded border"
                                placeholder="Or paste thumbnail URL"
                                value={seriesThumbnailURL}
                                onChange={(e) => {
                                  setSeriesThumbnailURL(e.target.value);
                                  setSeriesThumbnailUploaded(true);
                                }}
                                disabled={isUploadingSeries}
                              />
                              {seriesThumbnailURL && (
                                <div className="mt-2">
                                  <img src={seriesThumbnailURL} alt="Series thumbnail preview" className="w-32 h-32 object-cover rounded" />
                                  {seriesThumbnailUploaded && (
                                    <div className="text-xs text-green-600 mt-1 flex items-center gap-1">
                                      <MdCheckCircle />
                                      Ready for saving
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          <div>
                            <label className="font-semibold block mb-2">
                              Trailer
                              {trailerFile && !trailerUploaded && (
                                <span className="ml-2 text-xs text-orange-600 animate-pulse">(Uploading...)</span>
                              )}
                            </label>
                            <div className="bg-gray-50 p-3 rounded border">
                              <input
                                ref={trailerRef}
                                type="file"
                                accept="video/*"
                                onChange={handleTrailerUpload}
                                className="w-full mb-3 p-2 rounded border"
                                disabled={isUploadingSeries}
                              />
                              <input
                                className="w-full p-2 rounded border"
                                placeholder="Or paste trailer URL"
                                value={trailerURL}
                                onChange={(e) => {
                                  setTrailerURL(e.target.value);
                                  setTrailerUploaded(true);
                                }}
                                disabled={isUploadingSeries}
                              />
                              {trailerURL && (
                                <div className="mt-2">
                                  <div className="flex items-center gap-2 text-sm">
                                    <MdPlayCircle className="text-blue-600" />
                                    <span>Trailer URL {trailerUploaded ? 'ready' : 'uploading...'}</span>
                                    {trailerUploaded && (
                                      <MdCheckCircle className="text-green-600" />
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Episodes Section */}
                    <div className="md:col-span-2 mt-6">
                      <h3 className="font-semibold mb-3 text-lg">Episodes</h3>
                      
                      {/* Add Episode Form */}
                      <div className="bg-gray-50 p-4 rounded-lg border mb-4">
                        <h4 className="font-semibold mb-3">Add New Episode</h4>
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="font-semibold block mb-1">Episode Title *</label>
                              <input
                                className="w-full p-2 rounded border"
                                placeholder="Episode title"
                                value={newEpisodeTitle}
                                onChange={(e) => setNewEpisodeTitle(e.target.value)}
                                disabled={isUploadingSeries}
                              />
                            </div>
                            <div>
                              <label className="font-semibold block mb-1">Duration (optional)</label>
                              <input
                                className="w-full p-2 rounded border"
                                placeholder="e.g., 45:30"
                                value={newEpisodeDuration}
                                onChange={(e) => setNewEpisodeDuration(e.target.value)}
                                disabled={isUploadingSeries}
                              />
                            </div>
                          </div>

                          <div>
                            <label className="font-semibold block mb-1">Episode Description</label>
                            <textarea
                              className="w-full p-2 rounded border"
                              placeholder="Episode description"
                              rows={3}
                              value={newEpisodeDescription}
                              onChange={(e) => setNewEpisodeDescription(e.target.value)}
                              disabled={isUploadingSeries}
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="font-semibold block mb-2">Episode Video *</label>
                              <div className="space-y-2">
                                <input
                                  ref={episodeVideoRef}
                                  type="file"
                                  accept="video/*"
                                  onChange={handleEpisodeVideoUpload}
                                  className="w-full p-2 rounded border"
                                  disabled={isUploadingSeries}
                                />
                                <input
                                  className="w-full p-2 rounded border"
                                  placeholder="Or paste video URL"
                                  value={newEpisodeVideoURL}
                                  onChange={(e) => setNewEpisodeVideoURL(e.target.value)}
                                  disabled={isUploadingSeries}
                                />
                                {newEpisodeVideoURL && (
                                  <div className="text-xs text-green-600 flex items-center gap-1">
                                    <MdCheckCircle />
                                    Video URL ready
                                  </div>
                                )}
                              </div>
                            </div>

                            <div>
                              <label className="font-semibold block mb-2">Episode Thumbnail</label>
                              <div className="space-y-2">
                                <input
                                  ref={episodeThumbnailRef}
                                  type="file"
                                  accept="image/*"
                                  onChange={handleEpisodeThumbnailUpload}
                                  className="w-full p-2 rounded border"
                                  disabled={isUploadingSeries}
                                />
                                <input
                                  className="w-full p-2 rounded border"
                                  placeholder="Or paste thumbnail URL"
                                  value={newEpisodeThumbnailURL}
                                  onChange={(e) => setNewEpisodeThumbnailURL(e.target.value)}
                                  disabled={isUploadingSeries}
                                />
                                {newEpisodeThumbnailURL && (
                                  <div className="text-xs text-green-600 flex items-center gap-1">
                                    <MdCheckCircle />
                                    Thumbnail ready
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={addEpisodeToSeries}
                            disabled={isUploadingSeries || !newEpisodeTitle || (!newEpisodeVideoURL && !newEpisodeVideoFile)}
                            className={`px-4 py-2 rounded w-full flex items-center justify-center gap-2 ${
                              isUploadingSeries || !newEpisodeTitle || (!newEpisodeVideoURL && !newEpisodeVideoFile)
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-purple-600 text-white hover:bg-purple-700'
                            }`}
                          >
                            Add Episode to Series
                          </button>
                        </div>
                      </div>

                      {/* Episodes List */}
                      <div className="mt-4">
                        <h4 className="font-semibold mb-3">Added Episodes ({episodes.length})</h4>
                        {episodes.length === 0 ? (
                          <div className="text-sm text-gray-500 p-4 bg-gray-50 rounded border text-center">
                            No episodes added yet. Add episodes above.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {episodes.map((episode, index) => (
                              <div key={index} className="border rounded-lg p-4 bg-white">
                                <div className="flex justify-between items-start mb-2">
                                  <div className="flex items-center gap-3">
                                    <span className="font-bold text-lg">{index + 1}.</span>
                                    <div>
                                      <h5 className="font-semibold">{episode.title}</h5>
                                      {episode.duration && (
                                        <span className="text-sm text-gray-500">Duration: {episode.duration}</span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {episode.videoFile && !episode.videoUploaded && (
                                      <span className="text-xs text-orange-600 animate-pulse">Uploading...</span>
                                    )}
                                    {episode.videoUploaded && (
                                      <span className="text-xs text-green-600 flex items-center gap-1">
                                        <MdCheckCircle />
                                        Ready
                                      </span>
                                    )}
                                    <button
                                      onClick={() => removeEpisode(index)}
                                      className="text-red-600 hover:text-red-800"
                                      disabled={isUploadingSeries}
                                    >
                                      <FiTrash2 />
                                    </button>
                                  </div>
                                </div>
                                {episode.description && (
                                  <p className="text-sm text-gray-600 mb-2">{episode.description}</p>
                                )}
                                <div className="flex gap-2 mt-2">
                                  {episode.thumbnailUrl && (
                                    <div className="relative">
                                      <img src={episode.thumbnailUrl} alt={`Thumbnail for ${episode.title}`} className="w-20 h-20 object-cover rounded" />
                                      {episode.thumbnailFile && !episode.thumbnailUploaded && (
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                          <FiLoader className="animate-spin text-white" />
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  <div className="flex-1">
                                    {episode.videoUrl && (
                                      <div className="flex items-center gap-2 text-sm text-blue-600">
                                        <FiVideo />
                                        <span className="truncate">{episode.videoUrl}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Upload Progress Bar */}
                  {isUploadingSeries && uploadProgress > 0 && (
                    <div className="mt-4">
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Uploading series...</span>
                        <span>{Math.round(uploadProgress)}%</span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-purple-600 transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="mt-6 flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={handleSubmitSeries}
                      disabled={isUploadingSeries || episodes.length === 0 || activeUploads.some(u => u.status === 'uploading')}
                      className={`px-5 py-3 rounded w-full sm:w-auto flex items-center justify-center gap-2 ${
                        isUploadingSeries || episodes.length === 0 || activeUploads.some(u => u.status === 'uploading')
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-purple-600 text-white hover:bg-purple-700'
                      }`}
                    >
                      {isUploadingSeries ? (
                        <>
                          <FiLoader className="animate-spin" />
                          Processing...
                        </>
                      ) : editingId !== null && chapters.find(c => c.chapterId === editingId && c.chapterType === 'series') ? (
                        "Update Series"
                      ) : (
                        "Save Series"
                      )}
                    </button>

                    {(editingId !== null) && (
                      <button
                        onClick={() => resetAllForms()}
                        disabled={isUploadingSeries}
                        className={`px-5 py-3 rounded w-full sm:w-auto ${
                          isUploadingSeries 
                            ? 'bg-gray-300 cursor-not-allowed' 
                            : 'bg-gray-500 text-white hover:bg-gray-600'
                        }`}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>

                {/* Series list - Using Card View */}
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-bold">Your Series Collection</h3>
                    <div className="text-sm text-gray-500">
                      {seriesChapters.length} series
                    </div>
                  </div>

                  {seriesChapters.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg border">
                      <MdLocalMovies className="text-6xl text-gray-300 mx-auto mb-4" />
                      <h4 className="text-xl font-semibold text-gray-600 mb-2">No Series Yet</h4>
                      <p className="text-gray-500 mb-4">Create your first series above to get started!</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {seriesChapters.map((ch) => {
                        const series = seriesCollection.find(s => s.id === ch.seriesId);
                        return (
                          <SeriesCard
                            key={ch.chapterId}
                            series={series}
                            chapter={ch}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onToggleLock={handleToggleLock}
                            onManageEpisodes={handleManageEpisodes}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}