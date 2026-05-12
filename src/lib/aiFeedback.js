import { supabase } from './supabase.js';
import { TABLE_NAME } from './transactions.js';

export const VALID_CATEGORIES = [
  'makan & minum',
  'jajan',
  'operasional',
  'dan lain-lain',
];

export async function confirmTransactionCategory(transaction, category) {
  if (!transaction?.id) {
    return {
      success: false,
      supabaseOk: false,
      aiOk: false,
      message: 'ID transaksi tidak ditemukan. Data tidak bisa dikonfirmasi.',
    };
  }

  if (!transaction?.subject || typeof transaction.subject !== 'string' || transaction.subject.trim() === '') {
    return {
      success: false,
      supabaseOk: false,
      aiOk: false,
      message: 'Subject transaksi kosong. Tidak bisa mengirim feedback.',
    };
  }

  if (typeof transaction?.amount !== 'number' || Number.isNaN(transaction.amount)) {
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

  const { data: updatedRow, error: updateError } = await supabase
    .from(TABLE_NAME)
    .update({
      confirmed_category: category,
      is_confirmed: true,
    })
    .eq('id', transaction.id)
    .select('id, subject, confirmed_category, is_confirmed')
    .single();

  if (updateError) {
    console.error('Supabase update gagal:', updateError);

    return {
      success: false,
      supabaseOk: false,
      aiOk: false,
      message: `Gagal menyimpan konfirmasi ke database: ${updateError.message}`,
    };
  }

  if (!updatedRow?.id || updatedRow.is_confirmed !== true) {
    console.error('Supabase update tidak mengubah row:', {
      transaction,
      category,
      updatedRow,
    });

    return {
      success: false,
      supabaseOk: false,
      aiOk: false,
      message: 'Database tidak berubah. Cek ID transaksi atau izin update Supabase.',
    };
  }

  let aiOk = false;

  try {
    const res = await fetch('/ai/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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

  if (aiOk) {
    return {
      success: true,
      supabaseOk: true,
      aiOk: true,
      message: 'Kategori disimpan. AI ikut dilatih.',
      updatedRow,
    };
  }

  return {
    success: true,
    supabaseOk: true,
    aiOk: false,
    message: 'Kategori dikonfirmasi, tapi latihan AI gagal. Coba lagi nanti.',
    updatedRow,
  };
}
