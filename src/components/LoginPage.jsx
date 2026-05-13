export default function LoginPage({ onLogin, loading, error }) {
  return (
    <div className="auth-shell">
      <main className="login-page" aria-labelledby="login-title">
        <div className="login-page__card">
          <div className="login-page__badge">BotFinanceku</div>
          <h1 id="login-title" className="login-page__title">
            BotFinanceku
          </h1>
          <p className="login-page__subtitle">
            Catat pengeluaran lewat WhatsApp, rapikan dengan AI.
          </p>

          <button
            type="button"
            className="login-page__button"
            onClick={onLogin}
            disabled={loading}
          >
            <span className="login-page__button-icon" aria-hidden="true">
              G
            </span>
            <span>{loading ? 'Memproses...' : 'Masuk dengan Google'}</span>
          </button>

          <p className="login-page__hint">
            Satu akun akan langsung dibuatkan profile dan ruang keuangan default.
          </p>

          {error ? (
            <p className="login-page__error" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </main>
    </div>
  );
}
