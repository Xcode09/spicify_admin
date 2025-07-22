// src/services/errorService.js
import { db } from '../firebase';
import { addDoc, collection } from 'firebase/firestore';

export const logAppError = async (errorData) => {
  try {
    await addDoc(collection(db, 'app_errors'), {
      message: errorData.message,
      location: errorData.location || window.location.pathname,
      stack: errorData.stack,
      userAgent: navigator.userAgent,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Failed to log error:', error);
  }
};

export const logFrontendError = (error, errorInfo) => {
  logAppError({
    message: error.message,
    stack: error.stack,
    location: window.location.pathname,
    componentStack: errorInfo?.componentStack
  });
};