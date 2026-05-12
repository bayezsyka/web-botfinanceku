import { useState, useEffect, useCallback } from 'react';
import { getAllExpenses } from '../lib/transactions.js';
import { confirmTransactionCategory, VALID_CATEGORIES } from '../lib/aiFeedback.js';
import { formatRupiah } from '../lib/formatters.js';

/* ─── Toast ─── */
function Toast({ message, type, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3400);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className={`ai-toast ai-toast--${type}`} role="status" aria-live="polite">
      <span className="ai-toast__icon" aria-hidden="true">
        {type === 'success' ? '✅' : type === 'warning' ? '⚠️' : '❌'}
      </span>
      <span>{message}</span>
    </div>
  );
}

/* ─── Summary Stats ─── */
function AiSummary({ unconfirmed, confirmed, avgConfidence }) {
  return (
    <div className="ai-summary">
      <div className="ai-summary__card ai-summary__card--primary">
        <p className="ai-summary__label">Belum Dikonfirmasi</p>
        <p className="ai-summary__value">{unconfirmed}</p>
      </div>
      <div className="ai-summary__card">
        <p className="ai-summary__label">Sudah Dikonfirmasi</p>
        <p className="ai-summary__value ai-summary__value--sm">{confirmed}</p>
      </div>
      <div className="ai-summary__card">
        <p className="ai-summary__label">Rata-rata Keyakinan</p>
        <p className="ai-summary__value ai-summary__value--sm">
          {avgConfidence != null ? `${avgConfidence.toFixed(0)}%` : '—'}
        </p>
      </div>
    </div>
  );
}

