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

export function normalizeCategory(cat) {
  if (!cat) return 'lain_lain';
  const lowerCat = cat.toLowerCase().trim();
  if (lowerCat === 'makan & minum') return 'makan';
  if (lowerCat === 'operasional') return 'kebutuhan_kos';
  if (lowerCat === 'dan lain-lain' || lowerCat === 'lain-lain') return 'lain_lain';
  return lowerCat;
}

export function formatCategoryDisplay(cat) {
  if (!cat) return '';
  return cat.replace(/_/g, ' ');
}

function mapExpenseRow(row) {
  const rawCat = row.confirmed_category || row.predicted_category || row.category || 'lain_lain';
  const normalizedCat = normalizeCategory(rawCat);

  const predictedCategory = normalizeCategory(row.predicted_category || row.category || 'lain_lain');
  const confirmedCategory = row.confirmed_category ? normalizeCategory(row.confirmed_category) : null;

  return {
    id: row.id,
    workspace_id: row.workspace_id,
    subject: row.subject || '',
    description: row.description || '',
    displayTitle: row.subject || row.description || row.raw_text || 'Tanpa keterangan',
    amount: row.amount || 0,
    rawAmount: row.raw_amount || '',
    category: normalizedCat,
    predictedCategory,
    confirmedCategory,
    isConfirmed: row.is_confirmed === true,
    confidence: row.confidence,
    date: row.expense_date,
    createdAt: row.created_at,
    source: row.source,
    rawText: row.raw_text,

    // For compatibility with older components
    predicted_category: predictedCategory,
    confidence_percent: row.confidence,
    is_confident: row.is_confident,
    confirmed_category: confirmedCategory,
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
