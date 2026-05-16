import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { getExpensesByDate, formatCategoryDisplay } from './lib/transactions.js';
import {
  formatRupiah,
  formatTanggalIndonesia,
  formatJam,
  toDateString,
} from './lib/formatters.js';
import { getInitialSession, listenToAuthChanges, signInWithGoogle, signOutUser } from './lib/auth.js';
import { ensureUserWorkspace } from './lib/workspace.js';
import AnalysisPage from './AnalysisPage.jsx';
import AiPanel from './components/AiPanel.jsx';
import WhatsappSettingsPanel from './components/WhatsappSettingsPanel.jsx';
import ProfilePanel from './components/ProfilePanel.jsx';
import { getMyProfile } from './lib/profile.js';
import LoginPage from './components/LoginPage.jsx';
import UserMenu from './components/UserMenu.jsx';

function getTodayStr() {
  return toDateString(new Date());
}

function offsetDate(dateStr, days) {
  const nextDate = new Date(`${dateStr}T12:00:00`);
  nextDate.setDate(nextDate.getDate() + days);
  return toDateString(nextDate);
}

function Header({ user, profile, workspace, onLogout, logoutLoading }) {
  return (
    <header className="app-header" role="banner">
      <div className="app-header__inner app-header__inner--spread">
        <div className="app-header__brand">
          <span className="app-header__icon" aria-hidden="true">BF</span>
          <div>
            <h1 className="app-header__title">Riwayat Pengeluaran</h1>
            <p className="app-header__subtitle">Catatan pengeluaran harian</p>
          </div>
        </div>

        {user ? (
          <UserMenu
            user={user}
            profile={profile}
            workspace={workspace}
            onLogout={onLogout}
            loading={logoutLoading}
          />
        ) : null}
      </div>
    </header>
  );
}

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
          Sebelumnya
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
          Berikutnya
        </button>
      </div>

      <label className="date-nav__label" htmlFor="date-picker">
        <span aria-hidden="true">Tanggal:</span>
        <input
          id="date-picker"
          type="date"
          className="date-nav__input"
          value={selectedDate}
          max={today}
          onChange={(event) => event.target.value && onDateChange(event.target.value)}
          aria-label="Pilih tanggal manual"
        />
      </label>
    </nav>
  );
}

