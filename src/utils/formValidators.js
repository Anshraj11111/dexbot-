/**
 * Form validation utilities for login and registration forms.
 * Requirements: 1.1, 1.2
 */

/**
 * Validates the login form fields.
 * @param {{ email: string, password: string }} fields
 * @returns {Record<string, string>} errors object (empty if valid)
 */
export function validateLoginForm({ email, password }) {
  const errors = {};
  if (!email || !email.trim()) errors.email = 'Email is required';
  if (!password || !password.trim()) errors.password = 'Password is required';
  return errors;
}

/**
 * Validates the registration form fields.
 * @param {{ email: string, password: string, displayName: string }} fields
 * @returns {Record<string, string>} errors object (empty if valid)
 */
export function validateRegisterForm({ email, password, displayName }) {
  const errors = {};

  if (!email || !email.trim()) {
    errors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    errors.email = 'Invalid email address';
  }

  if (!password || password.length < 8) {
    errors.password = 'Password must be at least 8 characters';
  }

  if (!displayName || displayName.trim().length < 1) {
    errors.displayName = 'Display name is required';
  } else if (displayName.trim().length > 50) {
    errors.displayName = 'Display name must be 50 characters or less';
  }

  return errors;
}
