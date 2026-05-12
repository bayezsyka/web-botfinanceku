import { useState, useEffect, useCallback } from 'react';
import { getExpensesByDate } from './lib/transactions.js';
import { formatRupiah, formatTanggalIndonesia, formatJam, toDateString } from './lib/formatters.js';
import AnalysisPage from './AnalysisPage.jsx';

/* ─── Helper ─── */
function getTodayStr() {
  return toDateString(new Date());
}

function offsetDate(dateStr, days) {
  const d = new Date(dateStr + 'T12:00:00'); // Noon to avoid DST edge
  d.setDate(d.getDate() + days);
  return toDateString(d);
}

/* ─── HEADER ─── */
function Header() {
  return (
    <header className="app-header" role="banner">
      <div className="app-header__inner">
        <span className="app-header__icon" aria-hidden="true">💰</span>
        <div>
          <h1 className="app-header__title">Riwayat Pengeluaran</h1>
          <p className="app-header__subtitle">Catatan pengeluaran harian</p>
        </div>
      </div>
    </header>
  );
}

/* ─── DATE NAV ─── */
function DateNav({ selectedDate, onDateChange }) {
  const today = getTodayStr();
  const isToday = selectedDate === today;
  const isFuture = selectedDate > today;

  return (
    <nav className="date-nav" aria-label="Navigasi tanggal">
      <div className="date-nav__buttons">
        <button
          id="btn-kemarin"
          className={`date-nav__btn${selectedDate === offsetDate(today, -1) ? ' active' : ''}`}
          onClick={() => onDateChange(offsetDate(selectedDate, -1))}
          aria-label="Tanggal sebelumnya"
        >
          ‹ Sebelumnya
        </button>

        <button
          id="btn-hari-ini"
          className={`date-nav__btn date-nav__btn--today${isToday ? ' active' : ''}`}
          onClick={() => onDateChange(today)}
          aria-label="Kembali ke hari ini"
          disabled={isToday}
        >
          Hari Ini
        </button>

        <button
          id="btn-besok"
          className={`date-nav__btn${isFuture ? ' active' : ''}`}
          onClick={() => onDateChange(offsetDate(selectedDate, 1))}
          aria-label="Tanggal berikutnya"
          disabled={isFuture}
        >
          Berikutnya ›
        </button>
      </div>

      <label className="date-nav__label" htmlFor="date-picker">
        <span aria-hidden="true">📅</span> Pilih Tanggal:
        <input
          id="date-picker"
          type="date"
          className="date-nav__input"
          value={selectedDate}
          max={today}
          onChange={(e) => e.target.value && onDateChange(e.target.value)}
          aria-label="Pilih tanggal manual"
        />
      </label>
    </nav>
  );
}

/* ─── SUMMARY CARDS ─── */
function SummaryCards({ transactions }) {
  const total = transactions.reduce((sum, t) => sum + t.amount, 0);
  const count = transactions.length;
  const biggest = count > 0 ? Math.max(...transactions.map((t) => t.amount)) : 0;
  const biggestTx = transactions.find((t) => t.amount === biggest);

  return (
    <section className="summary" aria-label="Ringkasan pengeluaran">
      <div className="summary__card summary__card--total">
        <p className="summary__label">Total Pengeluaran</p>
        <p className="summary__value">{formatRupiah(total)}</p>
      </div>
      <div className="summary__card">
        <p className="summary__label">Jumlah Transaksi</p>
        <p className="summary__value summary__value--sm">{count} transaksi</p>
      </div>
      <div className="summary__card">
        <p className="summary__label">Terbesar</p>
        <p className="summary__value summary__value--sm">
          {biggestTx ? formatRupiah(biggestTx.amount) : '—'}
        </p>
        {biggestTx && (
          <p className="summary__value-note">{biggestTx.category}</p>
        )}
      </div>
    </section>
  );
}

