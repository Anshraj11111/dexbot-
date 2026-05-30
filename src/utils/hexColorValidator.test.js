import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { validateHexColor } from './hexColorValidator.js';

// ─── Unit Tests ───────────────────────────────────────────────────────────────

describe('validateHexColor — valid inputs', () => {
  it('accepts a 6-char uppercase hex string with #', () => {
    expect(validateHexColor('#FF00FF')).toEqual({ valid: true });
  });

  it('accepts a 6-char lowercase hex string with #', () => {
    expect(validateHexColor('#ff00ff')).toEqual({ valid: true });
  });

  it('accepts a 6-char hex string without #', () => {
    expect(validateHexColor('FF00FF')).toEqual({ valid: true });
  });

  it('accepts a 6-char lowercase hex string without #', () => {
    expect(validateHexColor('ff00ff')).toEqual({ valid: true });
  });

  it('accepts mixed-case hex string', () => {
    expect(validateHexColor('#aAbBcC')).toEqual({ valid: true });
  });

  it('accepts all-zeros', () => {
    expect(validateHexColor('000000')).toEqual({ valid: true });
  });

  it('accepts all-Fs', () => {
    expect(validateHexColor('FFFFFF')).toEqual({ valid: true });
  });
});

describe('validateHexColor — invalid inputs', () => {
  it('rejects a 5-char hex string with #', () => {
    expect(validateHexColor('#FF00F')).toEqual({ valid: false, error: 'Invalid hex color' });
  });

  it('rejects a 7-char hex string with #', () => {
    expect(validateHexColor('#FF00FFF')).toEqual({ valid: false, error: 'Invalid hex color' });
  });

  it('rejects a 5-char hex string without #', () => {
    expect(validateHexColor('FF00F')).toEqual({ valid: false, error: 'Invalid hex color' });
  });

  it('rejects non-hex characters', () => {
    expect(validateHexColor('GGGGGG')).toEqual({ valid: false, error: 'Invalid hex color' });
  });

  it('rejects non-hex characters with #', () => {
    expect(validateHexColor('#GGGGGG')).toEqual({ valid: false, error: 'Invalid hex color' });
  });

  it('rejects an empty string', () => {
    expect(validateHexColor('')).toEqual({ valid: false, error: 'Invalid hex color' });
  });

  it('rejects null', () => {
    expect(validateHexColor(null)).toEqual({ valid: false, error: 'Invalid hex color' });
  });

  it('rejects undefined', () => {
    expect(validateHexColor(undefined)).toEqual({ valid: false, error: 'Invalid hex color' });
  });

  it('rejects a number', () => {
    expect(validateHexColor(123456)).toEqual({ valid: false, error: 'Invalid hex color' });
  });

  it('rejects a string with spaces', () => {
    expect(validateHexColor('FF 00FF')).toEqual({ valid: false, error: 'Invalid hex color' });
  });

  it('rejects a bare # with no digits', () => {
    expect(validateHexColor('#')).toEqual({ valid: false, error: 'Invalid hex color' });
  });

  it('rejects a 3-char shorthand hex', () => {
    expect(validateHexColor('#FFF')).toEqual({ valid: false, error: 'Invalid hex color' });
  });
});

// ─── Property-Based Tests ─────────────────────────────────────────────────────
// Feature: dexbot-control-dashboard, Property 8: Hex Color Validator

describe('validateHexColor — property-based tests', () => {
  /**
   * Property: any string of exactly 6 characters drawn from [0-9a-fA-F],
   * with or without a leading '#', is always valid.
   *
   * Validates: Requirements 6.6, 6.8
   */
  it('always accepts exactly 6 hex chars (with or without #)', () => {
    const hexChar = fc.constantFrom(
      '0','1','2','3','4','5','6','7','8','9',
      'a','b','c','d','e','f',
      'A','B','C','D','E','F'
    );
    const sixHexChars = fc.array(hexChar, { minLength: 6, maxLength: 6 })
      .map((chars) => chars.join(''));
    const withOrWithoutHash = fc.boolean().chain((useHash) =>
      sixHexChars.map((hex) => (useHash ? '#' + hex : hex))
    );

    fc.assert(
      fc.property(withOrWithoutHash, (input) => {
        const result = validateHexColor(input);
        return result.valid === true;
      }),
      { numRuns: 200 }
    );
  });

  /**
   * Property: any string whose stripped length is not exactly 6 is always invalid.
   *
   * Validates: Requirements 6.6, 6.8
   */
  it('always rejects strings whose hex portion is not exactly 6 chars', () => {
    const hexChar = fc.constantFrom(
      '0','1','2','3','4','5','6','7','8','9',
      'a','b','c','d','e','f',
      'A','B','C','D','E','F'
    );
    // Generate hex-only strings of length 0–5 or 7–12 (never 6)
    const wrongLength = fc.oneof(
      fc.array(hexChar, { minLength: 0, maxLength: 5 }),
      fc.array(hexChar, { minLength: 7, maxLength: 12 })
    ).map((chars) => chars.join(''));

    const withOrWithoutHash = fc.boolean().chain((useHash) =>
      wrongLength.map((hex) => (useHash ? '#' + hex : hex))
    );

    fc.assert(
      fc.property(withOrWithoutHash, (input) => {
        const result = validateHexColor(input);
        return result.valid === false && result.error === 'Invalid hex color';
      }),
      { numRuns: 200 }
    );
  });

  /**
   * Property: any 6-character string containing at least one non-hex character
   * is always invalid.
   *
   * Validates: Requirements 6.6, 6.8
   */
  it('always rejects 6-char strings with non-hex characters', () => {
    // Characters outside the hex alphabet
    const nonHexChar = fc.char().filter(
      (c) => !/^[0-9a-fA-F]$/.test(c)
    );
    const hexChar = fc.constantFrom(
      '0','1','2','3','4','5','6','7','8','9',
      'a','b','c','d','e','f',
      'A','B','C','D','E','F'
    );

    // Build a 6-char string with at least one non-hex char injected at a random position
    const sixCharsWithNonHex = fc.tuple(
      fc.array(hexChar, { minLength: 5, maxLength: 5 }),
      nonHexChar,
      fc.integer({ min: 0, max: 5 })
    ).map(([hexChars, bad, pos]) => {
      const arr = [...hexChars];
      arr.splice(pos, 0, bad);
      return arr.slice(0, 6).join('');
    });

    fc.assert(
      fc.property(sixCharsWithNonHex, (input) => {
        const result = validateHexColor(input);
        return result.valid === false && result.error === 'Invalid hex color';
      }),
      { numRuns: 200 }
    );
  });

  /**
   * Property: null, undefined, and non-string values are always invalid.
   *
   * Validates: Requirements 6.6, 6.8
   */
  it('always rejects null, undefined, and non-string values', () => {
    const nonString = fc.oneof(
      fc.constant(null),
      fc.constant(undefined),
      fc.integer(),
      fc.float(),
      fc.boolean(),
      fc.object()
    );

    fc.assert(
      fc.property(nonString, (input) => {
        const result = validateHexColor(input);
        return result.valid === false && result.error === 'Invalid hex color';
      }),
      { numRuns: 200 }
    );
  });
});
