import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          name: string;
          phone: string | null;
          email: string;
          role: 'OWNER' | 'BARBER';
          language: 'en' | 'es';
          active: boolean;
          can_view_shop_reports: boolean;
          can_view_own_stats: boolean;
          can_manage_services: boolean;
          can_manage_products: boolean;
          can_manage_barbers: boolean;
          can_manage_schedules: boolean;
          created_at: string;
          updated_at: string;
        };
      };
      clients: {
        Row: {
          id: string;
          first_name: string;
          last_name: string;
          phone: string;
          email: string | null;
          language: 'en' | 'es';
          created_at: string;
          updated_at: string;
        };
      };
      services: {
        Row: {
          id: string;
          name_en: string;
          name_es: string;
          description_en: string | null;
          description_es: string | null;
          base_price: number;
          duration_minutes: number;
          active: boolean;
        };
      };
      appointments: {
        Row: {
          id: string;
          client_id: string;
          barber_id: string;
          service_id: string;
          scheduled_start: string;
          scheduled_end: string;
          status: 'booked' | 'completed' | 'no_show' | 'cancelled';
          channel: 'online_pwa' | 'internal_manual' | 'voice_agent';
          services_total: number;
          products_total: number;
          tax_amount: number;
          tip_amount: number;
          card_fee_amount: number;
          total_charged: number;
          net_revenue: number;
          payment_method: string | null;
          paid_at: string | null;
          rating: number | null;
          review_comment: string | null;
          created_at: string;
          updated_at: string;
          completed_at: string | null;
        };
      };
    };
  };
};
