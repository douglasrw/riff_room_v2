/**
 * LocalStorage helpers for persisting app state
 */

const PROCESSING_CLIENT_ID_KEY = 'riffroom_processing_client_id';
const PROCESSING_TIMESTAMP_KEY = 'riffroom_processing_timestamp';

export interface ProcessingSession {
  clientId: string;
  timestamp: number;
}

/**
 * Store processing session for resume capability
 */
export const storeProcessingSession = (clientId: string): void => {
  try {
    localStorage.setItem(PROCESSING_CLIENT_ID_KEY, clientId);
    localStorage.setItem(PROCESSING_TIMESTAMP_KEY, Date.now().toString());
  } catch (error) {
    console.error('Failed to store processing session:', error);
  }
};

/**
 * Get stored processing session if it exists and is recent (< 5 minutes)
 */
export const getProcessingSession = (): ProcessingSession | null => {
  try {
    const clientId = localStorage.getItem(PROCESSING_CLIENT_ID_KEY);
    const timestamp = localStorage.getItem(PROCESSING_TIMESTAMP_KEY);

    if (!clientId || !timestamp) {
      return null;
    }

    const sessionAge = Date.now() - parseInt(timestamp, 10);
    const fiveMinutes = 5 * 60 * 1000;

    // Session expired (> 5 minutes old)
    if (sessionAge > fiveMinutes) {
      clearProcessingSession();
      return null;
    }

    return {
      clientId,
      timestamp: parseInt(timestamp, 10),
    };
  } catch (error) {
    console.error('Failed to get processing session:', error);
    return null;
  }
};

/**
 * Clear stored processing session
 */
export const clearProcessingSession = (): void => {
  try {
    localStorage.removeItem(PROCESSING_CLIENT_ID_KEY);
    localStorage.removeItem(PROCESSING_TIMESTAMP_KEY);
  } catch (error) {
    console.error('Failed to clear processing session:', error);
  }
};
