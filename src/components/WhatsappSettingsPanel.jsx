import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, X, User, UserCheck, 
  Clipboard, ClipboardCheck, Trash2, 
  CheckCircle2, Clock, AlertCircle, 
  Plus, Smartphone, ShieldCheck,
  ArrowRight
} from 'lucide-react';
import { getWhatsappLinks, createWhatsappLinkCode, revokeWhatsappLink } from '../lib/whatsappLinks.js';

/* ─── Toast Component ─── */
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
      className={`wa-toast wa-toast--${type}`}
      role="status"
      aria-live="polite"
    >
      <span className="wa-toast__icon" aria-hidden="true">
        {type === 'success' ? '✅' : type === 'warning' ? '⚠️' : '❌'}
      </span>
      <span>{message}</span>
    </motion.div>
  );
}

/* ─── Link Card Component ─── */
function LinkCard({ title, subtitle, role, link, onCreate, onRevoke, busy, busyRevokeId }) {
  const [displayName, setDisplayName] = useState('');
  const [copied, setCopied] = useState(false);

  const isPending = link?.status === 'pending';
  const isVerified = link?.status === 'verified';

  const instructionCode = role === 'sender' 
    ? `PENGIRIM ${link?.link_code}` 
    : `LAPORAN ${link?.link_code}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(instructionCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatExpiry = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleString('id-ID', { 
      day: 'numeric', 
      month: 'short', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className={`wa-card ${isVerified ? 'wa-card--verified' : isPending ? 'wa-card--pending' : ''}`}>
      <div className="wa-card__header">
        <div className="wa-card__icon">
          {isVerified ? <UserCheck size={20} /> : <User size={20} />}
        </div>
        <div className="wa-card__title-group">
          <h4 className="wa-card__title">{title}</h4>
          <p className="wa-card__subtitle">{subtitle}</p>
        </div>
        {isVerified && <span className="wa-status-badge wa-status-badge--success">Terhubung</span>}
        {isPending && <span className="wa-status-badge wa-status-badge--warning">Menunggu</span>}
      </div>

      <div className="wa-card__content">
        {!link && (
          <div className="wa-form">
            <input 
              type="text" 
              className="wa-input" 
              placeholder="Nama (opsional), misal: Farros" 
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={busy}
            />
            <button 
              className="wa-btn wa-btn--primary" 
              onClick={() => onCreate(role, displayName)}
              disabled={busy}
            >
              {busy ? <div className="spinner-ring spinner-ring--sm" /> : <Plus size={16} />}
              <span>Buat Kode {role === 'sender' ? 'Pengirim' : 'Laporan'}</span>
            </button>
          </div>
        )}

        {isPending && (
          <div className="wa-pending-box">
            <p className="wa-instruction-label">Kirim pesan di bawah ke nomor bot:</p>
            <div className="wa-code-box" onClick={handleCopy}>
              <code className="wa-code">{instructionCode}</code>
              <button className="wa-copy-btn" aria-label="Salin kode">
                {copied ? <ClipboardCheck size={18} color="var(--clr-primary)" /> : <Clipboard size={18} />}
              </button>
            </div>
            <div className="wa-expiry">
              <Clock size={12} />
              <span>Berlaku s/d {formatExpiry(link.expires_at)}</span>
            </div>
            <p className="wa-help-text">
              Kirim pesan di atas ke nomor bot dari WhatsApp yang ingin dihubungkan.
            </p>
            <button 
              className="wa-btn wa-btn--danger-ghost wa-btn--sm" 
              onClick={() => onRevoke(link.id)}
              disabled={busyRevokeId === link.id}
            >
              {busyRevokeId === link.id ? <div className="spinner-ring spinner-ring--sm" /> : <Trash2 size={14} />}
              <span>Batalkan</span>
            </button>
          </div>
        )}

        {isVerified && (
          <div className="wa-verified-box">
            <div className="wa-verified-info">
              <div className="wa-phone-row">
                <Smartphone size={16} color="var(--clr-text-muted)" />
                <span className="wa-phone-number">+{link.whatsapp_number}</span>
              </div>
              {link.display_name && (
                <p className="wa-display-name">{link.display_name}</p>
              )}
            </div>
            <button 
              className="wa-btn wa-btn--danger wa-btn--sm" 
              onClick={() => onRevoke(link.id)}
              disabled={busyRevokeId === link.id}
            >
              {busyRevokeId === link.id ? <div className="spinner-ring spinner-ring--sm" /> : <Trash2 size={14} />}
              <span>Putuskan</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Main Panel Component ─── */
export default function WhatsappSettingsPanel({ onClose, workspaceId }) {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyRole, setBusyRole] = useState(null);
  const [busyRevokeId, setBusyRevokeId] = useState(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  const fetchData = useCallback(async () => {
    if (!workspaceId) return;
    
    setLoading(true);
    try {
      const data = await getWhatsappLinks(workspaceId);
      setLinks(data);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateCode = async (role, displayName) => {
    setBusyRole(role);
    setError('');
    
    try {
      await createWhatsappLinkCode({ workspaceId, role, displayName });
      setToast({ message: 'Kode berhasil dibuat. Kirim kode ini ke bot WhatsApp.', type: 'success' });
      await fetchData();
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setBusyRole(null);
    }
  };

  const handleRevoke = async (linkId) => {
    setBusyRevokeId(linkId);
    setError('');

    try {
      await revokeWhatsappLink(linkId);
      setToast({ message: 'Nomor berhasil diputus.', type: 'success' });
      await fetchData();
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setBusyRevokeId(null);
    }
  };

  const senderLink = links.find(l => l.role === 'sender');
  const receiverLink = links.find(l => l.role === 'report_receiver');

  return (
    <motion.div
      className="wa-overlay"
      initial={{ opacity: 0, x: '100%' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
    >
      <div className="wa-header">
        <div className="wa-header__inner">
          <div className="wa-header__left">
            <div className="wa-header__icon">
              <MessageCircle size={24} color="#fff" />
            </div>
            <div>
              <h2 className="wa-header__title">Hubungkan WhatsApp</h2>
              <p className="wa-header__sub">Sambungkan nomor pencatat dan penerima laporan</p>
            </div>
          </div>
          <button className="wa-close-btn" onClick={onClose} aria-label="Tutup">
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="wa-body">
        {loading && links.length === 0 ? (
          <div className="wa-loader">
            <div className="spinner-ring" />
            <p>Memuat pengaturan WhatsApp...</p>
          </div>
        ) : (
          <div className="wa-content">
            {error && (
              <div className="wa-alert wa-alert--error">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <div className="wa-section">
              <LinkCard 
                title="Nomor Pengirim"
                subtitle="Nomor ini dipakai untuk mencatat pengeluaran lewat WhatsApp."
                role="sender"
                link={senderLink}
                onCreate={handleCreateCode}
                onRevoke={handleRevoke}
                busy={busyRole === 'sender'}
                busyRevokeId={busyRevokeId}
              />

              <LinkCard 
                title="Penerima Laporan"
                subtitle="Nomor ini hanya menerima laporan harian."
                role="report_receiver"
                link={receiverLink}
                onCreate={handleCreateCode}
                onRevoke={handleRevoke}
                busy={busyRole === 'report_receiver'}
                busyRevokeId={busyRevokeId}
              />
            </div>

            <div className="wa-info-box">
              <ShieldCheck size={20} color="var(--clr-primary)" />
              <div className="wa-info-box__content">
                <h5>Keamanan Terjamin</h5>
                <p>BotFinanceku tidak bisa membaca pesan selain instruksi BF-XXXXXX. Data nomor dienkripsi dan hanya digunakan untuk identifikasi workspace.</p>
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
