/**
 * Validates a hex color string.
 *
 * Accepts exactly 6 hexadecimal characters (0-9, a-f, A-F),
 * optionally prefixed with a '#'.
 *
 * @param {*} input - The value to validate.
 * @returns {{ valid: true } | { valid: false, error: string }}
 */
export function validateHexColor(input) {
  if (input == null || typeof input !== 'string') {
    return { valid: false, error: 'Invalid hex color' };
  }

  // Strip optional leading '#'
  const stripped = input.startsWith('#') ? input.slice(1) : input;

  // Must be exactly 6 hex characters
  if (/^[0-9a-fA-F]{6}$/.test(stripped)) {
    return { valid: true };
  }

  return { valid: false, error: 'Invalid hex color' };
}
