// src/services/NotificationService.js
const API_BASE_URL = 'https://inzi.genetum.com'; // Replace with your actual API URL

// src/services/NotificationService.js
export default {
  async sendNotification(notificationData, imageFile) {
    try {
      const formData = new FormData();
      formData.append('title', notificationData.title);
      formData.append('body', notificationData.message);
      
      if (notificationData.scheduledAt) {
        formData.append('scheduledAt', notificationData.scheduledAt);
      }
      
      if (imageFile) {
        formData.append('file', imageFile);
      }

      const response = await fetch(`${API_BASE_URL}/send-notification`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        // Handle API-level errors (4xx, 5xx)
        return {
          success: false,
          error: result.error || "Request failed",
          code: result.code || "API_ERROR",
          status: response.status,
          details: result.details
        };
      }

      return {
        success: true,
        data: result.data,
        message: result.message
      };

    } catch (error) {
      // Handle network errors or JSON parsing errors
      return {
        success: false,
        error: "Network error occurred",
        code: "NETWORK_ERROR",
        details: error.message
      };
    }
  }
};