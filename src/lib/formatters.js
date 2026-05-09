/**
 * Format angka ke format Rupiah Indonesia
 * @param {number} amount
 * @returns {string}
 */
export function formatRupiah(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
    .format(amount)
    .replace('IDR', 'Rp')
    .trim();
}

/**
 * Format tanggal ke format Indonesia (hari, dd MMMM yyyy)
 * @param {string|Date} date
 * @returns {string}
 */
export function formatTanggalIndonesia(date) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format jam dari ISO string ke HH:mm
 * @param {string} isoString
 * @returns {string}
 */
export function formatJam(isoString) {
  const d = new Date(isoString);
  return d.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Jakarta',
  });
}

/**
 * Format tanggal ke YYYY-MM-DD (local Jakarta)
 * @param {Date} date
 * @returns {string}
 */
export function toDateString(date) {
  // Gunakan timezone Asia/Jakarta
  const opts = { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Jakarta' };
  const parts = new Intl.DateTimeFormat('en-CA', opts).format(date); // en-CA menghasilkan YYYY-MM-DD
  return parts;
}
