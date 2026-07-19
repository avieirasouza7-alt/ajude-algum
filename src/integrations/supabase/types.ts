export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      campaigns: {
        Row: {
          admin_notes: string | null;
          beneficiary_name: string;
          category: string;
          city: string;
          created_at: string;
          featured: boolean;
          goal_amount: number;
          hidden: boolean;
          id: string;
          image_path: string | null;
          image_paths: string[];
          pix_key: string;
          raised_amount: number;
          rejection_reason: string | null;
          slug: string;
          state: string;
          status: Database["public"]["Enums"]["campaign_status"];
          story: string;
          title: string;
          updated_at: string;
          user_id: string;
          views: number;
          soft_views: number;
        };
        Insert: {
          admin_notes?: string | null;
          beneficiary_name: string;
          category: string;
          city: string;
          created_at?: string;
          featured?: boolean;
          goal_amount: number;
          hidden?: boolean;
          id?: string;
          image_path?: string | null;
          image_paths?: string[];
          pix_key: string;
          raised_amount?: number;
          rejection_reason?: string | null;
          slug: string;
          state: string;
          status?: Database["public"]["Enums"]["campaign_status"];
          story: string;
          title: string;
          updated_at?: string;
          user_id: string;
          views?: number;
          soft_views?: number;
        };
        Update: {
          admin_notes?: string | null;
          beneficiary_name?: string;
          category?: string;
          city?: string;
          created_at?: string;
          featured?: boolean;
          goal_amount?: number;
          hidden?: boolean;
          id?: string;
          image_path?: string | null;
          image_paths?: string[];
          pix_key?: string;
          raised_amount?: number;
          rejection_reason?: string | null;
          slug?: string;
          state?: string;
          status?: Database["public"]["Enums"]["campaign_status"];
          story?: string;
          title?: string;
          updated_at?: string;
          user_id?: string;
          views?: number;
          soft_views?: number;
        };
        Relationships: [];
      };
      comments: {
        Row: {
          campaign_id: string;
          content: string;
          created_at: string;
          id: string;
          user_id: string;
        };
        Insert: {
          campaign_id: string;
          content: string;
          created_at?: string;
          id?: string;
          user_id: string;
        };
        Update: {
          campaign_id?: string;
          content?: string;
          created_at?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "comments_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          },
        ];
      };
      comment_hearts: {
        Row: {
          comment_id: string;
          created_at: string;
          id: string;
          user_id: string;
        };
        Insert: {
          comment_id: string;
          created_at?: string;
          id?: string;
          user_id: string;
        };
        Update: {
          comment_id?: string;
          created_at?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "comment_hearts_comment_id_fkey";
            columns: ["comment_id"];
            isOneToOne: false;
            referencedRelation: "comments";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          account_status: string;
          avatar_url: string | null;
          created_at: string;
          full_name: string | null;
          id: string;
          last_seen_at: string | null;
          phone: string | null;
          status_reason: string | null;
          updated_at: string;
        };
        Insert: {
          account_status?: string;
          avatar_url?: string | null;
          created_at?: string;
          full_name?: string | null;
          id: string;
          last_seen_at?: string | null;
          phone?: string | null;
          status_reason?: string | null;
          updated_at?: string;
        };
        Update: {
          account_status?: string;
          avatar_url?: string | null;
          created_at?: string;
          full_name?: string | null;
          id?: string;
          last_seen_at?: string | null;
          phone?: string | null;
          status_reason?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      reports: {
        Row: {
          admin_action: string | null;
          admin_notes: string | null;
          campaign_id: string | null;
          campaign_reference: string | null;
          created_at: string;
          id: string;
          reason: string;
          report_type: string;
          resolved: boolean;
          user_id: string;
        };
        Insert: {
          admin_action?: string | null;
          admin_notes?: string | null;
          campaign_id?: string | null;
          campaign_reference?: string | null;
          created_at?: string;
          id?: string;
          reason: string;
          report_type?: string;
          resolved?: boolean;
          user_id: string;
        };
        Update: {
          admin_action?: string | null;
          admin_notes?: string | null;
          campaign_id?: string | null;
          campaign_reference?: string | null;
          created_at?: string;
          id?: string;
          reason?: string;
          report_type?: string;
          resolved?: boolean;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reports_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          },
        ];
      };
      admin_audit_logs: {
        Row: {
          action: string;
          admin_id: string;
          created_at: string;
          details: Json;
          entity_id: string | null;
          entity_type: string | null;
          id: string;
        };
        Insert: {
          action: string;
          admin_id: string;
          created_at?: string;
          details?: Json;
          entity_id?: string | null;
          entity_type?: string | null;
          id?: string;
        };
        Update: {
          action?: string;
          admin_id?: string;
          created_at?: string;
          details?: Json;
          entity_id?: string | null;
          entity_type?: string | null;
          id?: string;
        };
        Relationships: [];
      };
      admin_notifications: {
        Row: {
          body: string | null;
          created_at: string;
          id: string;
          link: string | null;
          read: boolean;
          title: string;
          type: string;
        };
        Insert: {
          body?: string | null;
          created_at?: string;
          id?: string;
          link?: string | null;
          read?: boolean;
          title: string;
          type: string;
        };
        Update: {
          body?: string | null;
          created_at?: string;
          id?: string;
          link?: string | null;
          read?: boolean;
          title?: string;
          type?: string;
        };
        Relationships: [];
      };
      site_settings: {
        Row: {
          key: string;
          updated_at: string;
          updated_by: string | null;
          value: Json;
        };
        Insert: {
          key: string;
          updated_at?: string;
          updated_by?: string | null;
          value?: Json;
        };
        Update: {
          key?: string;
          updated_at?: string;
          updated_by?: string | null;
          value?: Json;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      garden_world_state: {
        Row: {
          id: string;
          revision: number;
          raining: boolean;
          clearing: boolean;
          weather_until: string | null;
          last_tick: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          revision?: number;
          raining?: boolean;
          clearing?: boolean;
          weather_until?: string | null;
          last_tick?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          revision?: number;
          raining?: boolean;
          clearing?: boolean;
          weather_until?: string | null;
          last_tick?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      garden_seedlings: {
        Row: {
          id: string;
          name: string;
          species: string;
          pos_x: number;
          pos_y: number;
          pos_z: number;
          growth: number;
          water: number;
          light: number;
          fertilizer: number;
          cleanliness: number;
          pest_free: number;
          beauty: number;
          fertilizer_actions: number;
          last_pruned_at: string | null;
          total_care_actions: number;
          last_care_at: string;
          caregivers: Json;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          species: string;
          pos_x?: number;
          pos_y?: number;
          pos_z?: number;
          growth?: number;
          water?: number;
          light?: number;
          fertilizer?: number;
          cleanliness?: number;
          pest_free?: number;
          beauty?: number;
          fertilizer_actions?: number;
          last_pruned_at?: string | null;
          total_care_actions?: number;
          last_care_at?: string;
          caregivers?: Json;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          species?: string;
          pos_x?: number;
          pos_y?: number;
          pos_z?: number;
          growth?: number;
          water?: number;
          light?: number;
          fertilizer?: number;
          cleanliness?: number;
          pest_free?: number;
          beauty?: number;
          fertilizer_actions?: number;
          last_pruned_at?: string | null;
          total_care_actions?: number;
          last_care_at?: string;
          caregivers?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      garden_actions: {
        Row: {
          id: string;
          user_id: string;
          seedling_id: string;
          kind: string;
          growth_delta: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          seedling_id: string;
          kind: string;
          growth_delta?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          seedling_id?: string;
          kind?: string;
          growth_delta?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      garden_chat_messages: {
        Row: {
          id: string;
          user_id: string;
          body: string;
          hidden: boolean;
          hidden_by: string | null;
          hidden_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          body: string;
          hidden?: boolean;
          hidden_by?: string | null;
          hidden_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          body?: string;
          hidden?: boolean;
          hidden_by?: string | null;
          hidden_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      garden_presence: {
        Row: {
          user_id: string;
          last_seen: string;
          selected_seedling_id: string | null;
        };
        Insert: {
          user_id: string;
          last_seen?: string;
          selected_seedling_id?: string | null;
        };
        Update: {
          user_id?: string;
          last_seen?: string;
          selected_seedling_id?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      admin_dashboard_stats: {
        Args: Record<string, never>;
        Returns: Json;
      };
      admin_ensure_missing_profiles: {
        Args: Record<string, never>;
        Returns: number;
      };
      bootstrap_first_admin: {
        Args: Record<string, never>;
        Returns: undefined;
      };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      increment_campaign_views: {
        Args: {
          p_campaign_id: string;
        };
        Returns: boolean;
      };
      tick_soft_campaign_views: {
        Args: Record<string, never>;
        Returns: Json;
      };
      increment_site_visit: {
        Args: Record<string, never>;
        Returns: undefined;
      };
      pulse_site_visit: {
        Args: {
          p_session_id: string;
        };
        Returns: undefined;
      };
      get_site_visit_stats: {
        Args: Record<string, never>;
        Returns: {
          total_visits: number;
          active_now: number;
        }[];
      };
      record_site_analytics_event: {
        Args: {
          p_session_id: string;
          p_event_type: string;
          p_page_path?: string | null;
          p_referrer?: string | null;
          p_referrer_source?: string | null;
          p_campaign_slug?: string | null;
          p_duration_seconds?: number | null;
          p_metadata?: Record<string, unknown>;
        };
        Returns: undefined;
      };
      get_admin_analytics_dashboard: {
        Args: {
          p_days?: number;
        };
        Returns: Record<string, unknown>;
      };
      garden_get_snapshot: {
        Args: Record<string, never>;
        Returns: Json;
      };
      garden_pulse_presence: {
        Args: {
          p_selected_seedling_id?: string | null;
        };
        Returns: Json;
      };
      garden_leave_presence: {
        Args: Record<string, never>;
        Returns: undefined;
      };
      garden_care_action: {
        Args: {
          p_seedling_id: string;
          p_kind: string;
        };
        Returns: Json;
      };
      garden_send_chat: {
        Args: {
          p_body: string;
        };
        Returns: Json;
      };
      garden_hide_chat: {
        Args: {
          p_message_id: string;
        };
        Returns: Json;
      };
      garden_admin_overview: {
        Args: Record<string, never>;
        Returns: Json;
      };
      garden_admin_moderate: {
        Args: {
          p_target: string;
          p_action: string;
          p_minutes?: number | null;
          p_reason?: string | null;
        };
        Returns: Json;
      };
    };
    Enums: {
      app_role: "admin" | "user";
      campaign_status: "pending" | "approved" | "rejected" | "correction_requested" | "archived";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      campaign_status: ["pending", "approved", "rejected", "correction_requested", "archived"],
    },
  },
} as const;
