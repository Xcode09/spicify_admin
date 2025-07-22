import React, { useEffect, useState } from "react";
import { getAuth, updateProfile, updateEmail, sendPasswordResetEmail } from "firebase/auth";
import BunnyUploader from "../services/BunnyUploader";

export default function ProfilePage() {
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
    }
  }, [auth]);

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    setMessage("");

    try {
      let photoURL = user.photoURL;

      if (profileImage) {
        photoURL = await BunnyUploader.upload(profileImage);
      }

      await updateProfile(user, {
        displayName,
        photoURL,
      });

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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Admin Profile</h1>
          </div>

          {message && (
            <div className={`mb-6 p-4 rounded-md ${
              message.includes("Error") 
                ? "bg-red-50 text-red-700 border border-red-200"
                : "bg-green-50 text-green-700 border border-green-200"
            }`}>
              {message}
            </div>
          )}

          {user ? (
            <div className="space-y-8">
              {/* Profile Picture Card */}
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <h2 className="text-lg font-semibold text-gray-700 mb-4">Profile Picture</h2>
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative">
                    {previewImage ? (
                      <img
                        src={previewImage}
                        alt="Profile"
                        className="w-32 h-32 rounded-full object-cover border-2 border-white shadow-sm"
                      />
                    ) : (
                      <div className="w-32 h-32 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-gray-400 text-xl">Photo</span>
                      </div>
                    )}
                  </div>
                  <div className="w-full max-w-xs">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="block w-full text-sm text-gray-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-md file:border-0
                        file:text-sm file:font-semibold
                        file:bg-black file:text-white
                        hover:file:bg-gray-800"
                    />
                    <p className="mt-1 text-xs text-gray-500">JPEG or PNG. Max 5MB.</p>
                  </div>
                </div>
              </div>

              {/* Account Information Card */}
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <h2 className="text-lg font-semibold text-gray-700 mb-4">Account Information</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-black focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <div className="w-full p-3 bg-gray-100 rounded-md text-gray-700">
                      {user.email}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Verification Status</label>
                    <div className={`w-full p-3 rounded-md ${
                      user.emailVerified 
                        ? "bg-green-100 text-green-800" 
                        : "bg-yellow-100 text-yellow-800"
                    }`}>
                      {user.emailVerified ? "Verified" : "Not Verified"}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
                    <div className="w-full p-3 bg-gray-100 rounded-md text-xs text-gray-500 font-mono">
                      {user.uid}
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions Card */}
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <h2 className="text-lg font-semibold text-gray-700 mb-4">Actions</h2>
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className={`px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black ${
                      isSaving ? "opacity-70 cursor-not-allowed" : ""
                    }`}
                  >
                    {isSaving ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving...
                      </span>
                    ) : "Save Changes"}
                  </button>

                  <button
                    onClick={handlePasswordReset}
                    className="px-6 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
                  >
                    Send Password Reset Email
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex justify-center items-center h-64">
              <p className="text-gray-500">Loading profile...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}