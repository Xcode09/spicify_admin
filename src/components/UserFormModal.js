import React, { Fragment, useRef, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import BunnyUploader from "../services/BunnyUploader";
import { v4 as uuidv4 } from "uuid";

export default function UserFormModal({
  isOpen,
  closeModal,
  form,
  setForm,
  onSubmit,
  isEdit = false,
}) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploading(true);
      const uniqueFileName = `user-profiles/${uuidv4()}.${file.name.split('.').pop()}`;
      const url = await BunnyUploader.upload(file, uniqueFileName);
      setForm((prev) => ({ ...prev, profileImage: url }));
    } catch (err) {
      alert("Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={closeModal}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-30" />
        </Transition.Child>

        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
              <Dialog.Title className="text-lg font-bold mb-4 text-black">
                {isEdit ? "Edit User" : "Add User"}
              </Dialog.Title>

              <div className="space-y-3">
                <input
                  type="text"
                  name="name"
                  placeholder="Name"
                  value={form.name}
                  onChange={handleChange}
                  className="w-full p-2 border rounded"
                />

                {/* Profile Image Preview */}
                {form.profileImage && (
                  <img
                    src={form.profileImage}
                    alt="Profile"
                    className="h-20 w-20 object-cover rounded-full mx-auto"
                  />
                )}

                {/* Upload Button */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Upload Profile Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    ref={fileInputRef}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current.click()}
                    disabled={uploading}
                    className="bg-blue-500 text-white px-3 py-1 rounded text-sm"
                  >
                    {uploading ? "Uploading..." : "Choose File"}
                  </button>
                </div>

                {/* Checkboxes */}
                <div className="flex items-center gap-3 text-sm text-black">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="isVerified"
                      checked={form.isVerified}
                      onChange={handleChange}
                    />
                    Verified
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="isSubscriber"
                      checked={form.isSubscriber}
                      onChange={handleChange}
                    />
                    Subscriber
                  </label>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 border border-gray-300 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={onSubmit}
                  disabled={uploading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded"
                >
                  {isEdit ? "Update" : "Add"}
                </button>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}
