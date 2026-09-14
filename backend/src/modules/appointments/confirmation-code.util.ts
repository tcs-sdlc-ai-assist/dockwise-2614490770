/**
 * Confirmation code generator: unguessable human-readable codes.
 *
 * Codes are 8 characters drawn from an alphabet with no ambiguous letters
 * (no 0/O, 1/I/L, etc.) so sequential IDs cannot expose appointments and codes
 * stay readable over the radio.
 */
import { randomInt } from 'crypto';

/** Alphabet with ambiguous characters removed (no 0/O/1/I/L). */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** Default code length (within the recommended 6-8 range). */
const CODE_LENGTH = 8;

/**
 * Generate an unguessable human-readable confirmation code.
 *
 * Args:
 *   length: The code length (defaults to 8).
 *
 * Returns:
 *   A cryptographically random code with no ambiguous letters.
 */
export function generateConfirmationCode(length = CODE_LENGTH): string {
  let code = '';
  for (let i = 0; i < length; i += 1) {
    code += ALPHABET[randomInt(0, ALPHABET.length)];
  }
  return code;
}
