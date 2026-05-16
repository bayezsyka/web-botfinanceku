function getDisplayName(user) {
  return user?.user_metadata?.full_name || user?.email || 'Pengguna';
}

function getAvatarFallback(user) {
  const name = getDisplayName(user).trim();
  return (name[0] || 'P').toUpperCase();
}

export default function UserMenu({ user, profile, workspace, onLogout, loading }) {
  const displayName = profile?.display_name || user?.user_metadata?.full_name || user?.email || 'Pengguna';
  const avatarUrl = user?.user_metadata?.avatar_url;

  return (
    <div className="user-menu">
      <div className="user-menu__identity">
        <div className="user-menu__avatar" aria-hidden="true">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="user-menu__avatar-image" />
          ) : (
            <span>{getAvatarFallback(user)}</span>
          )}
        </div>

        <div className="user-menu__copy">
          <p className="user-menu__name">{displayName}</p>
          <p className="user-menu__workspace">
            {workspace?.name || 'Menyiapkan workspace...'}
          </p>
        </div>
      </div>

      <button
        type="button"
        className="user-menu__logout"
        onClick={onLogout}
        disabled={loading}
      >
        {loading ? 'Keluar...' : 'Logout'}
      </button>
    </div>
  );
}
