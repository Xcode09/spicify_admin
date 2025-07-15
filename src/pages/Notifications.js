// src/pages/NotificationEditor.js
import React, { useState } from "react";
import { toast } from "react-toastify";
import NotificationService from "../services/NotificationService";

export default function Notifications() {
  const [form, setForm] = useState({
    title: "",
    message: "",
    status: "draft",
    scheduledAt: "",
    deepLink: "",
    richFormat: {
      bold: false,
      italic: false,
      lineBreaks: true,
      emojis: true,
    },
    target: "all",
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name.startsWith("richFormat.")) {
      const key = name.split(".")[1];
      setForm((prev) => ({
        ...prev,
        richFormat: {
          ...prev.richFormat,
          [key]: checked,
        },
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.message) return toast.error("Title and message required");

    const payload = {
      ...form,
      scheduledAt: form.status === "scheduled" ? new Date(form.scheduledAt) : null,
    };

    const res = await NotificationService.createNotification(payload);
    res.success
      ? toast.success("Notification saved!")
      : toast.error("Error saving notification");
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white shadow rounded">
      <h2 className="text-xl font-bold mb-4">Create Notification</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          className="w-full border p-2 rounded"
          placeholder="Notification Title"
          name="title"
          value={form.title}
          onChange={handleChange}
        />
        <textarea
          className="w-full border p-2 rounded"
          placeholder="Message (can include emojis 🎉)"
          name="message"
          value={form.message}
          onChange={handleChange}
          rows={4}
        />
        <input
          className="w-full border p-2 rounded"
          placeholder="Optional Deep Link (e.g., app://book/xyz)"
          name="deepLink"
          value={form.deepLink}
          onChange={handleChange}
        />

        <div className="grid grid-cols-2 gap-4">
          <label className="flex gap-2 items-center">
            <input
              type="radio"
              name="status"
              value="draft"
              checked={form.status === "draft"}
              onChange={handleChange}
            />
            Draft
          </label>
          <label className="flex gap-2 items-center">
            <input
              type="radio"
              name="status"
              value="scheduled"
              checked={form.status === "scheduled"}
              onChange={handleChange}
            />
            Schedule
          </label>
        </div>

        {form.status === "scheduled" && (
          <input
            type="datetime-local"
            name="scheduledAt"
            className="w-full border p-2 rounded"
            value={form.scheduledAt}
            onChange={handleChange}
          />
        )}

        <fieldset className="border rounded p-4">
          <legend className="text-sm font-semibold mb-2">Rich Format</legend>
          {["bold", "italic", "emojis", "lineBreaks"].map((key) => (
            <label key={key} className="block mb-1">
              <input
                type="checkbox"
                name={`richFormat.${key}`}
                checked={form.richFormat[key]}
                onChange={handleChange}
                className="mr-2"
              />
              {key}
            </label>
          ))}
        </fieldset>

        <button
          type="submit"
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
        >
          Save Notification
        </button>
      </form>
    </div>
  );
}