function SummaryCards({ transactions }) {
  const total = transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  const count = transactions.length;
  const biggestAmount = count > 0 ? Math.max(...transactions.map((transaction) => transaction.amount)) : 0;
  const biggestTransaction = transactions.find((transaction) => transaction.amount === biggestAmount);

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
          {biggestTransaction ? formatRupiah(biggestTransaction.amount) : '-'}
        </p>
        {biggestTransaction ? (
          <p className="summary__value-note" style={{ textTransform: 'capitalize' }}>
            {formatCategoryDisplay(biggestTransaction.category)}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function TransactionItem({ transaction }) {
  return (
    <li
      className="tx-item"
      role="article"
      aria-label={`${formatCategoryDisplay(transaction.category)} ${formatRupiah(transaction.amount)}`}
    >
      <div className="tx-item__left">
        <span className="tx-item__icon" aria-hidden="true">Rp</span>
        <div>
          <p className="tx-item__category" style={{ textTransform: 'capitalize' }}>
            {formatCategoryDisplay(transaction.category)}
          </p>
          <p className="tx-item__note">{transaction.displayTitle}</p>
          <p className="tx-item__time">
            {formatJam(transaction.createdAt)}
            {transaction.isConfirmed ? ' • Sudah dikoreksi' : ' • Prediksi'}
          </p>
        </div>
      </div>

      <p className="tx-item__amount">{formatRupiah(transaction.amount)}</p>
    </li>
  );
}

function TransactionList({ transactions }) {
  if (transactions.length === 0) {
    return (
      <div className="empty-state" role="status">
        <span className="empty-state__icon" aria-hidden="true">Rp</span>
        <p>Belum ada pengeluaran pada tanggal ini.</p>
      </div>
    );
  }

  return (
    <section className="tx-list-section" aria-label="Daftar pengeluaran">
      <h2 className="tx-list__heading">Rincian Transaksi</h2>
      <ul className="tx-list" role="list">
        {transactions.map((transaction) => (
          <TransactionItem key={transaction.id} transaction={transaction} />
        ))}
      </ul>
    </section>
  );
}

function LoadingState({ message }) {
  return (
    <div className="loading-state" role="status" aria-live="polite">
      <div className="loading-state__spinner" aria-hidden="true">
        <div className="spinner-ring" />
      </div>
      <p>{message}</p>
    </div>
  );
}

function ErrorState({ message, onRetry, retryLabel = 'Coba Lagi', secondaryAction, secondaryLabel }) {
  return (
    <div className="error-state" role="alert">
      <span className="error-state__icon" aria-hidden="true">!</span>
      <p>{message}</p>
      <div className="error-state__actions">
        {onRetry ? (
          <button id="btn-retry" className="error-state__btn" onClick={onRetry}>
            {retryLabel}
          </button>
        ) : null}

        {secondaryAction ? (
          <button
            type="button"
            className="error-state__btn error-state__btn--secondary"
            onClick={secondaryAction}
          >
            {secondaryLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default function App() {
  const [selectedDate, setSelectedDate] = useState(getTodayStr);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dataError, setDataError] = useState('');
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [workspaceError, setWorkspaceError] = useState('');
  const [workspaceRefreshToken, setWorkspaceRefreshToken] = useState(0);

  const clearDashboardState = useCallback(() => {
    setSelectedDate(getTodayStr());
    setTransactions([]);
    setAnalysisOpen(false);
    setAiOpen(false);
    setWhatsappOpen(false);
    setProfileOpen(false);
    setProfile(null);
    setDataError('');
    setLoading(true);
  }, []);

  const loadData = useCallback(async (date) => {
    const workspaceId = activeWorkspace?.id;
    if (!workspaceId) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setDataError('');

    try {
      const nextTransactions = await getExpensesByDate(date, workspaceId);
      setTransactions(nextTransactions);
    } catch (error) {
      console.error('Failed to load transactions:', error);
      setTransactions([]);
      setDataError(error.message || 'Data belum bisa dimuat.');
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace?.id]);

  useEffect(() => {
    let isMounted = true;

    async function bootstrapSession() {
      setAuthLoading(true);
      setAuthError('');

      try {
        const nextSession = await getInitialSession();
        if (!isMounted) {
          return;
        }

        setSession(nextSession);
        setUser(nextSession?.user ?? null);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setAuthError(error.message || 'Gagal memeriksa sesi login.');
      } finally {
        if (isMounted) {
          setAuthLoading(false);
        }
      }
    }

    const {
      data: { subscription },
    } = listenToAuthChanges((nextSession) => {
      if (!isMounted) {
        return;
      }

      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setAuthError('');

      if (!nextSession) {
        setActiveWorkspace(null);
        setWorkspaceError('');
        setWorkspaceLoading(false);
        clearDashboardState();
      }
    });

    bootstrapSession();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [clearDashboardState]);

  useEffect(() => {
    if (!session?.user) {
      setActiveWorkspace(null);
      setWorkspaceLoading(false);
      setWorkspaceError('');
      return;
    }

    let ignore = false;

    async function prepareWorkspace() {
      setWorkspaceLoading(true);
      setWorkspaceError('');

      try {
        const workspace = await ensureUserWorkspace(session.user);
        if (!ignore) {
          setActiveWorkspace(workspace);
        }
      } catch (error) {
        console.error('Failed to ensure workspace:', error);
        if (!ignore) {
          setActiveWorkspace(null);
          setWorkspaceError(error.message || 'Gagal menyiapkan workspace.');
        }
      } finally {
        if (!ignore) {
          setWorkspaceLoading(false);
        }
      }
    }

    prepareWorkspace();

    return () => {
      ignore = true;
    };
  }, [session, workspaceRefreshToken]);

  useEffect(() => {
    if (!user || !activeWorkspace || workspaceLoading) {
      return;
    }

    loadData(selectedDate);
  }, [selectedDate, user, activeWorkspace, workspaceLoading, loadData]);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }

    let ignore = false;
    async function fetchProfile() {
      try {
        const data = await getMyProfile(user.id);
        if (!ignore) {
          setProfile(data);
        }
      } catch (err) {
        console.error('Failed to fetch profile in App:', err);
      }
    }
    fetchProfile();
    return () => { ignore = true; };
  }, [user]);

  const handleDateChange = (nextDate) => {
    setSelectedDate(nextDate);
  };

  const handleAiDataChanged = useCallback(() => {
    loadData(selectedDate);
  }, [loadData, selectedDate]);

  const handleLogin = async () => {
    setLoginLoading(true);
    setAuthError('');

    try {
      await signInWithGoogle();
    } catch (error) {
      setAuthError(error.message || 'Gagal memulai login Google.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    setLogoutLoading(true);
    setAuthError('');
    setWorkspaceError('');

    try {
      await signOutUser();
      setSession(null);
      setUser(null);
      setActiveWorkspace(null);
      clearDashboardState();
    } catch (error) {
      setAuthError(error.message || 'Gagal logout.');
    } finally {
      setLogoutLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="auth-shell">
        <main className="status-page">
          <LoadingState message="Memeriksa sesi..." />
        </main>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <LoginPage
        onLogin={handleLogin}
        loading={loginLoading}
        error={authError}
      />
    );
  }

  if (session.user.email !== 'farrosy6@gmail.com') {
    return (
      <div className="auth-shell">
        <main className="status-page" style={{ padding: '2rem', textAlign: 'center' }}>
          <span aria-hidden="true" style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>⚠️</span>
          <h2 style={{ marginBottom: '1rem', color: 'var(--clr-text)' }}>Akses Ditolak</h2>
          <p style={{ lineHeight: '1.6', marginBottom: '2rem', color: 'var(--clr-text-muted)' }}>
            BotFinanceku sedang dikembangkan.<br/>
            Saat ini akses hanya dibuka untuk akun pengembang.<br/>
            Silakan hubungi Farros sebagai developer apabila membutuhkan akses.
          </p>
          <button 
            className="error-state__btn" 
            onClick={handleLogout}
            disabled={logoutLoading}
          >
            {logoutLoading ? 'Keluar...' : 'Keluar'}
          </button>
        </main>
      </div>
    );
  }

  if (workspaceLoading && !activeWorkspace) {
    return (
      <div className="app-wrapper">
        <Header
          user={user}
          profile={profile}
          workspace={null}
          onLogout={handleLogout}
          logoutLoading={logoutLoading}
        />

        <main className="app-main status-page">
          <LoadingState message="Menyiapkan ruang keuangan..." />
        </main>
      </div>
    );
  }

  if (workspaceError && !activeWorkspace) {
    return (
      <div className="app-wrapper">
        <Header
          user={user}
          profile={profile}
          workspace={null}
          onLogout={handleLogout}
          logoutLoading={logoutLoading}
        />

        <main className="app-main status-page">
          <ErrorState
            message={workspaceError}
            onRetry={() => setWorkspaceRefreshToken((value) => value + 1)}
            secondaryAction={handleLogout}
            secondaryLabel="Logout"
          />
        </main>
      </div>
    );
  }

  return (
    <div className="app-wrapper">
      <Header
        user={user}
        profile={profile}
        workspace={activeWorkspace}
        onLogout={handleLogout}
        logoutLoading={logoutLoading}
      />

      <main id="main-content" className="app-main">
        {authError ? (
          <p className="app-inline-alert" role="alert">
            {authError}
          </p>
        ) : null}

        <p className="selected-date-label" aria-live="polite">
          {formatTanggalIndonesia(`${selectedDate}T12:00:00`)}
        </p>

        <DateNav selectedDate={selectedDate} onDateChange={handleDateChange} />

        {loading ? (
          <LoadingState message="Memuat data pengeluaran..." />
        ) : dataError ? (
          <ErrorState message={dataError} onRetry={() => loadData(selectedDate)} />
        ) : (
          <>
            <SummaryCards transactions={transactions} />
            <TransactionList transactions={transactions} />
          </>
        )}
      </main>

      <footer className="app-footer" role="contentinfo">
        <p>&copy; {new Date().getFullYear()} BotFinanceku</p>
      </footer>

      <div className="fab-group">
        <button
          id="btn-open-profile"
          className="fab-profile"
          onClick={() => setProfileOpen(true)}
          aria-label="Buka profil"
          title="Profil"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span className="fab-profile__label">Profil</span>
        </button>

        <button
          id="btn-open-whatsapp"
          className="fab-wa"
          onClick={() => setWhatsappOpen(true)}
          aria-label="Hubungkan WhatsApp"
          title="WhatsApp"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 1 1-7.6-11.7 8.38 8.38 0 0 1 3.8.9L21 3z" />
          </svg>
          <span className="fab-wa__label">WhatsApp</span>
        </button>

        <button
          id="btn-open-ai"
          className="fab-ai"
          onClick={() => setAiOpen(true)}
          aria-label="Buka panel Tilik AI"
          title="Tilik AI"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 2a4 4 0 0 1 4 4v1h1a3 3 0 0 1 3 3v1a3 3 0 0 1-3 3h-1v4a4 4 0 0 1-8 0v-4H7a3 3 0 0 1-3-3v-1a3 3 0 0 1 3-3h1V6a4 4 0 0 1 4-4z" />
            <circle cx="9.5" cy="10" r="1" fill="currentColor" />
            <circle cx="14.5" cy="10" r="1" fill="currentColor" />
            <path d="M9.5 15a3.5 3.5 0 0 0 5 0" />
          </svg>
          <span className="fab-ai__label">AI</span>
        </button>

        <button
          id="btn-open-analysis"
          className="fab-analysis"
          onClick={() => setAnalysisOpen(true)}
          aria-label="Buka analisis keuangan"
          title="Analisis Keuangan"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
            <polyline points="2 20 22 20" />
          </svg>
          <span className="fab-analysis__label">Analisis</span>
        </button>
      </div>

      <AnimatePresence>
        {analysisOpen ? (
          <AnalysisPage 
            onClose={() => setAnalysisOpen(false)} 
            workspaceId={activeWorkspace?.id}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {aiOpen ? (
          <AiPanel
            onClose={() => setAiOpen(false)}
            onDataChanged={handleAiDataChanged}
            workspaceId={activeWorkspace?.id}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {whatsappOpen ? (
          <WhatsappSettingsPanel
            onClose={() => setWhatsappOpen(false)}
            workspaceId={activeWorkspace?.id}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {profileOpen ? (
          <ProfilePanel
            user={user}
            activeWorkspace={activeWorkspace}
            onClose={() => setProfileOpen(false)}
            onProfileUpdated={(updatedProfile) => {
              setProfile(updatedProfile);
            }}
            onWorkspaceUpdated={(updatedWorkspace) => {
              setActiveWorkspace(updatedWorkspace);
            }}
            onLogout={handleLogout}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}
