export const VALID_CATEGORIES = [
  'makan',
  'jajan',
  'kebutuhan_kos',
  'tagihan',
  'laundry',
  'transportasi',
  'kesehatan',
  'hiburan',
  'sosial',
  'belanja_pribadi',
  'edukasi',
  'lain_lain',
];

export async function confirmTransactionCategory(transaction, category) {
  if (!transaction?.id) {
    return { success: false, supabaseOk: false, aiOk: false, message: 'ID transaksi tidak ditemukan.' };
  }

  if (!transaction?.subject) {
    return { success: false, supabaseOk: false, aiOk: false, message: 'Subject transaksi kosong.' };
  }

  if (typeof transaction?.amount !== 'number' || Number.isNaN(transaction.amount)) {
    return { success: false, supabaseOk: false, aiOk: false, message: 'Amount transaksi tidak valid.' };
  }

  if (!VALID_CATEGORIES.includes(category)) {
    return { success: false, supabaseOk: false, aiOk: false, message: `Kategori "${category}" tidak valid.` };
  }

  try {
    const response = await fetch('/ai/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        expense_id: transaction.id,
        subject: transaction.subject,
        amount: transaction.amount,
        correct_category: category,
      }),
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        success: false,
        supabaseOk: false,
        aiOk: false,
        message: result?.detail || 'Konfirmasi gagal.',
      };
    }

    return {
      success: true,
      supabaseOk: true,
      aiOk: true,
      message: 'Kategori disimpan. AI ikut dilatih.',
      result,
    };
  } catch (error) {
    console.error('Konfirmasi AI gagal:', error);

    return {
      success: false,
      supabaseOk: false,
      aiOk: false,
      message: 'Gagal menghubungi AI service.',
    };
  }
}
