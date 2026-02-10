export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_logs: {
        Row: {
          created_at: string
          event_type: string
          id: string
          message: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          message: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          message?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      download_history: {
        Row: {
          created_at: string
          download_link: string
          file_name: string
          file_size: string | null
          file_type: string | null
          id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          download_link: string
          file_name: string
          file_size?: string | null
          file_type?: string | null
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          download_link?: string
          file_name?: string
          file_size?: string | null
          file_type?: string | null
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          download_link: string
          fast_download_link: string | null
          file_name: string
          file_size: string | null
          file_type: string | null
          id: string
          source_url: string | null
          stream_url: string | null
          thumbnail: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          download_link: string
          fast_download_link?: string | null
          file_name: string
          file_size?: string | null
          file_type?: string | null
          id?: string
          source_url?: string | null
          stream_url?: string | null
          thumbnail?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          download_link?: string
          fast_download_link?: string | null
          file_name?: string
          file_size?: string | null
          file_type?: string | null
          id?: string
          source_url?: string | null
          stream_url?: string | null
          thumbnail?: string | null
          user_id?: string
        }
        Relationships: []
      }
      fetched_files: {
        Row: {
          created_at: string
          file_count: number
          file_data: Json
          id: string
          source_url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_count?: number
          file_data: Json
          id?: string
          source_url: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_count?: number
          file_data?: Json
          id?: string
          source_url?: string
          user_id?: string
        }
        Relationships: []
      }
      link_health: {
        Row: {
          created_at: string
          fail_count: number
          favorite_id: string
          id: string
          last_checked_at: string
          last_error: string | null
          source_url: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          fail_count?: number
          favorite_id: string
          id?: string
          last_checked_at?: string
          last_error?: string | null
          source_url: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          fail_count?: number
          favorite_id?: string
          id?: string
          last_checked_at?: string
          last_error?: string | null
          source_url?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "link_health_favorite_id_fkey"
            columns: ["favorite_id"]
            isOneToOne: false
            referencedRelation: "favorites"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          action_type: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      shared_cache: {
        Row: {
          created_at: string
          expires_at: string
          fetched_by: string | null
          file_count: number
          file_data: Json
          id: string
          source_url: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          fetched_by?: string | null
          file_count?: number
          file_data: Json
          id?: string
          source_url: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          fetched_by?: string | null
          file_count?: number
          file_data?: Json
          id?: string
          source_url?: string
        }
        Relationships: []
      }
      shared_links: {
        Row: {
          created_at: string
          expires_at: string | null
          file_count: number
          file_data: Json
          id: string
          share_code: string
          source_url: string
          title: string | null
          user_id: string
          view_count: number
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          file_count?: number
          file_data: Json
          id?: string
          share_code?: string
          source_url: string
          title?: string | null
          user_id: string
          view_count?: number
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          file_count?: number
          file_data?: Json
          id?: string
          share_code?: string
          source_url?: string
          title?: string | null
          user_id?: string
          view_count?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_rate_limit: {
        Args: {
          _action_type: string
          _max_count: number
          _user_id: string
          _window_minutes: number
        }
        Returns: boolean
      }
      cleanup_expired_cache: { Args: never; Returns: undefined }
      get_shared_link_by_code: {
        Args: { _share_code: string }
        Returns: {
          created_at: string
          expires_at: string
          file_count: number
          file_data: Json
          id: string
          share_code: string
          source_url: string
          title: string
          view_count: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_shared_link_views: {
        Args: { _share_code: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
