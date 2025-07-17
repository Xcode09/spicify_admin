// src/services/BunnyUploader.js

export default class BunnyUploader {
  static async upload(file, path) {
    const bunnyStorageZone = "spicify-app";
    const bunnyAccessKey = "1a96a931-81ed-4517-be6f3e2ed8de-7fde-4ba4";
    const bunnyHostname = "spicifyapp.b-cdn.net";

    if (!file) throw new Error("No file provided");

    const response = await fetch(
      `https://${bunnyHostname}/${bunnyStorageZone}/${path}`,
      {
        method: "PUT",
        headers: {
          AccessKey: bunnyAccessKey,
          "Content-Type": file.type,
        },
        body: file,
      }
    );

    if (!response.ok) {
      throw new Error(`Bunny upload failed: ${response.statusText}`);
    }

    return `https://spicifyapp.b-cdn.net/${path}`;
  }
}
