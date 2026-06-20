/**
 * WhatsApp / phone number helpers (plan §11). Numbers are stored as digits
 * with a country code and no `+`/spaces (e.g. "6591234567"), which is exactly
 * the form `wa.me/<number>` links need. Pure functions — unit-testable and
 * reused by the client form, the booking confirmation buttons, and tests.
 */

/**
 * Normalize free-text input to storage form (digits + country code, no `+`).
 * A bare 8-digit local Singapore mobile gets a `65` prefix; anything already
 * carrying a country code (10–15 digits) is kept as-is. Returns null if it
 * can't be a valid number.
 */
export function normalizeWhatsapp(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 8) return `65${digits}`;
  if (digits.length >= 10 && digits.length <= 15) return digits;
  return null;
}

/**
 * Format a stored number for display / dialling, in `+65…` form. Singapore
 * numbers (65 + 8 digits) are grouped as "+65 9123 4567"; everything else is
 * shown as "+<digits>".
 */
export function formatWhatsappDisplay(stored: string): string {
  const digits = stored.replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("65")) {
    return `+65 ${digits.slice(2, 6)} ${digits.slice(6)}`;
  }
  return `+${digits}`;
}
