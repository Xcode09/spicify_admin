// src/pages/ChapterManager.js
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
      {/* Drag Handle Area */}
      <div {...attributes} {...listeners} className="cursor-move flex-1">
        <h3 className="font-semibold">{chapter.chapterName}</h3>
        <p className="text-sm text-gray-500 truncate max-w-xs">{chapter.chapterUrl}</p>
        <p className="text-sm">
          {chapter.isFree
            ? "🆓 Free"
            : chapter.isLocked
            ? "🔒 Locked"
            : "✅ Unlocked"}
        </p>
      </div>

      {/* Actions */}
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

export default function ChapterManager() {
  const [books, setBooks] = useState([]);
  const [selectedBookId, setSelectedBookId] = useState("");
  const [chapters, setChapters] = useState([]);
  const [audioFile, setAudioFile] = useState(null);
  const [formTitle, setFormTitle] = useState("");
  const [audioURL, setAudioURL] = useState("");
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "audiobooks"), (snapshot) => {
      const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setBooks(list);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
  if (!selectedBookId) {
    setChapters([]);
    return;
  }
  
  const unsub = onSnapshot(doc(db, "audiobooks", selectedBookId), (doc) => {
    if (doc.exists()) {
      const book = doc.data();
      if (book.chapters) {
        const sorted = [...book.chapters].sort((a, b) => a.chapterId - b.chapterId);
        setChapters(sorted);
      } else {
        setChapters([]);
      }
    }
  });
  
  return () => unsub();
}, [selectedBookId]); // Only depend on selectedBookId

  const updateChaptersInFirestore = async (updatedChapters) => {
    const bookRef = doc(db, "audiobooks", selectedBookId);
    await updateDoc(bookRef, {
      chapters: updatedChapters,
    });
  };

  const handleSubmit = async () => {
  let finalAudioURL = audioURL;

  try {
    // 1. Upload file
    if (audioFile) {
      toast.info("Uploading audio file...");
      finalAudioURL = await BunnyUploader.upload(audioFile);
      setAudioURL(finalAudioURL);
      toast.dismiss();
    }

    // 2. Validation
    if (!formTitle || !finalAudioURL || !selectedBookId) {
      return toast.error("Fill all fields");
    }

    // 3. Show "saving to Firestore" toast
    const savingToastId = toast.loading("Saving chapter to Firestore...");

    // 4. Prepare updated chapter list
    const updatedChapters = [...chapters];
    if (editingId !== null) {
      const index = updatedChapters.findIndex((c) => c.chapterId === editingId);
      updatedChapters[index] = {
        ...updatedChapters[index],
        chapterName: formTitle,
        chapterUrl: finalAudioURL,
      };
    } else {
      const nextId =
        chapters.length > 0 ? Math.max(...chapters.map((c) => c.chapterId)) + 1 : 0;
      updatedChapters.push({
        chapterId: nextId,
        chapterName: formTitle,
        chapterUrl: finalAudioURL,
        isFree: nextId === 0,
        isLocked: nextId !== 0,
      });
    }

    // 5. Update Firestore
    await updateChaptersInFirestore(updatedChapters);

    // 6. Clear toast and show success
    toast.dismiss(savingToastId);
    toast.success(editingId !== null ? "Chapter updated" : "Chapter added");

    // 7. Reset form
    resetForm();
  } catch (error) {
    toast.dismiss();
    toast.error("Something went wrong while submitting.");
    console.error("Submit Error:", error);
  }
};



  const resetForm = () => {
    setFormTitle("");
    setAudioURL("");
    setEditingId(null);
  };

  const handleEdit = (chapter) => {
    setFormTitle(chapter.chapterName);
    setAudioURL(chapter.chapterUrl);
    setEditingId(chapter.chapterId);
  };

  const handleDelete = async (chapterId) => {
    const updated = chapters.filter((c) => c.chapterId !== chapterId);
    await updateChaptersInFirestore(updated);
    setChapters(updated);
    toast.success("Chapter deleted");
  };

  const handleToggleLock = async (chapterId) => {
    const updated = chapters.map((c) =>
      c.chapterId === chapterId ? { ...c, isLocked: !c.isLocked } : c
    );
    setChapters(updated);
    await updateChaptersInFirestore(updated);
  };

  const handleDragEnd = async ({ active, over }) => {
    if (!over || active.id === over.id) return;

    const oldIndex = chapters.findIndex((c) => c.chapterId === active.id);
    const newIndex = chapters.findIndex((c) => c.chapterId === over.id);
    const reordered = arrayMove(chapters, oldIndex, newIndex).map((c, i) => ({
      ...c,
      chapterId: i,
      isFree: i === 0,
      isLocked: i !== 0 ? c.isLocked ?? true : false,
    }));

    setChapters(reordered);
    await updateChaptersInFirestore(reordered);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Chapter Manager</h1>

      {/* Book Dropdown */}
      <div className="mb-4">
        <label>Select Audiobook:</label>
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

      {/* Add/Edit Chapter */}
      {selectedBookId && (
        <>
          <div className="bg-gray-100 p-4 rounded-lg mb-6">
            <h2 className="text-lg font-semibold mb-2">
              {editingId !== null ? "Edit Chapter" : "Add New Chapter"}
            </h2>
            <input
              placeholder="Chapter Title"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              className="w-full mb-2 p-2 rounded border"
            />
            <input
              type="file"
              accept=".mp3,audio/mpeg"
              onChange={(e) => setAudioFile(e.target.files[0])}
              className="w-full mb-2 p-2 rounded border"
            />
            <div className="flex gap-3">
              <button
                onClick={handleSubmit}
                className="bg-blue-600 text-white px-4 py-2 rounded"
              >
                {editingId !== null ? "Update Chapter" : "Add Chapter"}
              </button>
              {editingId !== null && (
                <button
                  onClick={resetForm}
                  className="bg-gray-400 text-white px-4 py-2 rounded"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>

          {/* Chapter List */}
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
