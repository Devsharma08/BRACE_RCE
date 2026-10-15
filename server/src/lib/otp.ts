/** Generate a 6-digit numeric one-time password. */
export function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}
