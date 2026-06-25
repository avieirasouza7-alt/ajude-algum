import { supabase } from "@/integrations/supabase/client";

export type AdminAnalyticsDashboard = {
  days: number;
  visits_today: number;
  visits_period: number;
  page_views_period: number;
  avg_time_on_page_seconds: number;
  top_pages: { path: string; views: number }[];
  top_referrers: { source: string; visits: number }[];
  top_campaigns: { slug: string; title: string; views: number }[];
  top_events: { type: string; total: number }[];
  visits_by_day: { day: string; visits: number }[];
};

export async function fetchAdminAnalyticsDashboard(days = 30): Promise<AdminAnalyticsDashboard> {
  const { data, error } = await supabase.rpc("get_admin_analytics_dashboard", { p_days: days });
  if (error) throw error;
  return data as AdminAnalyticsDashboard;
}
