import { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, Cell as ReCell
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Target, Zap, 
  PieChart as PieIcon, Activity, Calendar, Clock, 
  ChevronRight, BrainCircuit, X, Sparkles, Filter,
  ArrowUpRight, ArrowDownRight, BarChart3
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getExpensesByRange } from './lib/transactions.js';
import { formatRupiah, toDateString } from './lib/formatters.js';

/* ─── Constants & Colors ─── */
const COLORS = ['#6F8F72', '#F2A65A', '#5B8CB7', '#C97D6B', '#8A6BBF', '#5BBFAC', '#BF9F5B'];

/* ─── Helpers ─── */
const getTodayStr = () => toDateString(new Date());

const offsetDate = (dateStr, days) => {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return toDateString(d);
};

const getWeekRange = (dateStr) => {
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diffToMon);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return { start: toDateString(mon), end: toDateString(sun) };
};

const getMonthName = (monthStr) => {
  const [y, m] = monthStr.split('-');
  return new Date(y, m - 1).toLocaleDateString('id-ID', { month: 'short' });
};

const totalOf = (txs) => txs.reduce((s, t) => s + (t.amount || 0), 0);

/* ─── Components ─── */

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <p className="custom-tooltip__label">{label}</p>
        <p className="custom-tooltip__value">
          {formatRupiah(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
}

function AIInsightCard({ txs, type = 'daily', monthlyData = [] }) {
  const insight = useMemo(() => {
    if (type === 'monthly') {
      if (monthlyData.length < 2) return "Data bulanan masih dikumpulkan. Terus catat agar AI bisa memberikan tren jangka panjang!";
      
      const latest = monthlyData[monthlyData.length - 1];
      const prev = monthlyData[monthlyData.length - 2];
      const diff = latest.amount - prev.amount;
      const diffPct = Math.round((diff / prev.amount) * 100);
      
      if (diffPct > 20) return `Bulan ini pengeluaranmu naik tajam (${diffPct}%) dibanding bulan lalu. Hati-hati ya, coba cek kategori apa yang melonjak!`;
      if (diffPct < -10) return `Keren! Pengeluaranmu turun ${Math.abs(diffPct)}% dibanding bulan lalu. Keuanganmu makin sehat!`;
      return "Pengeluaran bulan ini cukup stabil dibanding bulan sebelumnya. Pertahankan kontrolnya!";
    }

    if (txs.length === 0) return "Belum ada data cukup untuk memberikan insight. Terus catat pengeluaranmu!";
    
    const total = totalOf(txs);
    const catMap = {};
    txs.forEach(t => catMap[t.category] = (catMap[t.category] || 0) + t.amount);
    const sortedCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
    const topCat = sortedCats[0];
    
    if (type === 'daily') {
      if (total > 500000) return `Waduh, hari ini pengeluaranmu tembus ${formatRupiah(total)}. Terbesar di kategori ${topCat[0]}. Coba dikurangi besok ya!`;
      if (total < 50000) return `Keren! Hari ini kamu hemat banget, baru keluar ${formatRupiah(total)}. Pertahankan ya!`;
      return `Pengeluaranmu hari ini didominasi oleh ${topCat[0]}. Masih dalam batas wajar, kok.`;
    }
    
    return `Kategori ${topCat[0]} menyumbang ${Math.round((topCat[1]/total)*100)}% dari total pengeluaranmu. Mungkin ada yang bisa diefisiensikan?`;
  }, [txs, type, monthlyData]);

  return (
    <motion.div 
      className="insight-card"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.2 }}
    >
      <div className="insight-card__icon">
        <BrainCircuit size={20} />
      </div>
      <div className="insight-card__content">
        <h4 className="insight-card__title">Tilik AI Insights <Sparkles size={14} /></h4>
        <p className="insight-card__text">{insight}</p>
      </div>
    </motion.div>
  );
}

