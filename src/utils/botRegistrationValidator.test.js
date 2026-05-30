import { describe, it, expect } from 'vitest';
import { validateBotRegistration } from './botRegistrationValidator.js';

describe('validateBotRegistration', () => {
  // --- Happy path ---
  it('returns valid:true for a valid botId, IP, and empty existingIds', () => {
    expect(validateBotRegistration('bot_01', '192.168.1.100', [])).toEqual({ valid: true });
  });

  it('returns valid:true when existingIds has other IDs but not this one', () => {
    expect(validateBotRegistration('alpha', '10.0.0.1', ['beta', 'gamma'])).toEqual({ valid: true });
  });

  it('accepts botId with all allowed character types (letters, digits, underscores)', () => {
    expect(validateBotRegistration('Bot_123_ABC', '0.0.0.0', [])).toEqual({ valid: true });
  });

  it('accepts a single-character botId', () => {
    expect(validateBotRegistration('A', '255.255.255.255', [])).toEqual({ valid: true });
  });

  it('accepts a 64-character botId', () => {
    const id64 = 'A'.repeat(64);
    expect(validateBotRegistration(id64, '1.2.3.4', [])).toEqual({ valid: true });
  });

  // --- botId format errors ---
  it('rejects an empty botId', () => {
    const result = validateBotRegistration('', '1.2.3.4', []);
    expect(result).toEqual({
      valid: false,
      error: 'Bot ID must be 1-64 alphanumeric characters or underscores',
    });
  });

  it('rejects a botId longer than 64 characters', () => {
    const id65 = 'A'.repeat(65);
    const result = validateBotRegistration(id65, '1.2.3.4', []);
    expect(result).toEqual({
      valid: false,
      error: 'Bot ID must be 1-64 alphanumeric characters or underscores',
    });
  });

  it('rejects a botId with a hyphen', () => {
    const result = validateBotRegistration('bot-01', '1.2.3.4', []);
    expect(result).toEqual({
      valid: false,
      error: 'Bot ID must be 1-64 alphanumeric characters or underscores',
    });
  });

  it('rejects a botId with a space', () => {
    const result = validateBotRegistration('bot 01', '1.2.3.4', []);
    expect(result).toEqual({
      valid: false,
      error: 'Bot ID must be 1-64 alphanumeric characters or underscores',
    });
  });

  it('rejects a botId with special characters', () => {
    const result = validateBotRegistration('bot@01', '1.2.3.4', []);
    expect(result).toEqual({
      valid: false,
      error: 'Bot ID must be 1-64 alphanumeric characters or underscores',
    });
  });

  // --- IP format errors ---
  it('rejects an IP with an octet > 255', () => {
    const result = validateBotRegistration('bot1', '192.168.1.256', []);
    expect(result).toEqual({ valid: false, error: 'Invalid IPv4 address' });
  });

  it('rejects an IP with only three octets', () => {
    const result = validateBotRegistration('bot1', '192.168.1', []);
    expect(result).toEqual({ valid: false, error: 'Invalid IPv4 address' });
  });

  it('rejects an IP with five octets', () => {
    const result = validateBotRegistration('bot1', '1.2.3.4.5', []);
    expect(result).toEqual({ valid: false, error: 'Invalid IPv4 address' });
  });

  it('rejects an empty IP string', () => {
    const result = validateBotRegistration('bot1', '', []);
    expect(result).toEqual({ valid: false, error: 'Invalid IPv4 address' });
  });

  it('rejects a hostname instead of an IP', () => {
    const result = validateBotRegistration('bot1', 'localhost', []);
    expect(result).toEqual({ valid: false, error: 'Invalid IPv4 address' });
  });

  it('rejects an IPv6 address', () => {
    const result = validateBotRegistration('bot1', '::1', []);
    expect(result).toEqual({ valid: false, error: 'Invalid IPv4 address' });
  });

  // --- Duplicate botId errors ---
  it('rejects a botId that already exists in existingIds', () => {
    const result = validateBotRegistration('bot1', '10.0.0.1', ['bot1', 'bot2']);
    expect(result).toEqual({
      valid: false,
      error: 'A robot with this ID is already registered',
    });
  });

  // --- Check order: botId → IP → duplicate ---
  it('reports botId error before IP error when both are invalid', () => {
    const result = validateBotRegistration('bad id!', 'not-an-ip', []);
    expect(result).toEqual({
      valid: false,
      error: 'Bot ID must be 1-64 alphanumeric characters or underscores',
    });
  });

  it('reports IP error before duplicate error when IP is invalid and botId is duplicate', () => {
    const result = validateBotRegistration('bot1', 'bad-ip', ['bot1']);
    expect(result).toEqual({ valid: false, error: 'Invalid IPv4 address' });
  });
});
