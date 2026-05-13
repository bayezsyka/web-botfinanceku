import { supabase } from './supabase.js';

const DEFAULT_TIMEZONE = 'Asia/Jakarta';
const DEFAULT_REPORT_HOUR = 21;
const DEFAULT_REPORT_MINUTE = 0;
const workspaceBootPromises = new Map();

function getUserDisplayName(user) {
  const fullName = user?.user_metadata?.full_name?.trim();

  if (fullName) {
    return fullName;
  }

  if (user?.email) {
    return user.email;
  }

  return 'Pengguna';
}

function getWorkspaceName(user) {
  const displayName = getUserDisplayName(user).split(' ')[0] || 'Pengguna';
  return `Keuangan ${displayName}`;
}

function isConflictError(error) {
  return error?.code === '23505' || /duplicate key/i.test(error?.message ?? '');
}

async function ensureProfile(user) {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    throw new Error(`Gagal memeriksa profile: ${error.message}`);
  }

  if (profile) {
    return;
  }

  const { error: insertError } = await supabase.from('profiles').insert({
    user_id: user.id,
    display_name: getUserDisplayName(user),
    email: user.email ?? null,
    avatar_url: user?.user_metadata?.avatar_url ?? null,
  });

  if (insertError && !isConflictError(insertError)) {
    throw new Error(`Gagal membuat profile: ${insertError.message}`);
  }
}

async function getExistingWorkspace(userId) {
  async function getWorkspaceById(workspaceId) {
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('*')
      .eq('id', workspaceId)
      .maybeSingle();

    if (workspaceError) {
      throw new Error(`Gagal memuat workspace: ${workspaceError.message}`);
    }

    return workspace;
  }

  const { data: memberships, error: membershipError } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', userId)
    .limit(1);

  if (membershipError) {
    throw new Error(`Gagal memeriksa anggota workspace: ${membershipError.message}`);
  }

  const workspaceId = memberships?.[0]?.workspace_id;

  if (!workspaceId) {
    const { data: ownedWorkspaces, error: ownedWorkspaceError } = await supabase
      .from('workspaces')
      .select('*')
      .eq('owner_user_id', userId)
      .limit(1);

    if (ownedWorkspaceError) {
      throw new Error(`Gagal memeriksa workspace owner: ${ownedWorkspaceError.message}`);
    }

    const ownedWorkspace = ownedWorkspaces?.[0];
    if (!ownedWorkspace) {
      return null;
    }

    const { error: memberError } = await supabase.from('workspace_members').insert({
      workspace_id: ownedWorkspace.id,
      user_id: userId,
      role: 'owner',
    });

    if (memberError && !isConflictError(memberError)) {
      throw new Error(`Gagal memulihkan anggota workspace: ${memberError.message}`);
    }

    return ownedWorkspace;
  }

  const workspace = await getWorkspaceById(workspaceId);

  if (!workspace) {
    throw new Error('Workspace anggota ditemukan, tetapi data workspace tidak tersedia.');
  }

  return workspace;
}

async function createWorkspaceForUser(user) {
  const { data: workspace, error: workspaceError } = await supabase
    .from('workspaces')
    .insert({
      owner_user_id: user.id,
      name: getWorkspaceName(user),
      timezone: DEFAULT_TIMEZONE,
      daily_report_hour: DEFAULT_REPORT_HOUR,
      daily_report_minute: DEFAULT_REPORT_MINUTE,
    })
    .select('*')
    .single();

  if (workspaceError) {
    throw new Error(`Gagal membuat workspace: ${workspaceError.message}`);
  }

  const { error: memberError } = await supabase.from('workspace_members').insert({
    workspace_id: workspace.id,
    user_id: user.id,
    role: 'owner',
  });

  if (memberError && !isConflictError(memberError)) {
    throw new Error(`Gagal menambahkan owner workspace: ${memberError.message}`);
  }

  return workspace;
}

async function ensureUserWorkspaceInternal(user) {
  if (!user?.id) {
    throw new Error('User tidak valid untuk menyiapkan workspace.');
  }

  await ensureProfile(user);

  const existingWorkspace = await getExistingWorkspace(user.id);
  if (existingWorkspace) {
    return existingWorkspace;
  }

  return createWorkspaceForUser(user);
}

export function ensureUserWorkspace(user) {
  if (!user?.id) {
    return Promise.reject(new Error('User tidak valid untuk menyiapkan workspace.'));
  }

  const cachedPromise = workspaceBootPromises.get(user.id);
  if (cachedPromise) {
    return cachedPromise;
  }

  const nextPromise = ensureUserWorkspaceInternal(user).finally(() => {
    workspaceBootPromises.delete(user.id);
  });

  workspaceBootPromises.set(user.id, nextPromise);
  return nextPromise;
}