/* ─── Confirmation Card ─── */
function AiConfirmationCard({ tx, onConfirm, busy }) {
  const confidencePercent = tx.confidence != null ? (tx.confidence * 100).toFixed(1) : null;
  const hasPrediction = !!tx.predicted_category;

  // Format tanggal
  const dateStr = tx.expense_date || tx.date || '';
  const displayDate = dateStr
    ? new Date(dateStr + 'T12:00:00').toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '';

  return (
    <div className="ai-card">
      <div className="ai-card__header">
        <div className="ai-card__info">
          <p className="ai-card__subject">{tx.subject || '(tanpa nama)'}</p>
          <p className="ai-card__amount">{formatRupiah(tx.amount)}</p>
          {displayDate && <p className="ai-card__date">{displayDate}</p>}
        </div>
        <div className="ai-card__prediction">
          {hasPrediction ? (
            <>
              <span className="ai-card__pred-label">Prediksi AI:</span>
              <span className="ai-card__pred-value">{tx.predicted_category}</span>
            </>
          ) : (
            <span className="ai-card__pred-label ai-card__pred-label--none">Belum diprediksi</span>
          )}
          {confidencePercent != null && (
            <span className="ai-card__confidence">
              Keyakinan: {confidencePercent}%
            </span>
          )}
          <span className={`ai-card__status ${tx.is_confident ? 'ai-card__status--ok' : 'ai-card__status--warn'}`}>
            {tx.is_confident ? '✓ Cukup yakin' : '⚑ Perlu ditilik'}
          </span>
        </div>
      </div>

      <div className="ai-card__actions">
        <button
          className="ai-cat-btn ai-cat-btn--confirm"
          disabled={!hasPrediction || busy}
          onClick={() => hasPrediction && onConfirm(tx, tx.predicted_category)}
          title={!hasPrediction ? 'Tidak ada prediksi untuk dikonfirmasi' : 'Setujui prediksi AI'}
        >
          ✓ Benar
        </button>
        {VALID_CATEGORIES.map((cat) => (
          <button
            key={cat}
            className="ai-cat-btn"
            disabled={busy}
            onClick={() => onConfirm(tx, cat)}
          >
            {cat}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Confirmed mini-card ─── */
function ConfirmedMiniCard({ tx }) {
  return (
    <div className="ai-confirmed-item">
      <div className="ai-confirmed-item__left">
        <span className="ai-confirmed-item__subject">{tx.subject || '—'}</span>
        <span className="ai-confirmed-item__cat">→ {tx.confirmed_category}</span>
      </div>
      <span className="ai-confirmed-item__amount">{formatRupiah(tx.amount)}</span>
    </div>
  );
}

/* ─── MAIN PANEL ─── */
export default function AiPanel({ onClose, onDataChanged }) {
  const [allTxs, setAllTxs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [toast, setToast] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllExpenses(200);
      setAllTxs(data);
    } catch (err) {
      console.error('Failed to load AI data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Pisahkan unconfirmed & confirmed
  const unconfirmed = allTxs
    .filter((tx) => !tx.is_confirmed)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const confirmed = allTxs
    .filter((tx) => tx.is_confirmed)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  // Rata-rata confidence
  const withConf = allTxs.filter((tx) => tx.confidence != null);
  const avgConfidence =
    withConf.length > 0
      ? (withConf.reduce((sum, tx) => sum + tx.confidence, 0) / withConf.length) * 100
      : null;

  const handleConfirm = async (tx, category) => {
    setBusyId(tx.id);

    try {
      const result = await confirmTransactionCategory(tx, category);

      if (result.success) {
        setAllTxs((prev) =>
          prev.map((item) =>
            item.id === tx.id
              ? {
                  ...item,
                  is_confirmed: true,
                  confirmed_category: category,
                  category,
                  final_category: category,
                }
              : item
          )
        );

        setToast({ message: result.message, type: 'success' });

        if (onDataChanged) {
          onDataChanged();
        }

        fetchData();
      } else {
        setToast({ message: result.message, type: 'error' });
      }
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="ai-overlay" role="dialog" aria-modal="true" aria-label="Tilik AI">
      {/* Header */}
      <div className="ai-header">
        <div className="ai-header__inner">
          <div className="ai-header__left">
            <span className="ai-header__icon" aria-hidden="true">🤖</span>
            <div>
              <h2 className="ai-header__title">Tilik AI</h2>
              <p className="ai-header__sub">Konfirmasi kategori agar model makin paham kebiasaanmu</p>
            </div>
          </div>
          <button
            id="btn-close-ai"
            className="ai-close-btn"
            onClick={onClose}
            aria-label="Tutup panel AI"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="ai-body">
        {loading ? (
          <div className="ai-loader">
            <div className="spinner-ring" />
            <p>Memuat data transaksi…</p>
          </div>
        ) : (
          <div className="ai-content">
            {/* Summary */}
            <AiSummary
              unconfirmed={unconfirmed.length}
              confirmed={allTxs.filter((tx) => tx.is_confirmed).length}
              avgConfidence={avgConfidence}
            />

            {/* Unconfirmed list */}
            <div className="ai-section">
              <h3 className="ai-section__title">
                ⏳ Belum Dikonfirmasi
                <span className="ai-section__badge">{unconfirmed.length}</span>
              </h3>

              {unconfirmed.length === 0 ? (
                <div className="ai-empty">
                  <span aria-hidden="true">🎉</span>
                  <p>Semua transaksi sudah dikonfirmasi!</p>
                </div>
              ) : (
                <div className="ai-card-list">
                  {unconfirmed.map((tx) => (
                    <AiConfirmationCard
                      key={tx.id}
                      tx={tx}
                      onConfirm={handleConfirm}
                      busy={busyId === tx.id}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Confirmed recent */}
            {confirmed.length > 0 && (
              <div className="ai-section">
                <h3 className="ai-section__title">
                  ✅ Sudah Dikonfirmasi Terbaru
                </h3>
                <div className="ai-confirmed-list">
                  {confirmed.map((tx) => (
                    <ConfirmedMiniCard key={tx.id} tx={tx} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDone={() => setToast(null)}
        />
      )}
    </div>
  );
}
