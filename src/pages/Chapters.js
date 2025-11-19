// Full rewritten Chapter Manager with support for audio & text chapters + inline images
// ----- START OF FILE -----

import React, { useEffect, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
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

// Sortable Chapter Item
function SortableItem({ chapter, onEdit, onDelete, onToggleLock }) {
  const { setNodeRef, attributes, listeners, transform, transition } =
    useSortable({ id: chapter.chapterId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white p-4 rounded-lg shadow border mb-3 flex justify-between items-center"
    >
      <div {...attributes} {...listeners} className="cursor-move flex-1">
        <h3 className="font-semibold">{chapter.chapterName}</h3>
        {chapter.chapterType === "audio" ? (
          <p className="text-sm text-gray-500 truncate max-w-xs">
            {chapter.chapterUrl}
          </p>
        ) : (
          <p className="text-sm text-gray-500">📖 Text Chapter</p>
        )}
      </div>

      <div className="flex items-center gap-3 ml-4">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleLock(chapter.chapterId);
          }}
          className={`px-3 py-1 rounded text-sm ${
            chapter.isLocked
              ? "bg-gray-200 text-gray-700"
              : "bg-green-100 text-green-700"
          }`}
        >
          {chapter.isLocked ? "🔒 Locked" : "✅ Unlocked"}
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(chapter);
          }}
          className="text-blue-500"
        >
          <FiEdit2 />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(chapter.chapterId);
          }}
          className="text-red-500"
        >
          <FiTrash2 />
        </button>
      </div>
    </div>
  );
}

