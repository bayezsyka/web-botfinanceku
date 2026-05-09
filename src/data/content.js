// Konten utama website BotFinanceku

export const navLinks = [
  { label: 'Beranda', target: '#beranda' },
  { label: 'Fitur', target: '#fitur' },
  { label: 'Alur', target: '#alur' },
  { label: 'Manfaat', target: '#manfaat' },
];

export const hero = {
  title: 'Catatan Keuangan yang Lebih Tertata',
  subtitle:
    'BotFinanceku membantu mencatat pemasukan, pengeluaran, dan ringkasan keuangan harian dengan cara yang sederhana.',
  ctaPrimary: 'Lihat Gambaran',
  ctaSecondary: 'Pelajari Alur',
  mockup: {
    date: 'Sabtu, 10 Mei 2026',
    pemasukan: 'Rp 1.500.000',
    pengeluaran: 'Rp 420.000',
    saldo: 'Rp 1.080.000',
    catatan: [
      { label: '💰 Gaji Freelance', nominal: '+Rp 1.500.000' },
      { label: '🛒 Belanja Dapur', nominal: '-Rp 230.000' },
      { label: '🚌 Transportasi', nominal: '-Rp 190.000' },
    ],
  },
};

export const features = [
  {
    emoji: '💵',
    title: 'Catat Pemasukan',
    desc: 'Tambahkan pemasukan harian dengan cepat — dari gaji, hasil usaha, sampai bonus kecil sekalipun.',
  },
  {
    emoji: '🧾',
    title: 'Catat Pengeluaran',
    desc: 'Rekam setiap pengeluaran agar tidak ada yang terlewat dan keuangan tetap terkontrol.',
  },
  {
    emoji: '📊',
    title: 'Ringkasan Harian',
    desc: 'Dapatkan ringkasan saldo, pemasukan, dan pengeluaran hari ini dalam sekali lihat.',
  },
  {
    emoji: '🗂️',
    title: 'Arsip Transaksi',
    desc: 'Semua catatan tersimpan rapi dan bisa ditinjau kapan saja sesuai kebutuhan.',
  },
];

export const steps = [
  {
    number: '01',
    title: 'Tulis Catatan',
    desc: 'Catat transaksi harian secara langsung — cukup dengan perintah sederhana, tanpa form yang rumit.',
  },
  {
    number: '02',
    title: 'Data Tersusun',
    desc: 'Setiap catatan otomatis dikategorikan dan disimpan dengan rapi sesuai tanggal dan jenisnya.',
  },
  {
    number: '03',
    title: 'Ringkasan Terbaca',
    desc: 'Kapan pun dibutuhkan, ringkasan keuangan sudah siap — jelas, lengkap, dan mudah dipahami.',
  },
];

export const benefits = [
  {
    emoji: '📈',
    text: 'Keuangan lebih mudah dipantau setiap hari',
  },
  {
    emoji: '🏪',
    text: 'Cocok untuk kebutuhan pribadi maupun usaha kecil',
  },
  {
    emoji: '📱',
    text: 'Tidak perlu membuka banyak aplikasi sekaligus',
  },
  {
    emoji: '✅',
    text: 'Ringan untuk dijadikan kebiasaan harian',
  },
];

export const cta = {
  title: 'Mulai dari Catatan Kecil, Jadi Kendali yang Lebih Baik',
  button: 'Siapkan BotFinanceku',
};

export const footer = {
  tagline: 'BotFinanceku — Rapi mencatat, tenang mengelola.',
  year: new Date().getFullYear(),
};
