import { supabase } from './supabase.js';

/* ─── Konfigurasi tabel — sesuaikan jika nama kolom berubah ─── */
export const TABLE_NAME = 'expenses';
export const DATE_COLUMN = 'expense_date';   // kolom tanggal (DATE atau TIMESTAMPTZ)
export const AMOUNT_COLUMN = 'amount';        // kolom nominal (integer, dalam Rupiah)
export const CATEGORY_COLUMN = 'subject';     // kolom kategori/subjek
export const NOTE_COLUMN = 'subject';         // kolom catatan (sama dengan subject di schema ini)
export const TYPE_COLUMN = null;              // null = tabel hanya pengeluaran, tidak ada kolom type

/**
 * Mapping row Supabase ke format UI, termasuk semua field AI.
 * - `category` sekarang = confirmed_category || predicted_category || subject || 'Belum diklasifikasi'
 * - `subject` tetap dikirim apa adanya (nama transaksi asli).
 */
function mapRow(row) {
  const finalCategory =
    row.confirmed_category ||
    row.predicted_category ||
    row[CATEGORY_COLUMN] ||
    'Belum diklasifikasi';

  const aiStatus = row.is_confirmed ? 'terkonfirmasi' : 'belum dikonfirmasi';

  return {
    id: row.id,
    amount: row[AMOUNT_COLUMN],
    raw_amount: row.raw_amount,
    subject: row[CATEGORY_COLUMN] || '',       // nama transaksi asli
    category: finalCategory,                    // kategori tampilan (final)
    note: row[NOTE_COLUMN] || '',
    createdAt: row.created_at,
    date: row[DATE_COLUMN],
    expense_date: row[DATE_COLUMN],

    // AI fields
    predicted_category: row.predicted_category || null,
    confidence: row.confidence ?? null,
    is_confident: row.is_confident ?? false,
    confirmed_category: row.confirmed_category || null,
    is_confirmed: row.is_confirmed ?? false,
    model_version: row.model_version || null,
    ai_status: aiStatus,
  };
}

/**
 * Ambil semua pengeluaran pada tanggal tertentu, urut terbaru ke lama.
 * @param {string} date - format YYYY-MM-DD
 * @returns {Promise<Array>}
 */
export async function getExpensesByDate(date) {
  // Rentang hari: 00:00:00 – 23:59:59 WIB (UTC+7)
  console.log('Fetching for date:', date);
  let query = supabase
    .from(TABLE_NAME)
    .select('*')
    .eq(DATE_COLUMN, date)
    .order('created_at', { ascending: false });

  // Jika ada TYPE_COLUMN, filter hanya pengeluaran
  if (TYPE_COLUMN) {
    query = query.eq(TYPE_COLUMN, 'expense');
  }

  const { data, error } = await query;
  console.log('Supabase Response:', { data, error });

  if (error) {
    throw new Error(`Supabase error: ${error.message}`);
  }

  return (data || []).map(mapRow);
}

/**
 * Ambil semua pengeluaran dalam rentang tanggal (inklusif).
 * @param {string} startDate - format YYYY-MM-DD
 * @param {string} endDate   - format YYYY-MM-DD
 * @returns {Promise<Array>}
 */
export async function getExpensesByRange(startDate, endDate) {
  let query = supabase
    .from(TABLE_NAME)
    .select('*')
    .gte(DATE_COLUMN, startDate)
    .lte(DATE_COLUMN, endDate)
    .order('created_at', { ascending: true });

  if (TYPE_COLUMN) {
    query = query.eq(TYPE_COLUMN, 'expense');
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Supabase error: ${error.message}`);
  }

  return (data || []).map(mapRow);
}

/**
 * Ambil semua transaksi (tanpa filter tanggal) — dipakai oleh panel AI.
 * Urut terbaru dulu, max `limit` baris.
 * @param {number} limit
 * @returns {Promise<Array>}
 */
export async function getAllExpenses(limit = 200) {
  let query = supabase
    .from(TABLE_NAME)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (TYPE_COLUMN) {
    query = query.eq(TYPE_COLUMN, 'expense');
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Supabase error: ${error.message}`);
  }

  return (data || []).map(mapRow);
}