// MAIN COMPONENT
export default function ChapterManager() {
  const [books, setBooks] = useState([]);
  const [selectedBookId, setSelectedBookId] = useState("");
  const [chapters, setChapters] = useState([]);

  const [editingId, setEditingId] = useState(null);

  const [chapterType, setChapterType] = useState("audio"); // audio or text

  const [formTitle, setFormTitle] = useState("");

  const [audioFile, setAudioFile] = useState(null);
  const [audioURL, setAudioURL] = useState("");

  const [textContent, setTextContent] = useState("");
  const [contentBlocks, setContentBlocks] = useState([]); // text + images

  // Load Books
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

  // IMAGE UPLOAD HANDLER
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    toast.info("Uploading image...");

    try {
      const url = await BunnyUploader.upload(file);

      setContentBlocks([
        ...contentBlocks,
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

  // SUBMIT CHAPTER
  const handleSubmit = async () => {
    if (!formTitle) return toast.error("Please enter chapter title");

    let finalAudioURL = audioURL;

    // Upload audio if chapterType === audio
    if (chapterType === "audio" && audioFile) {
      toast.info("Uploading audio...");
      finalAudioURL = await BunnyUploader.upload(audioFile);
      setAudioURL(finalAudioURL);
      toast.dismiss();
    }

    const nextId =
      editingId !== null
        ? editingId
        : chapters.length > 0
        ? Math.max(...chapters.map((c) => c.chapterId)) + 1
        : 0;

    const newChapter = {
      chapterId: nextId,
      chapterName: formTitle,
      chapterType,
      order: nextId,
      isFree: nextId === 0,
      isLocked: nextId !== 0,
      isDownloadable: chapterType === "audio",
      chapterUrl: chapterType === "audio" ? finalAudioURL : "",

      // TEXT CHAPTER FIELDS
      contentBlocks: chapterType === "text" ? contentBlocks : [],
      textContent:
        chapterType === "text"
          ? contentBlocks
              .filter((b) => b.type === "paragraph")
              .map((b) => b.content)
              .join("\n")
          : "",
    };

    let updated = [...chapters];

    if (editingId !== null) {
      const index = updated.findIndex((c) => c.chapterId === editingId);
      updated[index] = newChapter;
    } else {
      updated.push(newChapter);
    }

    await updateChaptersInFirestore(updated);
    toast.success(editingId ? "Chapter updated" : "Chapter added!");

    resetForm();
  };

  const resetForm = () => {
    setFormTitle("");
    setAudioURL("");
    setAudioFile(null);
    setEditingId(null);
    setTextContent("");
    setContentBlocks([]);
  };

  const handleEdit = (chapter) => {
    setEditingId(chapter.chapterId);
    setFormTitle(chapter.chapterName);
    setChapterType(chapter.chapterType);

    if (chapter.chapterType === "audio") {
      setAudioURL(chapter.chapterUrl);
    } else {
      setContentBlocks(chapter.contentBlocks || []);
    }
  };

  const handleDelete = async (id) => {
    const updated = chapters.filter((c) => c.chapterId !== id);
    await updateChaptersInFirestore(updated);
    setChapters(updated);
    toast.success("Chapter deleted");
  };

  const handleToggleLock = async (id) => {
    const updated = chapters.map((c) =>
      c.chapterId === id ? { ...c, isLocked: !c.isLocked } : c
    );

    await updateChaptersInFirestore(updated);
    setChapters(updated);
  };

  const handleDragEnd = async ({ active, over }) => {
    if (!over || active.id === over.id) return;

    const oldIdx = chapters.findIndex((c) => c.chapterId === active.id);
    const newIdx = chapters.findIndex((c) => c.chapterId === over.id);

    const reordered = arrayMove(chapters, oldIdx, newIdx).map((c, i) => ({
      ...c,
      order: i,
      isFree: i === 0,
      isLocked: i !== 0,
    }));

    await updateChaptersInFirestore(reordered);
    setChapters(reordered);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Chapter Manager</h1>

      {/* Book Selector */}
      <div className="mb-4">
        <label>Select Audiobook</label>
        <select
          className="w-full p-2 rounded border"
          value={selectedBookId}
          onChange={(e) => setSelectedBookId(e.target.value)}
        >
          <option value="">-- Choose --</option>
          {books.map((b) => (
            <option key={b.id} value={b.id}>
              {b.title}
            </option>
          ))}
        </select>
      </div>

      {/* Add/Edit Section */}
      {selectedBookId && (
        <div className="bg-gray-100 p-4 rounded mb-6">
          <h2 className="text-lg font-semibold mb-2">
            {editingId !== null ? "Edit Chapter" : "Add Chapter"}
          </h2>

          <input
            className="w-full mb-2 p-2 rounded border"
            placeholder="Chapter Title"
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
          />

          {/* Select Chapter Type */}
          <select
            className="w-full p-2 rounded border mb-3"
            value={chapterType}
            onChange={(e) => setChapterType(e.target.value)}
          >
            <option value="audio">Audio Chapter</option>
            <option value="text">Text Chapter</option>
          </select>

          {/* AUDIO CHAPTER UI */}
          {chapterType === "audio" && (
            <>
              <input
                type="file"
                accept="audio/*"
                onChange={(e) => setAudioFile(e.target.files[0])}
                className="w-full mb-2 p-2 rounded border"
              />

              <input
                className="w-full mb-2 p-2 rounded border"
                placeholder="Audio URL (optional)"
                value={audioURL}
                onChange={(e) => setAudioURL(e.target.value)}
              />
            </>
          )}

          {/* TEXT CHAPTER UI */}
          {chapterType === "text" && (
            <div>
              <textarea
                placeholder="Write chapter text..."
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                className="w-full p-2 rounded border mb-2"
                rows={5}
              />

              <button
                onClick={() => {
                  if (!textContent.trim()) return toast.error("Empty text block");
                  setContentBlocks([
                    ...contentBlocks,
                    { type: "paragraph", content: textContent },
                  ]);
                  setTextContent("");
                }}
                className="bg-gray-700 text-white px-3 py-1 rounded mr-2"
              >
                Add Text
              </button>

              <input
                id="inlineImageInput"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />

              <button
                onClick={() => document.getElementById("inlineImageInput").click()}
                className="bg-purple-600 text-white px-3 py-1 rounded"
              >
                Add Image
              </button>

              {/* PREVIEW */}
              <div className="mt-3 bg-white p-3 border rounded">
                <h3 className="font-semibold mb-2">Preview</h3>

                {contentBlocks.map((block, idx) => (
                  <div key={idx} className="mb-3">
                    {block.type === "paragraph" && (
                      <p className="text-gray-800">{block.content}</p>
                    )}

                    {block.type === "image" && (
                      <img src={block.url} alt="" className="w-full rounded" />
                    )}

                    <button
                      className="text-red-500 text-sm mt-1"
                      onClick={() => {
                        const updated = [...contentBlocks];
                        updated.splice(idx, 1);
                        setContentBlocks(updated);
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleSubmit}
            className="bg-blue-600 text-white px-4 py-2 rounded mt-3"
          >
            {editingId !== null ? "Update Chapter" : "Add Chapter"}
          </button>

          {editingId !== null && (
            <button
              onClick={resetForm}
              className="ml-3 bg-gray-500 text-white px-4 py-2 rounded"
            >
              Cancel
            </button>
          )}
        </div>
      )}

      {/* CHAPTER LIST */}
      {selectedBookId && (
        <>
          <h2 className="text-lg font-semibold mb-3">All Chapters</h2>

          <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext
              items={chapters.map((c) => c.chapterId)}
              strategy={verticalListSortingStrategy}
            >
              {chapters.map((ch) => (
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
        </>
      )}
    </div>
  );
}

// ----- END OF FILE -----
