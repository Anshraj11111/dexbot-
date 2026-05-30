/**
 * Validates bot registration inputs.
 *
 * @param {string} botId - The bot identifier to register
 * @param {string} ip - The IPv4 address of the bot
 * @param {string[]} existingIds - Array of already-registered bot ID strings
 * @returns {{ valid: true } | { valid: false, error: string }}
 */
export function validateBotRegistration(botId, ip, existingIds) {
  // Defensive: ensure existingIds is an array
  const ids = Array.isArray(existingIds) ? existingIds : [];

  // 1. Validate botId format: 1–64 alphanumeric chars or underscores
  const botIdPattern = /^[A-Za-z0-9_]{1,64}$/;
  if (!botId || !botIdPattern.test(String(botId).trim())) {
    return {
      valid: false,
      error: 'Bot ID must be 1-64 alphanumeric characters or underscores',
    };
  }

  // 2. Validate IPv4 address: four octets 0–255 separated by dots
  const cleanIp = String(ip ?? '').trim();
  const ipv4Pattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const ipMatch = ipv4Pattern.exec(cleanIp);
  if (!ipMatch || ipMatch.slice(1).some((octet) => parseInt(octet, 10) > 255)) {
    return { valid: false, error: 'Invalid IPv4 address' };
  }

  // 3. Check for duplicate botId
  if (ids.includes(String(botId).trim())) {
    return { valid: false, error: 'A robot with this ID is already registered' };
  }

  return { valid: true };
}
