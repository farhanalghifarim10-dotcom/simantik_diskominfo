/**
 * Helper utilitas untuk sanitasi dan escaping HTML serta penanganan email header injection.
 */

/**
 * Melakukan escape 5 karakter rentan HTML (&, <, >, ", ')
 * Mencegah injeksi tag HTML atau skrip jahat pada template email dan tampilan web.
 */
export function escapeHtml(input: string | null | undefined): string {
  if (input === null || input === undefined) return '';
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Mengubah karakter baris baru (\r\n atau \n) menjadi tag HTML <br />.
 * PENTING: Penggantian ini HANYA boleh dilakukan SETELAH seluruh string di-escape dengan escapeHtml.
 */
export function formatHtmlParagraph(input: string | null | undefined): string {
  if (input === null || input === undefined) return '';
  const escaped = escapeHtml(input);
  return escaped.replace(/\r\n|\n|\r/g, '<br />');
}

/**
 * Membersihkan karakter CRLF (\r dan \n) dari baris subjek email
 * Mencegah email header injection / CRLF injection.
 */
export function sanitizeEmailSubject(subject: string | null | undefined): string {
  if (subject === null || subject === undefined) return '';
  return String(subject).replace(/[\r\n]+/g, ' ').trim();
}