function StatCard({ label, value, icon: Icon, trend, subValue, accent = false }) {
  return (
    <motion.div 
      className={`stat-card ${accent ? 'stat-card--accent' : ''}`}
      whileHover={{ y: -3 }}
    >
      <div className="stat-label">
        {Icon && <Icon size={12} style={{ marginRight: 4, opacity: 0.7 }} />}
        {label}
      </div>
      <div className="stat-value">{value}</div>
      {subValue && <div className="stat-value--sm" style={{ opacity: 0.7, marginTop: 2 }}>{subValue}</div>}
      {trend !== undefined && (
        <div className={`spending-badge spending-badge--${trend > 0 ? 'up' : 'down'}`} style={{ marginTop: 8 }}>
          {trend > 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
          {Math.abs(trend)}% vs bulan lalu
        </div>
      )}
    </motion.div>
  );
}

/* ─── TABS CONTENT ─── */

function DailyAnalysis({ txs }) {
  const hourlyData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({ 
      time: `${String(i).padStart(2, '0')}:00`, 
      amount: 0 
    }));
    txs.forEach((tx) => {
      const h = new Date(tx.createdAt).getHours();
      hours[h].amount += tx.amount;
    });
    return hours.filter(h => h.amount > 0 || (parseInt(h.time) > 8 && parseInt(h.time) < 22));
  }, [txs]);

  const categoryData = useMemo(() => {
    const map = {};
    txs.forEach(t => map[t.category] = (map[t.category] || 0) + t.amount);
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [txs]);

  if (txs.length === 0) {
    return <div className="analysis-empty">Belum ada pengeluaran hari ini. ✨</div>;
  }

  return (
    <div className="analysis-tab-content">
      <AIInsightCard txs={txs} type="daily" />
      
      <div className="stat-row">
        <StatCard 
          accent 
          label="Total Hari Ini" 
          value={formatRupiah(totalOf(txs))} 
          icon={Activity}
        />
        <StatCard 
          label="Transaksi" 
          value={`${txs.length}x`} 
          icon={Zap}
        />
        <StatCard 
          label="Rata-rata/Tx" 
          value={formatRupiah(txs.length > 0 ? totalOf(txs) / txs.length : 0)} 
          icon={Target}
        />
      </div>

      <div className="analysis-grid">
        <div className="analysis-card">
          <h3 className="analysis-card__title">📊 Distribusi Waktu</h3>
          <div className="premium-chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                <XAxis 
                  dataKey="time" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  interval={3}
                />
                <YAxis hide />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="amount" 
                  fill="var(--clr-primary)" 
                  radius={[4, 4, 0, 0]} 
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="analysis-card">
          <h3 className="analysis-card__title">🏷️ Komposisi Kategori</h3>
          <div className="premium-chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  layout="vertical" 
                  verticalAlign="middle" 
                  align="right"
                  wrapperStyle={{ fontSize: '11px', fontWeight: 600 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="analysis-card glass-card">
        <h3 className="analysis-card__title">📝 Transaksi Hari Ini</h3>
        <div className="tx-mini-list">
          {[...txs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map((tx) => (
            <div key={tx.id} className="tx-mini-item">
              <div className="tx-mini-item__left">
                <span className="tx-mini-item__cat">{tx.category}</span>
                <span className="tx-mini-item__time">
                  {new Date(tx.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  {tx.note && ` • ${tx.note}`}
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

function WeeklyAnalysis({ txs, today }) {
  const trendData = useMemo(() => {
    const { start } = getWeekRange(today);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = offsetDate(start, i);
      const dayTxs = txs.filter(t => (t.date || toDateString(new Date(t.createdAt))) === d);
      days.push({
        name: new Date(d + 'T12:00:00').toLocaleDateString('id-ID', { weekday: 'short' }),
        fullDate: d,
        amount: totalOf(dayTxs)
      });
    }
    return days;
  }, [txs, today]);

  const categoryData = useMemo(() => {
    const map = {};
    txs.forEach(t => map[t.category] = (map[t.category] || 0) + t.amount);
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [txs]);

  return (
    <div className="analysis-tab-content">
      <AIInsightCard txs={txs} type="weekly" />

      <div className="stat-row">
        <StatCard 
          accent 
          label="Total Minggu Ini" 
          value={formatRupiah(totalOf(txs))} 
          icon={Calendar}
        />
        <StatCard 
          label="Avg/Hari" 
          value={formatRupiah(totalOf(txs) / 7)} 
          icon={TrendingUp}
        />
      </div>

      <div className="analysis-card">
        <h3 className="analysis-card__title">📈 Tren Pengeluaran</h3>
        <div className="premium-chart-container" style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--clr-primary)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="var(--clr-primary)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="amount" 
                stroke="var(--clr-primary)" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorAmt)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="analysis-grid">
        <div className="analysis-card">
          <h3 className="analysis-card__title">🏷️ Top Kategori</h3>
          <div className="category-chart">
            {categoryData.slice(0, 5).map((cat, i) => (
              <div key={cat.name} className="category-chart__row" style={{ gridTemplateColumns: '100px 1fr 100px' }}>
                <span className="category-chart__name">{cat.name}</span>
                <div className="spark-bar-track">
                  <motion.div 
                    className="spark-bar-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${categoryData[0].value > 0 ? (cat.value / categoryData[0].value) * 100 : 0}%` }}
                    transition={{ duration: 1, delay: i * 0.1 }}
                    style={{ background: COLORS[i % COLORS.length] }}
                  />
                </div>
                <span className="category-chart__amt">{formatRupiah(cat.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MonthlyAnalysis({ monthlyByMonth, today }) {
  const currentMonthKey = today.slice(0, 7);
  const monthKeys = Object.keys(monthlyByMonth).sort();
  
  const chartData = useMemo(() => {
    return monthKeys.map(key => ({
      name: getMonthName(key),
      amount: totalOf(monthlyByMonth[key]),
      key
    }));
  }, [monthlyByMonth, monthKeys]);

  const stats = useMemo(() => {
    const latest = chartData[chartData.length - 1]?.amount || 0;
    const prev = chartData[chartData.length - 2]?.amount || 0;
    const diffPct = prev > 0 ? Math.round(((latest - prev) / prev) * 100) : 0;
    const totalAll = chartData.reduce((s, c) => s + c.amount, 0);
    const avg = chartData.length > 0 ? totalAll / chartData.length : 0;

    return { latest, prev, diffPct, avg, totalAll };
  }, [chartData]);

  const topCategories = useMemo(() => {
    const currentMonthTxs = monthlyByMonth[currentMonthKey] || [];
    const map = {};
    currentMonthTxs.forEach(t => map[t.category] = (map[t.category] || 0) + t.amount);
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [monthlyByMonth, currentMonthKey]);

  return (
    <div className="analysis-tab-content">
      <AIInsightCard type="monthly" monthlyData={chartData} />

      <div className="stat-row">
        <StatCard 
          accent 
          label="Bulan Ini" 
          value={formatRupiah(stats.latest)} 
          icon={BarChart3}
          trend={stats.diffPct}
        />
        <StatCard 
          label="Rata-rata/Bulan" 
          value={formatRupiah(stats.avg)} 
          icon={Activity}
        />
      </div>

      <div className="analysis-card">
        <h3 className="analysis-card__title">📅 Perbandingan Bulanan</h3>
        <div className="premium-chart-container" style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="amount" radius={[6, 6, 0, 0]} animationDuration={1500}>
                {chartData.map((entry, index) => (
                  <ReCell 
                    key={`cell-${index}`} 
                    fill={entry.key === currentMonthKey ? 'var(--clr-accent)' : 'var(--clr-primary)'} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="analysis-grid">
        <div className="analysis-card">
          <h3 className="analysis-card__title">🏷️ Top Kategori (Bulan Ini)</h3>
          <div className="category-chart">
            {topCategories.length === 0 ? (
              <p className="analysis-empty-sm">Belum ada data di bulan ini.</p>
            ) : (
              topCategories.map((cat, i) => (
                <div key={cat.name} className="category-chart__row" style={{ gridTemplateColumns: '100px 1fr 100px' }}>
                  <span className="category-chart__name">{cat.name}</span>
                  <div className="spark-bar-track">
                    <motion.div 
                      className="spark-bar-fill"
                      initial={{ width: 0 }}
                      animate={{ width: `${(cat.value / topCategories[0].value) * 100}%` }}
                      transition={{ duration: 1, delay: i * 0.1 }}
                      style={{ background: COLORS[i % COLORS.length] }}
                    />
                  </div>
                  <span className="category-chart__amt">{formatRupiah(cat.value)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── MAIN COMPONENT ─── */

export default function AnalysisPage({ onClose }) {
  const today = getTodayStr();
  const [activeTab, setActiveTab] = useState('harian');
  
  const [data, setData] = useState({
    daily: [],
    weekly: [],
    monthly: {}
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Fetch Daily & Weekly
        const [d, w] = await Promise.all([
          getExpensesByRange(today, today),
          getExpensesByRange(getWeekRange(today).start, today)
        ]);

        // Fetch Monthly (Last 6 Months)
        const now = new Date();
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        const m = await getExpensesByRange(toDateString(sixMonthsAgo), today);
        
        const groupedMonthly = {};
        m.forEach(tx => {
          const dateStr = tx.date || toDateString(new Date(tx.createdAt));
          const ym = dateStr.slice(0, 7);
          if (!groupedMonthly[ym]) groupedMonthly[ym] = [];
          groupedMonthly[ym].push(tx);
        });

        setData({ daily: d, weekly: w, monthly: groupedMonthly });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [today]);

  const tabs = [
    { key: 'harian', label: 'Hari Ini', icon: Clock },
    { key: 'mingguan', label: 'Mingguan', icon: Calendar },
    { key: 'bulanan', label: 'Bulanan', icon: PieIcon },
  ];

  return (
    <motion.div 
      className="analysis-overlay"
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
    >
      <div className="analysis-header">
        <div className="analysis-header__inner">
          <div className="analysis-header__left">
            <div className="analysis-header__icon">
              <TrendingUp size={24} color="#fff" />
            </div>
            <div>
              <h2 className="analysis-header__title">Dashboard Analisis</h2>
              <p className="analysis-header__sub">Wawasan cerdas keuanganmu</p>
            </div>
          </div>
          <button className="analysis-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="analysis-tabs">
          {tabs.map((t) => (
            <button
              key={t.key}
              className={`analysis-tab${activeTab === t.key ? ' analysis-tab--active' : ''}`}
              onClick={() => setActiveTab(t.key)}
            >
              <t.icon size={14} style={{ marginBottom: 4 }} />
              <div>{t.label}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="analysis-body">
        <div className="analysis-section">
          {loading ? (
            <div className="analysis-loader">
              <div className="spinner-ring" />
              <p>Menganalisis data kamu...</p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === 'harian' && <DailyAnalysis txs={data.daily} />}
                {activeTab === 'mingguan' && <WeeklyAnalysis txs={data.weekly} today={today} />}
                {activeTab === 'bulanan' && <MonthlyAnalysis monthlyByMonth={data.monthly} today={today} />}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>
    </motion.div>
  );
}
