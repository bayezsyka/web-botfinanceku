import { supabase } from './supabase.js';

/* ─── Konfigurasi tabel — sesuaikan jika nama kolom berubah ─── */
export const TABLE_NAME = 'expenses';
export const DATE_COLUMN = 'expense_date';   // kolom tanggal (DATE atau TIMESTAMPTZ)
export const AMOUNT_COLUMN = 'amount';        // kolom nominal (integer, dalam Rupiah)
export const CATEGORY_COLUMN = 'subject';     // kolom kategori/subjek
export const NOTE_COLUMN = 'subject';         // kolom catatan (sama dengan subject di schema ini)
export const TYPE_COLUMN = null;              // null = tabel hanya pengeluaran, tidak ada kolom type

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

  // Mapping ke format yang dipakai UI
  return (data || []).map((row) => ({
    id: row.id,
    amount: row[AMOUNT_COLUMN],
    category: row[CATEGORY_COLUMN] || '—',
    note: row[NOTE_COLUMN] || '',
    createdAt: row.created_at,
  }));
}