/* ─── TRANSACTION ITEM ─── */
function TransactionItem({ tx }) {
  return (
    <li className="tx-item" role="article" aria-label={`${tx.category} ${formatRupiah(tx.amount)}`}>
      <div className="tx-item__left">
        <span className="tx-item__icon" aria-hidden="true">🧾</span>
        <div>
          <p className="tx-item__category">{tx.category}</p>
          {tx.note && tx.note !== tx.category && (
            <p className="tx-item__note">{tx.note}</p>
          )}
          <p className="tx-item__time">{formatJam(tx.createdAt)}</p>
        </div>
      </div>
      <p className="tx-item__amount">{formatRupiah(tx.amount)}</p>
    </li>
  );
}

/* ─── TRANSACTION LIST ─── */
function TransactionList({ transactions }) {
  if (transactions.length === 0) {
    return (
      <div className="empty-state" role="status">
        <span className="empty-state__icon" aria-hidden="true">🗂️</span>
        <p>Belum ada pengeluaran pada tanggal ini.</p>
      </div>
    );
  }

  return (
    <section className="tx-list-section" aria-label="Daftar pengeluaran">
      <h2 className="tx-list__heading">Rincian Transaksi</h2>
      <ul className="tx-list" role="list">
        {transactions.map((tx) => (
          <TransactionItem key={tx.id} tx={tx} />
        ))}
      </ul>
    </section>
  );
}

/* ─── LOADING STATE ─── */
function LoadingState() {
  return (
    <div className="loading-state" role="status" aria-live="polite">
      <div className="loading-state__spinner" aria-hidden="true">
        <div className="spinner-ring" />
      </div>
      <p>Memuat data pengeluaran…</p>
    </div>
  );
}

/* ─── ERROR STATE ─── */
function ErrorState({ onRetry }) {
  return (
    <div className="error-state" role="alert">
      <span className="error-state__icon" aria-hidden="true">⚠️</span>
      <p>Data belum bisa dimuat.</p>
      <button id="btn-retry" className="error-state__btn" onClick={onRetry}>
        Coba Lagi
      </button>
    </div>
  );
}

/* ─── APP ROOT ─── */
export default function App() {
  const [selectedDate, setSelectedDate] = useState(getTodayStr);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [analysisOpen, setAnalysisOpen] = useState(false);

  const loadData = useCallback(async (date) => {
    setLoading(true);
    setError(false);
    try {
      const data = await getExpensesByDate(date);
      setTransactions(data);
    } catch (err) {
      console.error('Failed to load transactions:', err);
      setError(true);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(selectedDate);
  }, [selectedDate, loadData]);

  const handleDateChange = (newDate) => {
    setSelectedDate(newDate);
  };

  return (
    <div className="app-wrapper">
      <Header />

      <main id="main-content" className="app-main">
        {/* Tanggal yang dipilih */}
        <p className="selected-date-label" aria-live="polite">
          {formatTanggalIndonesia(selectedDate + 'T12:00:00')}
        </p>

        {/* Navigasi tanggal */}
        <DateNav selectedDate={selectedDate} onDateChange={handleDateChange} />

        {/* Konten utama */}
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState onRetry={() => loadData(selectedDate)} />
        ) : (
          <>
            <SummaryCards transactions={transactions} />
            <TransactionList transactions={transactions} />
          </>
        )}
      </main>

      <footer className="app-footer" role="contentinfo">
        <p>© {new Date().getFullYear()} BotFinanceku</p>
      </footer>

      {/* FAB — Analysis */}
      <button
        id="btn-open-analysis"
        className="fab-analysis"
        onClick={() => setAnalysisOpen(true)}
        aria-label="Buka analisis keuangan"
        title="Analisis Keuangan"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6"  y1="20" x2="6"  y2="14" />
          <polyline points="2 20 22 20" />
        </svg>
        <span className="fab-analysis__label">Analisis</span>
      </button>

      {/* Analysis overlay */}
      {analysisOpen && (
        <AnalysisPage onClose={() => setAnalysisOpen(false)} />
      )}
    </div>
  );
}
