/**
 * OTA file validation utility.
 * Requirements: 10.1
 */

/**
 * Validates that a firmware filename ends with .bin (case-insensitive).
 * @param {string} filename
 * @returns {{ valid: true } | { valid: false, error: string }}
 */
export function validateOtaFile(filename) {
  if (!filename || typeof filename !== 'string') {
    return { valid: false, error: 'Only .bin firmware files are supported' };
  }
  if (filename.toLowerCase().endsWith('.bin')) {
    return { valid: true };
  }
  return { valid: false, error: 'Only .bin firmware files are supported' };
}
