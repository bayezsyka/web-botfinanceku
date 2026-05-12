import { supabase } from './supabase.js';
import { TABLE_NAME } from './transactions.js';

/**
 * Daftar kategori resmi yang diterima sistem.
 */
export const VALID_CATEGORIES = [
  'makan & minum',
  'jajan',
  'operasional',
  'dan lain-lain',
];

/**
 * Konfirmasi kategori transaksi:
 * 1. Update row di Supabase (confirmed_category + is_confirmed)
 * 2. Kirim feedback ke AI service via /ai/feedback
 *
 * @param {{ id: string, subject: string, amount: number }} transaction
 * @param {string} category — salah satu dari VALID_CATEGORIES
 * @returns {Promise<{ success: boolean, supabaseOk: boolean, aiOk: boolean, message: string }>}
 */
export async function confirmTransactionCategory(transaction, category) {
  // ── Validasi ──
  if (!transaction?.subject || typeof transaction.subject !== 'string' || transaction.subject.trim() === '') {
    return {
      success: false,
      supabaseOk: false,
      aiOk: false,
      message: 'Subject transaksi kosong. Tidak bisa mengirim feedback.',
    };
  }

  if (typeof transaction?.amount !== 'number' || isNaN(transaction.amount)) {
    return {
      success: false,
      supabaseOk: false,
      aiOk: false,
      message: 'Amount bukan angka valid. Tidak bisa mengirim feedback.',
    };
  }

  if (!VALID_CATEGORIES.includes(category)) {
    return {
      success: false,
      supabaseOk: false,
      aiOk: false,
      message: `Kategori "${category}" tidak dikenali.`,
    };
  }

  // ── 1. Update Supabase ──
  let supabaseOk = false;
  try {
    const { error } = await supabase
      .from(TABLE_NAME)
      .update({
        confirmed_category: category,
        is_confirmed: true,
      })
      .eq('id', transaction.id);

    if (error) throw error;
    supabaseOk = true;
  } catch (err) {
    console.error('Supabase update gagal:', err);
    return {
      success: false,
      supabaseOk: false,
      aiOk: false,
      message: 'Gagal menyimpan konfirmasi ke database.',
    };
  }

  // ── 2. Kirim feedback ke AI service ──
  let aiOk = false;
  try {
    const res = await fetch('/ai/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject: transaction.subject,
        amount: transaction.amount,
        correct_category: category,
      }),
    });

    if (!res.ok) {
      throw new Error(`AI service responded ${res.status}`);
    }
    aiOk = true;
  } catch (err) {
    console.error('AI feedback gagal:', err);
  }

  // ── Hasil ──
  if (supabaseOk && aiOk) {
    return {
      success: true,
      supabaseOk: true,
      aiOk: true,
      message: 'Kategori disimpan. AI ikut dilatih.',
    };
  }

  if (supabaseOk && !aiOk) {
    return {
      success: true,
      supabaseOk: true,
      aiOk: false,
      message: 'Kategori dikonfirmasi, tapi latihan AI gagal. Coba lagi nanti.',
    };
  }

  return {
    success: false,
    supabaseOk: false,
    aiOk: false,
    message: 'Terjadi kesalahan.',
  };
}
