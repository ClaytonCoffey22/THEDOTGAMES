import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a unique, consistent device fingerprint using available browser data
 * This creates a more sophisticated fingerprint than a random UUID while still
 * being privacy-friendly and consistent across sessions
 */
export const generateDeviceFingerprint = (): string => {
  try {
    // Get device-specific information
    const components = [
      navigator.userAgent,
      navigator.language,
      navigator.platform,
      `${screen.width}x${screen.height}x${screen.colorDepth}`,
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      (navigator as any).deviceMemory || 'unknown',
      navigator.hardwareConcurrency || 'unknown',
      // Add more entropy with a session-specific UUID
      sessionStorage.getItem('session_id') || uuidv4()
    ];

    // Store session ID if not already present
    if (!sessionStorage.getItem('session_id')) {
      sessionStorage.setItem('session_id', components[components.length - 1]);
    }

    // Create a canvas fingerprint
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      canvas.width = 200;
      canvas.height = 50;
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125,1,62,20);
      ctx.fillStyle = '#069';
      ctx.fillText('TheDotGames', 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('TheDotGames', 4, 17);
      
      // Add canvas data to components
      components.push(canvas.toDataURL());
    }

    // Join all components and create a hash
    const fingerprint = components.join('|||');
    
    // Create a base64 hash and clean it up
    const cleanFingerprint = btoa(fingerprint)
      .replace(/[+/]/g, '') // Remove non-alphanumeric chars
      .substring(0, 32); // Keep it a reasonable length

    return cleanFingerprint;
  } catch (error) {
    console.error('Error generating device fingerprint:', error);
    // Fallback to UUID if something goes wrong
    return uuidv4();
  }
};

/**
 * Get the stored device fingerprint or generate and store a new one
 */
export const getDeviceFingerprint = (): string => {
  try {
    const stored = localStorage.getItem('dot_games_device_id');
    if (stored) return stored;

    const newFingerprint = generateDeviceFingerprint();
    localStorage.setItem('dot_games_device_id', newFingerprint);
    return newFingerprint;
  } catch (error) {
    console.error('Error getting device fingerprint:', error);
    const fallbackId = uuidv4();
    localStorage.setItem('dot_games_device_id', fallbackId);
    return fallbackId;
  }
};

/**
 * Clear the stored device fingerprint
 * Useful for testing or when user wants to register again
 */
export const clearDeviceFingerprint = (): void => {
  try {
    localStorage.removeItem('dot_games_device_id');
    sessionStorage.removeItem('session_id');
  } catch (error) {
    console.error('Error clearing device fingerprint:', error);
  }
};