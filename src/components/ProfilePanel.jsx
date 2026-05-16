import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getMyProfile, updateMyProfile, updateMyWorkspace } from '../lib/profile.js';

export default function ProfilePanel({
  user,
  activeWorkspace,
  onClose,
  onProfileUpdated,
  onWorkspaceUpdated,
  onLogout,
}) {
  const [displayName, setDisplayName] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [timezone, setTimezone] = useState('Asia/Jakarta');
  const [dailyReportHour, setDailyReportHour] = useState(0);
  const [dailyReportMinute, setDailyReportMinute] = useState(0);

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingWorkspace, setSavingWorkspace] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      if (!user) return;
      setLoading(true);
      setError('');
      try {
        const profile = await getMyProfile(user.id);
        if (!ignore) {
          setDisplayName(profile?.display_name || user?.user_metadata?.full_name || user?.email || '');
          if (activeWorkspace) {
            setWorkspaceName(activeWorkspace.name || '');
            setTimezone(activeWorkspace.timezone || 'Asia/Jakarta');
            setDailyReportHour(activeWorkspace.daily_report_hour ?? 0);
            setDailyReportMinute(activeWorkspace.daily_report_minute ?? 0);
          }
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
        if (!ignore) setError('Gagal memuat data profil.');
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    loadData();
    return () => {
      ignore = true;
    };
  }, [user, activeWorkspace]);

  const handleSaveProfile = async () => {
    if (!displayName.trim()) {
      setError('Nama akun tidak boleh hanya spasi.');
      return;
    }
    setSavingProfile(true);
    setError('');
    setSuccessMessage('');
    try {
      const updated = await updateMyProfile(displayName.trim());
      setSuccessMessage('Nama akun berhasil diperbarui.');
      if (onProfileUpdated) {
        onProfileUpdated(updated);
      }
    } catch (err) {
      setError('Gagal memperbarui profil.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveWorkspace = async () => {
    if (!workspaceName.trim()) {
      setError('Nama ruang keuangan tidak boleh hanya spasi.');
      return;
    }
    const h = parseInt(dailyReportHour, 10);
    const m = parseInt(dailyReportMinute, 10);

    if (isNaN(h) || h < 0 || h > 23) {
      setError('Jam laporan harus 0 sampai 23.');
      return;
    }
    if (isNaN(m) || m < 0 || m > 59) {
      setError('Menit laporan harus 0 sampai 59.');
      return;
    }

    setSavingWorkspace(true);
    setError('');
    setSuccessMessage('');
    try {
      const updated = await updateMyWorkspace({
        workspaceId: activeWorkspace.id,
        name: workspaceName.trim(),
        timezone,
        dailyReportHour: h,
        dailyReportMinute: m,
      });
      setSuccessMessage('Workspace berhasil diperbarui.');
      if (onWorkspaceUpdated) {
        onWorkspaceUpdated(updated);
      }
    } catch (err) {
      setError('Gagal memperbarui workspace.');
    } finally {
      setSavingWorkspace(false);
    }
  };

  const avatarUrl = user?.user_metadata?.avatar_url;
  const email = user?.email;
  const fullName = user?.user_metadata?.full_name;

  return (
    <motion.div
      className="profile-overlay"
      initial={{ opacity: 0, x: '100%' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
    >
      <div className="profile-header">
        <div className="profile-header__inner">
          <div className="profile-header__left">
            <span className="profile-header__icon" aria-hidden="true">👤</span>
            <div>
              <h2 className="profile-header__title">Profil</h2>
              <p className="profile-header__sub">Atur identitas akun dan ruang keuanganmu</p>
            </div>
          </div>
          <button className="profile-close-btn" onClick={onClose} aria-label="Tutup">✕</button>
        </div>
      </div>

      <div className="profile-body">
        {loading ? (
          <div className="profile-loader">
            <div className="spinner-ring" />
            <p>Memuat profil...</p>
          </div>
        ) : (
          <div className="profile-content">
            {error && <div className="profile-alert profile-alert--error" role="alert">{error}</div>}
            {successMessage && <div className="profile-alert profile-alert--success" role="status">{successMessage}</div>}

            {/* Google Account Card */}
            <section className="profile-card" aria-labelledby="google-account-title">
              <h3 id="google-account-title" className="profile-card__label">Akun Google</h3>
              <div className="profile-google">
                <div className="profile-google__avatar">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" />
                  ) : (
                    <span>{(fullName?.[0] || email?.[0] || 'U').toUpperCase()}</span>
                  )}
                </div>
                <div className="profile-google__info">
                  <p className="profile-google__name">{fullName || 'Pengguna Google'}</p>
                  <p className="profile-google__email">{email}</p>
                </div>
              </div>
              <div className="profile-google__actions">
                <button className="profile-btn profile-btn--secondary" onClick={onLogout}>
                  Ganti Akun Google
                </button>
                <p className="profile-hint">
                  Untuk mengganti akun Google, keluar lalu masuk dengan akun lain.
                </p>
              </div>
            </section>

            {/* Profile Name Card */}
            <section className="profile-card" aria-labelledby="profile-name-title">
              <h3 id="profile-name-title" className="profile-card__label">Nama Akun</h3>
              <div className="profile-form">
                <div className="profile-field">
                  <label htmlFor="display-name">Nama pengelola</label>
                  <input
                    id="display-name"
                    type="text"
                    className="profile-input"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Masukkan nama pengelola"
                  />
                </div>
                <button
                  className="profile-btn profile-btn--primary"
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                >
                  {savingProfile ? 'Menyimpan...' : 'Simpan Nama'}
                </button>
              </div>
            </section>

            {/* Workspace Card */}
            <section className="profile-card" aria-labelledby="workspace-settings-title">
              <h3 id="workspace-settings-title" className="profile-card__label">Ruang Keuangan</h3>
              {!activeWorkspace ? (
                <div className="profile-loader" style={{ height: 'auto', padding: '20px 0' }}>
                  <p className="profile-hint">Menyiapkan workspace...</p>
                </div>
              ) : (
                <div className="profile-form">
                  <div className="profile-field">
                    <label htmlFor="workspace-name">Nama ruang keuangan</label>
                    <input
                      id="workspace-name"
                      type="text"
                      className="profile-input"
                      value={workspaceName}
                      onChange={(e) => setWorkspaceName(e.target.value)}
                      placeholder="Masukkan nama workspace"
                    />
                  </div>
                  <div className="profile-field">
                    <label htmlFor="timezone">Timezone</label>
                    <select
                      id="timezone"
                      className="profile-input"
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                    >
                      <option value="Asia/Jakarta">Asia/Jakarta (WIB)</option>
                      <option value="Asia/Makassar">Asia/Makassar (WITA)</option>
                      <option value="Asia/Jayapura">Asia/Jayapura (WIT)</option>
                    </select>
                  </div>
                  <div className="profile-row">
                    <div className="profile-field">
                      <label htmlFor="report-hour">Jam Laporan (0-23)</label>
                      <input
                        id="report-hour"
                        type="number"
                        min="0"
                        max="23"
                        className="profile-input"
                        value={dailyReportHour}
                        onChange={(e) => setDailyReportHour(e.target.value)}
                      />
                    </div>
                    <div className="profile-field">
                      <label htmlFor="report-minute">Menit (0-59)</label>
                      <input
                        id="report-minute"
                        type="number"
                        min="0"
                        max="59"
                        className="profile-input"
                        value={dailyReportMinute}
                        onChange={(e) => setDailyReportMinute(e.target.value)}
                      />
                    </div>
                  </div>
                  <button
                    className="profile-btn profile-btn--primary"
                    onClick={handleSaveWorkspace}
                    disabled={savingWorkspace}
                  >
                    {savingWorkspace ? 'Menyimpan...' : 'Simpan Workspace'}
                  </button>
                </div>
              )}
            </section>

            {/* Logout Card */}
            <div className="profile-card profile-card--danger">
              <button className="profile-btn profile-btn--danger-ghost" onClick={onLogout}>
                Keluar dari BotFinanceku
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
