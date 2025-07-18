// src/pages/NotificationEditor.js
import React, { useState, useRef } from "react";
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
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);

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

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate image file
      if (!file.type.match('image.*')) {
        toast.error('Please select an image file');
        return;
      }
      
      // Limit file size to 5MB
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }

      setImageFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  const initialFormState = {
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
};

  // In your Notifications.js component
const handleSubmit = async (e) => {
  e.preventDefault();
  
  // Basic validation
  if (!form.title.trim()) {
    return toast.error("Notification title is required");
  }
  if (!form.message.trim()) {
    return toast.error("Notification message is required");
  }
  if (form.status === "scheduled" && !form.scheduledAt) {
    return toast.error("Please select a schedule date and time");
  }

  setIsSubmitting(true);
  
  try {
    const payload = {
      title: form.title,
      message: form.message,
      scheduledAt: form.status === "scheduled" ? form.scheduledAt : null,
    };

    const result = await NotificationService.sendNotification(payload, imageFile);
    
    if (result.success) {
      toast.success(result.message || (
        form.status === "scheduled" 
          ? "Notification scheduled successfully!" 
          : "Notification sent successfully!"
      ));
      
      // Reset form
      setForm(initialFormState);
      removeImage();
    } else {
      // Handle specific error codes
      switch (result.code) {
        case "NO_DEVICE_TOKENS":
          toast.error("No devices are registered to receive notifications");
          break;
        case "IMAGE_UPLOAD_FAILED":
          toast.error("Failed to upload image. Please try again.");
          break;
        case "NETWORK_ERROR":
          toast.error("Network connection problem. Please check your internet.");
          break;
        default:
          toast.error(result.error || "Failed to send notification");
      }
      
      console.error("Notification error details:", {
        code: result.code,
        details: result.details,
        status: result.status
      });
    }
  } catch (error) {
    toast.error("An unexpected error occurred");
    console.error("Unexpected error:", error);
  } finally {
    setIsSubmitting(false);
  }
};

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white shadow rounded">
      <h2 className="text-xl font-bold mb-4">Create Notification</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notification Title
          </label>
          <input
            className="w-full border p-2 rounded"
            placeholder="Enter title"
            name="title"
            value={form.title}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Message
          </label>
          <textarea
            className="w-full border p-2 rounded"
            placeholder="Enter your message (can include emojis 🎉)"
            name="message"
            value={form.message}
            onChange={handleChange}
            rows={4}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Optional Deep Link
          </label>
          <input
            className="w-full border p-2 rounded"
            placeholder="app://book/xyz"
            name="deepLink"
            value={form.deepLink}
            onChange={handleChange}
          />
        </div>

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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Scheduled Date & Time
            </label>
            <input
              type="datetime-local"
              name="scheduledAt"
              className="w-full border p-2 rounded"
              value={form.scheduledAt}
              onChange={handleChange}
              min={new Date().toISOString().slice(0, 16)}
              required={form.status === "scheduled"}
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notification Image (Optional)
          </label>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageChange}
            accept="image/*"
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100"
          />
          {imagePreview && (
            <div className="mt-2 relative">
              <img 
                src={imagePreview} 
                alt="Preview" 
                className="h-32 object-contain rounded border"
              />
              <button
                type="button"
                onClick={removeImage}
                className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1"
              >
                ×
              </button>
            </div>
          )}
        </div>

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
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </label>
          ))}
        </fieldset>

        <button
          type="submit"
          disabled={isSubmitting}
          className={`bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 ${
            isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {form.status === "scheduled" ? "Scheduling..." : "Sending..."}
            </span>
          ) : (
            form.status === "scheduled" ? "Schedule Notification" : "Send Notification"
          )}
        </button>
      </form>
    </div>
  );
}