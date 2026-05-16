import { supabase } from './supabase.js';

function normalizeWhatsappLink(row) {
  if (!row) return null;

  const code = row.verification_code || row.code || '';
  const prefix = row.role === 'sender' ? 'PENGIRIM' : 'LAPORAN';

  return {
    ...row,
    code,
    verification_code: code,
    instruction: row.instruction || `${prefix} ${code}`,
  };
}

export async function getWhatsappLinks(workspaceId) {
  if (!workspaceId) return [];

  const { data, error } = await supabase
    .from('whatsapp_links')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Gagal mengambil data WhatsApp: ${error.message}`);
  }

  return (data || []).map(normalizeWhatsappLink);
}

export async function createWhatsappLinkCode({ workspaceId, role, displayName }) {
  if (!workspaceId) {
    throw new Error('Workspace belum siap.');
  }

  const { data, error } = await supabase.rpc('create_whatsapp_link_code', {
    p_workspace_id: workspaceId,
    p_role: role,
    p_display_name: displayName || null,
  });

  if (error) {
    throw new Error(`Gagal membuat kode: ${error.message}`);
  }

  const row = Array.isArray(data) ? data[0] : data;

  return normalizeWhatsappLink(row);
}

export async function revokeWhatsappLink(linkId) {
  if (!linkId) {
    throw new Error('ID link tidak ditemukan.');
  }

  const { data, error } = await supabase.rpc('revoke_whatsapp_link', {
    p_link_id: linkId,
  });

  if (error) {
    throw new Error(`Gagal memutus nomor: ${error.message}`);
  }

  return Array.isArray(data) ? data[0] : data;
}
