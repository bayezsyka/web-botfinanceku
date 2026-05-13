import { supabase } from './supabase.js';

/**
 * Mengambil semua tautan WhatsApp untuk workspace tertentu.
 * @param {string} workspaceId 
 * @returns {Promise<Array>}
 */
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

  return data || [];
}

/**
 * Membuat kode tautan WhatsApp baru menggunakan RPC.
 * @param {Object} params
 * @param {string} params.workspaceId
 * @param {string} params.role - 'sender' | 'report_receiver'
 * @param {string} [params.displayName]
 * @returns {Promise<Object>}
 */
export async function createWhatsappLinkCode({ workspaceId, role, displayName }) {
  if (!workspaceId) throw new Error('Workspace ID diperlukan.');

  const { data, error } = await supabase.rpc('create_whatsapp_link_code', {
    p_workspace_id: workspaceId,
    p_role: role,
    p_display_name: displayName || null
  });

  if (error) {
    throw new Error(`Gagal membuat kode: ${error.message}`);
  }

  return Array.isArray(data) ? data[0] : data;
}

/**
 * Mencabut tautan WhatsApp (menghapus atau me-revoke).
 * @param {string} linkId 
 * @returns {Promise<void>}
 */
export async function revokeWhatsappLink(linkId) {
  if (!linkId) throw new Error('Link ID diperlukan.');

  const { error } = await supabase.rpc('revoke_whatsapp_link', {
    p_link_id: linkId
  });

  if (error) {
    throw new Error(`Gagal memutus nomor: ${error.message}`);
  }
}
