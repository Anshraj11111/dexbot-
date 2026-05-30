/**
 * Emotion color mappings for the DexBot control dashboard.
 *
 * Maps each EmotionType to its designated hex color for use in
 * UI components such as the emotion selector and RGB lighting controls.
 */

/** Array of all supported emotion type identifiers. */
export const EMOTION_TYPES = ['HAPPY', 'SAD', 'ANGRY', 'SLEEPY', 'EXCITED', 'NEUTRAL'];

/**
 * Maps each EmotionType to its exact hex color.
 *
 * @type {Record<string, string>}
 */
export const EMOTION_COLORS = {
  HAPPY: '#FFD700',
  SAD: '#4169E1',
  ANGRY: '#FF2020',
  SLEEPY: '#4B0082',
  EXCITED: '#00C853',
  NEUTRAL: '#FFFFFF',
};

/**
 * Returns the hex color for the given emotion type.
 * Falls back to '#FFFFFF' for unknown emotions.
 *
 * @param {string} emotion - An EmotionType string (e.g. 'HAPPY').
 * @returns {string} The hex color string.
 */
export function getEmotionColor(emotion) {
  return EMOTION_COLORS[emotion] ?? '#FFFFFF';
}
