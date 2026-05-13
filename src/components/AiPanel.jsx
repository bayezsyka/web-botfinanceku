import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
    <motion.div
      initial={{ opacity: 0, y: 20, x: '-50%' }}
      animate={{ opacity: 1, y: 0, x: '-50%' }}
      exit={{ opacity: 0, scale: 0.9, x: '-50%' }}
      className={`ai-toast ai-toast--${type}`}
      role="status"
      aria-live="polite"
    >
      <span className="ai-toast__icon" aria-hidden="true">
        {type === 'success' ? '✅' : type === 'warning' ? '⚠️' : '❌'}
      </span>
      <span>{message}</span>
    </motion.div>
  );
}

/* ─── Summary Stats ─── */
function AiSummary({ unconfirmed, confirmed, avgConfidence }) {
  return (
    <div className="ai-summary">
      <motion.div
        className="ai-summary__card ai-summary__card--primary"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <p className="ai-summary__label">Belum Dikonfirmasi</p>
        <p className="ai-summary__value">{unconfirmed}</p>
      </motion.div>
      <motion.div
        className="ai-summary__card"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <p className="ai-summary__label">Sudah Dikonfirmasi</p>
        <p className="ai-summary__value ai-summary__value--sm">{confirmed}</p>
      </motion.div>
      <motion.div
        className="ai-summary__card"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <p className="ai-summary__label">Rata-rata Keyakinan</p>
        <p className="ai-summary__value ai-summary__value--sm">
          {avgConfidence != null ? `${avgConfidence.toFixed(0)}%` : '—'}
        </p>
      </motion.div>
    </div>
  );
}

/* ─── Confirmation Card ─── */
function AiConfirmationCard({ tx, onConfirm, busy }) {
  const confidencePercent = tx.confidence != null ? (tx.confidence * 100).toFixed(1) : null;
  const hasPrediction = !!tx.predicted_category;

  const dateStr = tx.expense_date || tx.date || '';
  const displayDate = dateStr
    ? new Date(dateStr + 'T12:00:00').toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
    : '';

  return (
    <motion.div
      className="ai-card"
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, x: 20 }}
    >
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
    </motion.div>
  );
}

/* ─── MAIN PANEL ─── */
export default function AiPanel({ onClose, onDataChanged, workspaceId }) {
  const [allTxs, setAllTxs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [toast, setToast] = useState(null);

  const fetchData = useCallback(async () => {
    if (!workspaceId) {
      setAllTxs([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await getAllExpenses(200, workspaceId);
      setAllTxs(data);
    } catch (err) {
      console.error('Failed to load AI data:', err);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const unconfirmed = allTxs
    .filter((tx) => !tx.is_confirmed)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const confirmed = allTxs
    .filter((tx) => tx.is_confirmed)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

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
    } catch (err) {
      console.error(err);
      setToast({ message: 'Terjadi kesalahan sistem', type: 'error' });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <motion.div
      className="ai-overlay"
      initial={{ opacity: 0, x: '100%' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
    >
      <div className="ai-header">
        <div className="ai-header__inner">
          <div className="ai-header__left">
            <span className="ai-header__icon" aria-hidden="true">🤖</span>
            <div>
              <h2 className="ai-header__title">Tilik AI</h2>
              <p className="ai-header__sub">Konfirmasi kategori agar model makin paham</p>
            </div>
          </div>
          <button className="ai-close-btn" onClick={onClose}>✕</button>
        </div>
      </div>

      <div className="ai-body">
        {loading ? (
          <div className="ai-loader">
            <div className="spinner-ring" />
            <p>Memuat data transaksi…</p>
          </div>
        ) : (
          <div className="ai-content">
            <AiSummary
              unconfirmed={unconfirmed.length}
              confirmed={allTxs.filter((tx) => tx.is_confirmed).length}
              avgConfidence={avgConfidence}
            />

            <div className="ai-section">
              <h3 className="ai-section__title">
                ⏳ Belum Dikonfirmasi
                <span className="ai-section__badge">{unconfirmed.length}</span>
              </h3>

              <div className="ai-card-list">
                <AnimatePresence mode="popLayout">
                  {unconfirmed.map((tx) => (
                    <AiConfirmationCard
                      key={tx.id}
                      tx={tx}
                      onConfirm={handleConfirm}
                      busy={busyId === tx.id}
                    />
                  ))}
                </AnimatePresence>
                {unconfirmed.length === 0 && (
                  <motion.div className="ai-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <span aria-hidden="true">🎉</span>
                    <p>Semua transaksi sudah dikonfirmasi!</p>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onDone={() => setToast(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
