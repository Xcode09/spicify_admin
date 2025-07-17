// src/services/BunnyUploader.js

export default class BunnyUploader {
   static async upload(file) {
    if (!file) throw new Error("No file provided");

    const formData = new FormData();
    formData.append("file", file); // your backend handles the file and path

    const response = await fetch("https://inzi.genetum.com/bunnyupload", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Upload failed");
    }

    return data.fileUrl; // the uploaded Bunny file URL
  }
}
