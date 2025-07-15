// src/services/NotificationService.js

const API_BASE = "http://localhost:5001"; // Change in production

export default class NotificationService {
  /**
   * Create and save a new notification to Firestore via Node.js API
   * @param {{
   *  title: string,
   *  message: string,
   *  status: 'draft' | 'scheduled' | 'sent',
   *  scheduledAt?: Date,
   *  deepLink?: string,
   *  richFormat?: {
   *    bold?: boolean,
   *    italic?: boolean,
   *    lineBreaks?: boolean,
   *    emojis?: boolean
   *  },
   *  target?: 'all' | 'subscribers' | string[] // e.g., userIds
   * }} data
   */
  static async createNotification(data) {
    try {
      const res = await fetch(`${API_BASE}/notifications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to create notification");

      return result;
    } catch (error) {
      console.error("Error creating notification:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send a notification immediately via Node.js FCM API
   * @param {{
   *  title: string,
   *  message: string,
   *  deepLink?: string,
   *  tokens: string[]
   * }} payload
   */
  static async sendNotificationViaFCM(payload) {
    try {
      const res = await fetch(`${API_BASE}/send-notification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to send notification");

      return result;
    } catch (error) {
      console.error("FCM send failed:", error);
      return { success: false, error: error.message };
    }
  }
}
