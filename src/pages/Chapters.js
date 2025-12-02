import React, { useEffect, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  updateDoc,
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
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import { MdAudiotrack, MdTextFields, MdLock, MdLockOpen } from "react-icons/md";

/**
 * SortableItem - reused for both audio and text lists.
 * Shows a clear badge for type, a short preview, lock state and action buttons.
 */
function SortableItem({ chapter, onEdit, onDelete, onToggleLock }) {
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
          ) : (
            <div className="flex items-center gap-2 bg-green-50 text-green-700 px-2 py-1 rounded">
              <MdTextFields className="text-lg" />
              <span className="text-sm font-semibold">Text</span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm sm:text-base truncate">{chapter.chapterName}</h3>

          {chapter.chapterType === "audio" ? (
            <p className="text-xs text-gray-500 truncate max-w-full">
              {chapter.chapterUrl ? chapter.chapterUrl : "No audio URL"}
            </p>
          ) : (
            <div className="text-xs text-gray-600 mt-1 max-w-full">
              <pre
                className="whitespace-pre-wrap overflow-hidden text-ellipsis"
                style={{ margin: 0, fontFamily: "inherit" }}
              >
                {textPreview || "No text content"}
                {textPreview.length >= 240 ? "…" : ""}
              </pre>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 sm:mt-0 flex items-center gap-2">
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
 * MAIN COMPONENT - Tabs version (big mobile-friendly tabs).
 * NOTE: Logic mirrors original; submit handlers created separately for each tab for clarity.
 */
export default function ChapterManager() {
  // General state
  const [books, setBooks] = useState([]);
  const [selectedBookId, setSelectedBookId] = useState("");
  const [chapters, setChapters] = useState([]);

  // Which tab is active: "audio" or "text"
  const [activeTab, setActiveTab] = useState("audio");

  // Editing state
  const [editingId, setEditingId] = useState(null);

  // Audio-specific states (form)
  const [audioFormTitle, setAudioFormTitle] = useState("");
  const [audioFile, setAudioFile] = useState(null);
  const [audioURL, setAudioURL] = useState("");

  // Text-specific states (form)
  const [textFormTitle, setTextFormTitle] = useState("");
  const [textContent, setTextContent] = useState("");
  const [contentBlocks, setContentBlocks] = useState([]); // text + images

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
      return;
    }

    const unsub = onSnapshot(doc(db, "audiobooks", selectedBookId), (docSnap) => {
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

  const updateChaptersInFirestore = async (updatedChapters) => {
    const ref = doc(db, "audiobooks", selectedBookId);
    await updateDoc(ref, { chapters: updatedChapters });
  };

  // Image upload (used in text tab)
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    toast.info("Uploading image...");

    try {
      const url = await BunnyUploader.upload(file);

      setContentBlocks((prev) => [
        ...prev,
        {
          type: "image",
          url,
        },
      ]);

      toast.dismiss();
      toast.success("Image added!");
    } catch (err) {
      toast.dismiss();
      toast.error("Image upload failed");
      console.error(err);
    }
  };

  // Utility: split chapters by type
  const audioChapters = chapters.filter((c) => c.chapterType === "audio");
  const textChapters = chapters.filter((c) => c.chapterType === "text");

  // ---------- SUBMIT for AUDIO tab ----------
  const handleSubmitAudio = async () => {
    if (!audioFormTitle) return toast.error("Please enter chapter title");

    let finalAudioURL = audioURL;

    // upload audio if provided
    if (audioFile) {
      toast.info("Uploading audio...");
      finalAudioURL = await BunnyUploader.upload(audioFile);
      setAudioURL(finalAudioURL);
      toast.dismiss();
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

  // reset both forms
  const resetAllForms = () => {
    setAudioFormTitle("");
    setAudioURL("");
    setAudioFile(null);

    setTextFormTitle("");
    setTextContent("");
    setContentBlocks([]);

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

      // clear text form
      setTextFormTitle("");
      setTextContent("");
      setContentBlocks([]);

      // switch to audio tab
      setActiveTab("audio");
    } else {
      // populate text form
      setTextFormTitle(chapter.chapterName);
      setContentBlocks(chapter.contentBlocks || []);
      setTextContent(chapter.textContent || "");

      // clear audio form
      setAudioFormTitle("");
      setAudioURL("");
      setAudioFile(null);

      // switch to text tab
      setActiveTab("text");
    }
  };

  const handleDelete = async (id) => {
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

    const combined = [
      ...audio,
      ...reorderedText.map((c) => {
        const { __textIndex, ...rest } = c;
        return rest;
      }),
    ];

    const normalized = combined.map((c, i) => ({ ...c, order: i }));

    await updateChaptersInFirestore(normalized);
    setChapters(normalized);
  };

  // Render
  return (
    <div className="p-4 sm:p-6 max-w-full sm:max-w-5xl mx-auto">
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
          </div>

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
                      className="bg-red-600 text-white px-5 py-3 rounded w-full sm:w-auto"
                    >
                      {editingId !== null && chapters.find(c => c.chapterId === editingId && c.chapterType === 'audio') ? "Update Audio" : "Add Audio"}
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
                          />
                        ))}
                      </SortableContext>
                    </DndContext>
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
