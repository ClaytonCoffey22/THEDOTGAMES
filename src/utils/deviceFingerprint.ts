// Utility to generate and manage device fingerprints
import { createHash } from 'crypto';

/**
 * Generate a unique, consistent device fingerprint using available browser data
 * This creates a more sophisticated fingerprint than a random UUID while still
 * being privacy-friendly and consistent across sessions
 */
export const generateDeviceFingerprint = (): string => {
  try {
    const components = [
      navigator.userAgent,
      navigator.language,
      navigator.platform,
      `${screen.width}x${screen.height}x${screen.colorDepth}`,
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      (navigator as any).deviceMemory || 'unknown',
      navigator.hardwareConcurrency || 'unknown'
    ];

    // Create a canvas fingerprint
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('TheDotGames', 2, 2);
      components.push(canvas.toDataURL().slice(-50));
    }

    // Join all components and create a hash
    const fingerprint = components.join('|||');
    
    // Create a base64 hash and clean it up
    return btoa(fingerprint)
      .replace(/[+/]/g, '') // Remove non-alphanumeric chars
      .substring(0, 32); // Keep it a reasonable length
  } catch (error) {
    console.error('Error generating device fingerprint:', error);
    // Fallback to timestamp + random if something goes wrong
    return `${Date.now()}-${Math.random().toString(36).substring(2)}`;
  }
};

/**
 * Get the stored device fingerprint or generate and store a new one
 */
export const getDeviceFingerprint = (): string => {
  const stored = localStorage.getItem('dot_games_device_id');
  if (stored) return stored;

  const newFingerprint = generateDeviceFingerprint();
  localStorage.setItem('dot_games_device_id', newFingerprint);
  return newFingerprint;
};