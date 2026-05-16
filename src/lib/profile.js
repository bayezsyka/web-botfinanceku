import { supabase } from './supabase.js';

export async function getMyProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    throw error;
  }
  return data;
}

export async function updateMyProfile(displayName) {
  const { data, error } = await supabase.rpc('update_my_profile', {
    p_display_name: displayName,
  });

  if (error) {
    console.error('Error updating profile:', error);
    throw error;
  }
  return data?.[0];
}

export async function updateMyWorkspace({
  workspaceId,
  name,
  timezone,
  dailyReportHour,
  dailyReportMinute,
}) {
  const { data, error } = await supabase.rpc('update_my_workspace', {
    p_workspace_id: workspaceId,
    p_name: name,
    p_timezone: timezone,
    p_daily_report_hour: parseInt(dailyReportHour, 10),
    p_daily_report_minute: parseInt(dailyReportMinute, 10),
  });

  if (error) {
    console.error('Error updating workspace:', error);
    throw error;
  }
  return data?.[0];
}
