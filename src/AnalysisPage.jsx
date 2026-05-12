import { useState, useEffect, useCallback } from 'react';
import { getExpensesByRange } from './lib/transactions.js';
import { formatRupiah, toDateString } from './lib/formatters.js';

/* ─── Date helpers ─── */
function getTodayStr() {
  return toDateString(new Date());
}

function offsetDate(dateStr, days) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return toDateString(d);
}

function getWeekRange(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDay(); // 0=Sun
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diffToMon);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return { start: toDateString(mon), end: toDateString(sun) };
}

function getMonthRange(dateStr) {
  const [y, m] = dateStr.split('-').map(Number);
  const start = `${y}-${String(m).padStart(2, '0')}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const end = `${y}-${String(m).padStart(2, '0')}-${lastDay}`;
  return { start, end };
}

function formatShortDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

function formatMonthYear(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

function formatDayShort(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' });
}

/* ─── Group by date ─── */
function groupByDate(txs) {
  const map = {};
  txs.forEach((tx) => {
    const key = tx.date || toDateString(new Date(tx.createdAt));
    if (!map[key]) map[key] = [];
    map[key].push(tx);
  });
  return map;
}

function groupByWeek(txs) {
  const map = {};
  txs.forEach((tx) => {
    const dateStr = tx.date || toDateString(new Date(tx.createdAt));
    const { start } = getWeekRange(dateStr);
    if (!map[start]) map[start] = [];
    map[start].push(tx);
  });
  return map;
}

function totalOf(txs) {
  return txs.reduce((s, t) => s + t.amount, 0);
}

/* ─── Sparkbar ─── */
function SparkBar({ value, max, color = 'var(--clr-primary)' }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="spark-bar-track" aria-hidden="true">
      <div className="spark-bar-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

/* ─── Category breakdown ─── */
function CategoryChart({ txs }) {
  const map = {};
  txs.forEach((t) => {
    map[t.category] = (map[t.category] || 0) + t.amount;
  });
  const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 7);
  const max = sorted[0]?.[1] || 1;

  const palette = [
    '#6F8F72', '#F2A65A', '#5B8CB7', '#C97D6B',
    '#8A6BBF', '#5BBFAC', '#BF9F5B',
  ];

  if (sorted.length === 0) return null;

  return (
    <div className="category-chart">
      {sorted.map(([cat, amt], i) => (
        <div key={cat} className="category-chart__row">
          <div className="category-chart__label">
            <span className="category-dot" style={{ background: palette[i % palette.length] }} />
            <span className="category-chart__name">{cat}</span>
          </div>
          <SparkBar value={amt} max={max} color={palette[i % palette.length]} />
          <span className="category-chart__amt">{formatRupiah(amt)}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── TAB: Harian ─── */
function DailyTab({ txs, today }) {
  const grouped = groupByDate(txs);
  const dates = Object.keys(grouped).sort().reverse();
  const dailyTotals = dates.map((d) => totalOf(grouped[d]));
  const maxDaily = Math.max(...dailyTotals, 1);
  const avg = dailyTotals.length > 0 ? dailyTotals.reduce((a, b) => a + b, 0) / dailyTotals.length : 0;

  if (dates.length === 0) {
    return <div className="analysis-empty">Tidak ada data pengeluaran hari ini.</div>;
  }

  return (
    <div className="analysis-section">
      <div className="stat-row">
        <div className="stat-card stat-card--accent">
          <p className="stat-label">Total Hari Ini</p>
          <p className="stat-value">{formatRupiah(totalOf(txs))}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Transaksi</p>
          <p className="stat-value stat-value--sm">{txs.length}x</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Rata-rata</p>
          <p className="stat-value stat-value--sm">{txs.length > 0 ? formatRupiah(avg) : '—'}</p>
        </div>
      </div>

      <div className="analysis-card">
        <h3 className="analysis-card__title">📊 Pengeluaran per Jam</h3>
        <HourlyChart txs={txs} />
      </div>

      <div className="analysis-card">
        <h3 className="analysis-card__title">🏷️ Per Kategori</h3>
        <CategoryChart txs={txs} />
      </div>

      <div className="analysis-card">
        <h3 className="analysis-card__title">📋 Semua Transaksi</h3>
        <div className="tx-mini-list">
          {[...txs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map((tx) => (
            <div key={tx.id} className="tx-mini-item">
              <div className="tx-mini-item__left">
                <span className="tx-mini-item__cat">{tx.category}</span>
                <span className="tx-mini-item__time">
                  {new Date(tx.createdAt).toLocaleTimeString('id-ID', {
                    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jakarta',
                  })}
                </span>
              </div>
              <span className="tx-mini-item__amount">{formatRupiah(tx.amount)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Hourly chart ─── */
function HourlyChart({ txs }) {
  const hours = Array.from({ length: 24 }, (_, i) => ({ hour: i, total: 0 }));
  txs.forEach((tx) => {
    const h = new Date(tx.createdAt).toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: 'Asia/Jakarta' });
    const idx = parseInt(h, 10);
    if (idx >= 0 && idx < 24) hours[idx].total += tx.amount;
  });
  const active = hours.filter((h) => h.total > 0);
  if (active.length === 0) return <p className="analysis-empty-sm">Belum ada data.</p>;
  const max = Math.max(...hours.map((h) => h.total), 1);

  return (
    <div className="hourly-chart">
      {hours.map((h) => (
        <div key={h.hour} className="hourly-bar" title={`${String(h.hour).padStart(2,'0')}:00 — ${formatRupiah(h.total)}`}>
          <div
            className="hourly-bar__fill"
            style={{ height: `${Math.max(h.total > 0 ? 4 : 0, (h.total / max) * 80)}px` }}
          />
          {h.total > 0 && (
            <span className="hourly-bar__label">{String(h.hour).padStart(2, '0')}</span>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── TAB: Mingguan ─── */
function WeeklyTab({ txs, today }) {
  // Show last 4 weeks
  const grouped = groupByDate(txs);
  const weeks = {};
  Object.entries(grouped).forEach(([date, dayTxs]) => {
    const { start } = getWeekRange(date);
    if (!weeks[start]) weeks[start] = [];
    weeks[start].push(...dayTxs);
  });

  const weekKeys = Object.keys(weeks).sort().reverse();
  const weekTotals = weekKeys.map((k) => totalOf(weeks[k]));
  const maxWeek = Math.max(...weekTotals, 1);
  const grandTotal = totalOf(txs);
  const avg = weekTotals.length > 0 ? weekTotals.reduce((a, b) => a + b, 0) / weekTotals.length : 0;

  const todayWeekStart = getWeekRange(today).start;

  return (
    <div className="analysis-section">
      <div className="stat-row">
        <div className="stat-card stat-card--accent">
          <p className="stat-label">Total Bulan Ini</p>
          <p className="stat-value">{formatRupiah(grandTotal)}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Minggu</p>
          <p className="stat-value stat-value--sm">{weekKeys.length}x</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Avg/Minggu</p>
          <p className="stat-value stat-value--sm">{formatRupiah(avg)}</p>
        </div>
      </div>

      <div className="analysis-card">
        <h3 className="analysis-card__title">📅 Per Minggu</h3>
        {weekKeys.length === 0 ? (
          <p className="analysis-empty-sm">Tidak ada data.</p>
        ) : (
          <div className="week-list">
            {weekKeys.map((weekStart, i) => {
              const weekEnd = offsetDate(weekStart, 6);
              const wTotal = totalOf(weeks[weekStart]);
              const isCurrentWeek = weekStart === todayWeekStart;
              return (
                <div key={weekStart} className={`week-row${isCurrentWeek ? ' week-row--current' : ''}`}>
                  <div className="week-row__header">
                    <span className="week-row__label">
                      {isCurrentWeek ? '✨ Minggu Ini' : `Minggu ${weekKeys.length - i}`}
                    </span>
                    <span className="week-row__range">
                      {formatShortDate(weekStart)} – {formatShortDate(weekEnd)}
                    </span>
                    <span className="week-row__total">{formatRupiah(wTotal)}</span>
                  </div>
                  <SparkBar value={wTotal} max={maxWeek} color={isCurrentWeek ? 'var(--clr-accent)' : 'var(--clr-primary)'} />
                  {/* Daily breakdown within week */}
                  <div className="week-daily-row">
                    {weeks[weekStart].reduce((acc, tx) => {
                      const d = tx.date || toDateString(new Date(tx.createdAt));
                      acc[d] = (acc[d] || 0) + tx.amount;
                      return acc;
                    }, {})[Symbol.iterator] ? null : null}
                    {(() => {
                      const dayMap = {};
                      weeks[weekStart].forEach((tx) => {
                        const d = tx.date || toDateString(new Date(tx.createdAt));
                        dayMap[d] = (dayMap[d] || 0) + tx.amount;
                      });
                      return Object.entries(dayMap).sort().map(([d, amt]) => (
                        <div key={d} className="week-daily-chip">
                          <span>{formatDayShort(d)}</span>
                          <span>{formatRupiah(amt)}</span>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="analysis-card">
        <h3 className="analysis-card__title">🏷️ Top Kategori (Bulan Ini)</h3>
        <CategoryChart txs={txs} />
      </div>
    </div>
  );
}

/* ─── TAB: Bulanan ─── */
function MonthlyTab({ txsByMonth, today }) {
  const monthKeys = Object.keys(txsByMonth).sort().reverse();
  const monthTotals = monthKeys.map((k) => totalOf(txsByMonth[k]));
  const maxMonth = Math.max(...monthTotals, 1);
  const grandTotal = monthTotals.reduce((a, b) => a + b, 0);
  const avgMonth = monthTotals.length > 0 ? grandTotal / monthTotals.length : 0;
  const currentMonth = today.slice(0, 7);

  return (
    <div className="analysis-section">
      <div className="stat-row">
        <div className="stat-card stat-card--accent">
          <p className="stat-label">Total Keseluruhan</p>
          <p className="stat-value">{formatRupiah(grandTotal)}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Bulan</p>
          <p className="stat-value stat-value--sm">{monthKeys.length}x</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Avg/Bulan</p>
          <p className="stat-value stat-value--sm">{formatRupiah(avgMonth)}</p>
        </div>
      </div>

      <div className="analysis-card">
        <h3 className="analysis-card__title">📆 Per Bulan</h3>
        {monthKeys.length === 0 ? (
          <p className="analysis-empty-sm">Tidak ada data.</p>
        ) : (
          <div className="month-list">
            {monthKeys.map((ym, i) => {
              const mTxs = txsByMonth[ym];
              const mTotal = totalOf(mTxs);
              const isCurrent = ym === currentMonth;
              const sampleDate = ym + '-01';
              return (
                <div key={ym} className={`month-row${isCurrent ? ' month-row--current' : ''}`}>
                  <div className="month-row__header">
                    <span className="month-row__label">
                      {isCurrent ? '✨ ' : ''}{formatMonthYear(sampleDate)}
                    </span>
                    <div className="month-row__stats">
                      <span className="month-stat">{mTxs.length} transaksi</span>
                      <span className="month-row__total">{formatRupiah(mTotal)}</span>
                    </div>
                  </div>
                  <SparkBar value={mTotal} max={maxMonth} color={isCurrent ? 'var(--clr-accent)' : 'var(--clr-primary)'} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Category breakdown for each month */}
      {monthKeys.slice(0, 3).map((ym) => {
        const sampleDate = ym + '-01';
        return (
          <div key={ym} className="analysis-card">
            <h3 className="analysis-card__title">🏷️ Kategori — {formatMonthYear(sampleDate)}</h3>
            <CategoryChart txs={txsByMonth[ym]} />
          </div>
        );
      })}
    </div>
  );
}

/* ─── MAIN ANALYSIS PAGE ─── */
export default function AnalysisPage({ onClose }) {
  const today = getTodayStr();
  const [activeTab, setActiveTab] = useState('harian');

  /* ── Data states ── */
  const [dailyTxs, setDailyTxs] = useState([]);
  const [weeklyTxs, setWeeklyTxs] = useState([]);    // data sebulan utk analisis mingguan
  const [monthlyByMonth, setMonthlyByMonth] = useState({});

  const [loadingDaily, setLoadingDaily] = useState(true);
  const [loadingWeekly, setLoadingWeekly] = useState(true);
  const [loadingMonthly, setLoadingMonthly] = useState(true);

  /* ── Fetch daily (today) ── */
  useEffect(() => {
    setLoadingDaily(true);
    getExpensesByRange(today, today)
      .then(setDailyTxs)
      .catch(console.error)
      .finally(() => setLoadingDaily(false));
  }, [today]);

  /* ── Fetch weekly (this month) ── */
  useEffect(() => {
    const { start, end } = getMonthRange(today);
    setLoadingWeekly(true);
    getExpensesByRange(start, end)
      .then(setWeeklyTxs)
      .catch(console.error)
      .finally(() => setLoadingWeekly(false));
  }, [today]);

  /* ── Fetch monthly (last 6 months) ── */
  useEffect(() => {
    const d = new Date(today + 'T12:00:00');
    // start = 5 months ago, first day
    const start5 = new Date(d.getFullYear(), d.getMonth() - 5, 1);
    const startStr = toDateString(start5);
    const endStr = today;
    setLoadingMonthly(true);
    getExpensesByRange(startStr, endStr)
      .then((txs) => {
        const byMonth = {};
        txs.forEach((tx) => {
          const dateStr = tx.date || toDateString(new Date(tx.createdAt));
          const ym = dateStr.slice(0, 7);
          if (!byMonth[ym]) byMonth[ym] = [];
          byMonth[ym].push(tx);
        });
        setMonthlyByMonth(byMonth);
      })
      .catch(console.error)
      .finally(() => setLoadingMonthly(false));
  }, [today]);

  const tabs = [
    { key: 'harian', label: '📅 Hari Ini' },
    { key: 'mingguan', label: '📆 Mingguan' },
    { key: 'bulanan', label: '🗓️ Bulanan' },
  ];

  return (
    <div className="analysis-overlay" role="dialog" aria-modal="true" aria-label="Analisis Keuangan">
      {/* Header */}
      <div className="analysis-header">
        <div className="analysis-header__inner">
          <div className="analysis-header__left">
            <span className="analysis-header__icon" aria-hidden="true">📈</span>
            <div>
              <h2 className="analysis-header__title">Analisis Keuangan</h2>
              <p className="analysis-header__sub">Ringkasan lengkap pengeluaranmu</p>
            </div>
          </div>
          <button
            id="btn-close-analysis"
            className="analysis-close-btn"
            onClick={onClose}
            aria-label="Tutup analisis"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="analysis-tabs" role="tablist">
          {tabs.map((t) => (
            <button
              key={t.key}
              id={`tab-${t.key}`}
              role="tab"
              aria-selected={activeTab === t.key}
              className={`analysis-tab${activeTab === t.key ? ' analysis-tab--active' : ''}`}
              onClick={() => setActiveTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="analysis-body" role="tabpanel">
        {activeTab === 'harian' && (
          loadingDaily
            ? <AnalysisLoader />
            : <DailyTab txs={dailyTxs} today={today} />
        )}
        {activeTab === 'mingguan' && (
          loadingWeekly
            ? <AnalysisLoader />
            : <WeeklyTab txs={weeklyTxs} today={today} />
        )}
        {activeTab === 'bulanan' && (
          loadingMonthly
            ? <AnalysisLoader />
            : <MonthlyTab txsByMonth={monthlyByMonth} today={today} />
        )}
      </div>
    </div>
  );
}

function AnalysisLoader() {
  return (
    <div className="analysis-loader">
      <div className="spinner-ring" />
      <p>Memuat data analisis…</p>
    </div>
  );
}
