import React, { useEffect, useState } from "react";
import { getAuth, updateProfile, updateEmail, sendPasswordResetEmail } from "firebase/auth";
import BunnyUploader from "../services/BunnyUploader";

export default function ProfilePage () {
  const auth = getAuth();
  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [profileImage, setProfileImage] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [email, setEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      setUser(currentUser);
      setDisplayName(currentUser.displayName || "");
      setPreviewImage(currentUser.photoURL || null);
      //setEmail(currentUser.email);
    }
  }, [auth]);

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    setMessage("");

    try {
        let photoURL = user.photoURL;

        // Upload new image if selected
      if (profileImage) {
        photoURL = await BunnyUploader.upload(profileImage);
      }
      // Update display name
      await updateProfile(user, {
        displayName,
        photoURL,
      });

      // Update email
    //   if (email !== user.email) {
    //     await updateEmail(user, email);
    //   }

      // Refresh state
      setUser({ ...auth.currentUser });
      setMessage("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      setMessage(`Error: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileImage(file);
      setPreviewImage(URL.createObjectURL(file));
    }
  };
  const handlePasswordReset = async () => {
    if (!user?.email) return;
    try {
      await sendPasswordResetEmail(auth, user.email);
      setMessage("Password reset email sent!");
    } catch (error) {
      console.error("Password reset error:", error);
      setMessage(`Error: ${error.message}`);
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-white p-6 rounded-xl shadow-md">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Admin Profile</h2>

      {message && (
        <div className="mb-4 text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded p-3">
          {message}
        </div>
      )}

      {user ? (
        <div className="space-y-6">
          {/* Profile Picture */}
          <div className="flex flex-col items-center space-y-3">
            {previewImage ? (
              <img
                src={previewImage}
                alt="Profile"
                className="w-24 h-24 rounded-full object-cover border"
              />
            ) : (
              <div className="w-24 h-24 bg-gray-300 rounded-full" />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="text-sm"
            />
          </div>

          {/* Name Field */}
          <div>
            <label className="block text-sm font-medium text-gray-600">Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1 w-full p-3 border rounded-lg bg-gray-100"
            />
          </div>

          {/* UID */}
          <div>
            <label className="block text-sm font-medium text-gray-600">UID</label>
            <div className="mt-1 p-3 bg-gray-100 rounded text-xs text-gray-500">
              {user.uid}
            </div>
          </div>

          {/* Email (readonly) */}
          <div>
            <label className="block text-sm font-medium text-gray-600">Email</label>
            <div className="mt-1 p-3 bg-gray-100 rounded">{user.email}</div>
          </div>

          {/* Email Verified */}
          <div>
            <label className="block text-sm font-medium text-gray-600">Email Verified</label>
            <div
              className={`mt-1 p-3 rounded ${
                user.emailVerified ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
              }`}
            >
              {user.emailVerified ? "Verified" : "Not Verified"}
            </div>
          </div>

          {/* Save & Password Reset */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-black text-white px-4 py-2 rounded"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>

            <button
              onClick={handlePasswordReset}
              className="text-blue-600 underline text-sm"
            >
              Send Password Reset Email
            </button>
          </div>
        </div>
      ) : (
        <p>Loading profile...</p>
      )}
    </div>
  );
};


