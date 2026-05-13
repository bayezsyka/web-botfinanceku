import { supabase } from './supabase.js';

/* ─── Konfigurasi tabel — sesuaikan jika nama kolom berubah ─── */
export const TABLE_NAME = 'expenses';
export const DATE_COLUMN = 'expense_date';   // kolom tanggal (DATE atau TIMESTAMPTZ)
export const AMOUNT_COLUMN = 'amount';        // kolom nominal (integer, dalam Rupiah)
export const CATEGORY_COLUMN = 'subject';     // kolom kategori/subjek
export const NOTE_COLUMN = 'subject';         // kolom catatan (sama dengan subject di schema ini)
export const TYPE_COLUMN = null;              // null = tabel hanya pengeluaran, tidak ada kolom type

function applyWorkspaceFilter(query, workspaceId) {
  if (!workspaceId) {
    return query;
  }

  return query.eq('workspace_id', workspaceId);
}

function mapExpenseRow(row) {
  const finalCategory =
    row.confirmed_category ||
    row.predicted_category ||
    'Belum diklasifikasi';

  return {
    id: row.id,
    subject: row.subject || '',
    amount: row.amount || 0,
    raw_amount: row.raw_amount || '',
    category: finalCategory,
    final_category: finalCategory,
    note: row.subject || '',
    createdAt: row.created_at,
    date: row.expense_date,

    predicted_category: row.predicted_category,
    confidence: row.confidence,
    is_confident: row.is_confident,
    confirmed_category: row.confirmed_category,
    is_confirmed: row.is_confirmed === true,
    model_version: row.model_version,
  };
}

/**
 * Ambil semua pengeluaran pada tanggal tertentu, urut terbaru ke lama.
 * @param {string} date - format YYYY-MM-DD
 * @param {string | null | undefined} workspaceId
 * @returns {Promise<Array>}
 */
export async function getExpensesByDate(date, workspaceId) {
  console.log('Fetching for date:', date);
  let query = applyWorkspaceFilter(
    supabase
    .from(TABLE_NAME)
    .select('*')
    .eq(DATE_COLUMN, date)
    .order('created_at', { ascending: false }),
    workspaceId
  );

  if (TYPE_COLUMN) {
    query = query.eq(TYPE_COLUMN, 'expense');
  }

  const { data, error } = await query;
  console.log('Supabase Response:', { data, error });

  if (error) {
    throw new Error(`Supabase error: ${error.message}`);
  }

  return (data || []).map(mapExpenseRow);
}

/**
 * Ambil semua pengeluaran dalam rentang tanggal (inklusif).
 * @param {string} startDate - format YYYY-MM-DD
 * @param {string} endDate   - format YYYY-MM-DD
 * @param {string | null | undefined} workspaceId
 * @returns {Promise<Array>}
 */
export async function getExpensesByRange(startDate, endDate, workspaceId) {
  let query = applyWorkspaceFilter(
    supabase
    .from(TABLE_NAME)
    .select('*')
    .gte(DATE_COLUMN, startDate)
    .lte(DATE_COLUMN, endDate)
    .order('created_at', { ascending: true }),
    workspaceId
  );

  if (TYPE_COLUMN) {
    query = query.eq(TYPE_COLUMN, 'expense');
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Supabase error: ${error.message}`);
  }

  return (data || []).map(mapExpenseRow);
}

/**
 * Ambil semua transaksi (tanpa filter tanggal) — dipakai oleh panel AI.
 * Urut terbaru dulu, max `limit` baris.
 * @param {number} limit
 * @param {string | null | undefined} workspaceId
 * @returns {Promise<Array>}
 */
export async function getAllExpenses(limit = 200, workspaceId) {
  let query = applyWorkspaceFilter(
    supabase
    .from(TABLE_NAME)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit),
    workspaceId
  );

  if (TYPE_COLUMN) {
    query = query.eq(TYPE_COLUMN, 'expense');
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Supabase error: ${error.message}`);
  }

  return (data || []).map(mapExpenseRow);
}
