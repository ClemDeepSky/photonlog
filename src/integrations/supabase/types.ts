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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      equipment_profiles: {
        Row: {
          acquisition_software: string | null
          corrector: string | null
          created_at: string
          diameter: number | null
          filters: string[]
          focal_length: number | null
          guide_camera: string | null
          id: string
          imager_name: string | null
          mount: string | null
          name: string
          operating_system: string | null
          pixel_size: number | null
          rotator: string | null
          sensor_height_px: number | null
          sensor_width_px: number | null
          telescope: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          acquisition_software?: string | null
          corrector?: string | null
          created_at?: string
          diameter?: number | null
          filters?: string[]
          focal_length?: number | null
          guide_camera?: string | null
          id?: string
          imager_name?: string | null
          mount?: string | null
          name: string
          operating_system?: string | null
          pixel_size?: number | null
          rotator?: string | null
          sensor_height_px?: number | null
          sensor_width_px?: number | null
          telescope?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          acquisition_software?: string | null
          corrector?: string | null
          created_at?: string
          diameter?: number | null
          filters?: string[]
          focal_length?: number | null
          guide_camera?: string | null
          id?: string
          imager_name?: string | null
          mount?: string | null
          name?: string
          operating_system?: string | null
          pixel_size?: number | null
          rotator?: string | null
          sensor_height_px?: number | null
          sensor_width_px?: number | null
          telescope?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      observing_sites: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          elevation: number | null
          id: string
          latitude: number
          longitude: number
          name: string
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          elevation?: number | null
          id?: string
          latitude: number
          longitude: number
          name: string
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          elevation?: number | null
          id?: string
          latitude?: number
          longitude?: number
          name?: string
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          updated_at: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          id: string
          updated_at?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      project_acquisitions: {
        Row: {
          acquired: number
          bin: number
          contribution_id: string | null
          created_at: string
          exposure_duration: number
          filter: string
          id: string
          kept: number
          pane_id: string | null
          project_id: string
          quantity: number
          target_seconds: number | null
        }
        Insert: {
          acquired?: number
          bin?: number
          contribution_id?: string | null
          created_at?: string
          exposure_duration?: number
          filter?: string
          id?: string
          kept?: number
          pane_id?: string | null
          project_id: string
          quantity?: number
          target_seconds?: number | null
        }
        Update: {
          acquired?: number
          bin?: number
          contribution_id?: string | null
          created_at?: string
          exposure_duration?: number
          filter?: string
          id?: string
          kept?: number
          pane_id?: string | null
          project_id?: string
          quantity?: number
          target_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_acquisitions_contribution_id_fkey"
            columns: ["contribution_id"]
            isOneToOne: false
            referencedRelation: "project_contributions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_acquisitions_pane_id_fkey"
            columns: ["pane_id"]
            isOneToOne: false
            referencedRelation: "project_panes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_acquisitions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_contributions: {
        Row: {
          created_at: string
          equipment_profile_id: string | null
          filename_pattern: string | null
          focal_length: number | null
          folder_path: string | null
          id: string
          observing_site_id: string | null
          project_id: string
          sensor_height_mm: number | null
          sensor_width_mm: number | null
          setup: string | null
          tracking_mode: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          equipment_profile_id?: string | null
          filename_pattern?: string | null
          focal_length?: number | null
          folder_path?: string | null
          id?: string
          observing_site_id?: string | null
          project_id: string
          sensor_height_mm?: number | null
          sensor_width_mm?: number | null
          setup?: string | null
          tracking_mode?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          equipment_profile_id?: string | null
          filename_pattern?: string | null
          focal_length?: number | null
          folder_path?: string | null
          id?: string
          observing_site_id?: string | null
          project_id?: string
          sensor_height_mm?: number | null
          sensor_width_mm?: number | null
          setup?: string | null
          tracking_mode?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_contributions_equipment_profile_id_fkey"
            columns: ["equipment_profile_id"]
            isOneToOne: false
            referencedRelation: "equipment_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_contributions_observing_site_id_fkey"
            columns: ["observing_site_id"]
            isOneToOne: false
            referencedRelation: "observing_sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_contributions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_frames: {
        Row: {
          acquisition_id: string | null
          captured_at: string | null
          contribution_id: string | null
          created_at: string
          eccentricity: number | null
          exposure_duration: number | null
          file_name: string
          filter: string | null
          frame_nr: number | null
          fwhm: number | null
          hfr: number | null
          id: string
          pane_number: number | null
          project_id: string
          relative_path: string
          sensor_temp: number | null
          session_id: string | null
          star_count: number | null
        }
        Insert: {
          acquisition_id?: string | null
          captured_at?: string | null
          contribution_id?: string | null
          created_at?: string
          eccentricity?: number | null
          exposure_duration?: number | null
          file_name: string
          filter?: string | null
          frame_nr?: number | null
          fwhm?: number | null
          hfr?: number | null
          id?: string
          pane_number?: number | null
          project_id: string
          relative_path: string
          sensor_temp?: number | null
          session_id?: string | null
          star_count?: number | null
        }
        Update: {
          acquisition_id?: string | null
          captured_at?: string | null
          contribution_id?: string | null
          created_at?: string
          eccentricity?: number | null
          exposure_duration?: number | null
          file_name?: string
          filter?: string | null
          frame_nr?: number | null
          fwhm?: number | null
          hfr?: number | null
          id?: string
          pane_number?: number | null
          project_id?: string
          relative_path?: string
          sensor_temp?: number | null
          session_id?: string | null
          star_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_frames_acquisition_id_fkey"
            columns: ["acquisition_id"]
            isOneToOne: false
            referencedRelation: "project_acquisitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_frames_contribution_id_fkey"
            columns: ["contribution_id"]
            isOneToOne: false
            referencedRelation: "project_contributions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_frames_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_frames_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "project_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      project_panes: {
        Row: {
          col_index: number | null
          contribution_id: string | null
          created_at: string
          dec: string
          id: string
          overlap: number | null
          pane_height: number | null
          pane_number: number
          pane_width: number | null
          position_angle: number | null
          project_id: string
          ra: string
          row_index: number | null
        }
        Insert: {
          col_index?: number | null
          contribution_id?: string | null
          created_at?: string
          dec: string
          id?: string
          overlap?: number | null
          pane_height?: number | null
          pane_number: number
          pane_width?: number | null
          position_angle?: number | null
          project_id: string
          ra: string
          row_index?: number | null
        }
        Update: {
          col_index?: number | null
          contribution_id?: string | null
          created_at?: string
          dec?: string
          id?: string
          overlap?: number | null
          pane_height?: number | null
          pane_number?: number
          pane_width?: number | null
          position_angle?: number | null
          project_id?: string
          ra?: string
          row_index?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_panes_contribution_id_fkey"
            columns: ["contribution_id"]
            isOneToOne: false
            referencedRelation: "project_contributions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_panes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_sessions: {
        Row: {
          contribution_id: string | null
          created_at: string
          created_by: string
          ended_at: string | null
          id: string
          note: string | null
          project_id: string
          source: string
          started_at: string | null
          updated_at: string
        }
        Insert: {
          contribution_id?: string | null
          created_at?: string
          created_by?: string
          ended_at?: string | null
          id?: string
          note?: string | null
          project_id: string
          source?: string
          started_at?: string | null
          updated_at?: string
        }
        Update: {
          contribution_id?: string | null
          created_at?: string
          created_by?: string
          ended_at?: string | null
          id?: string
          note?: string | null
          project_id?: string
          source?: string
          started_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_sessions_contribution_id_fkey"
            columns: ["contribution_id"]
            isOneToOne: false
            referencedRelation: "project_contributions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_sessions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          created_by: string
          dec: string | null
          description: string | null
          filename_pattern: string | null
          folder_path: string | null
          id: string
          image_url: string | null
          is_mosaic: boolean
          name: string
          observing_site_id: string | null
          position_angle: number | null
          ra: string | null
          schema_version: number
          setup: string | null
          status: string
          target_object: string | null
          team_id: string | null
          tracking_mode: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          dec?: string | null
          description?: string | null
          filename_pattern?: string | null
          folder_path?: string | null
          id?: string
          image_url?: string | null
          is_mosaic?: boolean
          name: string
          observing_site_id?: string | null
          position_angle?: number | null
          ra?: string | null
          schema_version?: number
          setup?: string | null
          status?: string
          target_object?: string | null
          team_id?: string | null
          tracking_mode?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          dec?: string | null
          description?: string | null
          filename_pattern?: string | null
          folder_path?: string | null
          id?: string
          image_url?: string | null
          is_mosaic?: boolean
          name?: string
          observing_site_id?: string | null
          position_angle?: number | null
          ra?: string | null
          schema_version?: number
          setup?: string | null
          status?: string
          target_object?: string | null
          team_id?: string | null
          tracking_mode?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_observing_site_id_fkey"
            columns: ["observing_site_id"]
            isOneToOne: false
            referencedRelation: "observing_sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      session_batches: {
        Row: {
          acquisition_id: string | null
          bin: number
          created_at: string
          exposure_duration: number
          filter: string
          id: string
          pane_id: string | null
          project_id: string
          session_id: string
          source: string
          sub_count: number
        }
        Insert: {
          acquisition_id?: string | null
          bin?: number
          created_at?: string
          exposure_duration?: number
          filter?: string
          id?: string
          pane_id?: string | null
          project_id: string
          session_id: string
          source?: string
          sub_count?: number
        }
        Update: {
          acquisition_id?: string | null
          bin?: number
          created_at?: string
          exposure_duration?: number
          filter?: string
          id?: string
          pane_id?: string | null
          project_id?: string
          session_id?: string
          source?: string
          sub_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "session_batches_acquisition_id_fkey"
            columns: ["acquisition_id"]
            isOneToOne: false
            referencedRelation: "project_acquisitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_batches_pane_id_fkey"
            columns: ["pane_id"]
            isOneToOne: false
            referencedRelation: "project_panes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_batches_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_batches_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "project_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      team_invitations: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          status: string
          team_id: string
          token: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          status?: string
          team_id: string
          token?: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          status?: string
          team_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invitations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          id: string
          joined_at: string
          role: string
          team_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          role?: string
          team_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          role?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          management_mode: string
          name: string
          owner_id: string
          website: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          management_mode?: string
          name: string
          owner_id: string
          website?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          management_mode?: string
          name?: string
          owner_id?: string
          website?: string | null
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
      can_access_project: { Args: { _project_id: string }; Returns: boolean }
      can_edit_contribution: {
        Args: { _contribution_id: string }
        Returns: boolean
      }
      can_edit_project: { Args: { _project_id: string }; Returns: boolean }
      current_user_email: { Args: never; Returns: string }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_pending_invitation: { Args: { _team_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_team_admin: { Args: { _team_id: string }; Returns: boolean }
      is_team_member: { Args: { _team_id: string }; Returns: boolean }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      shares_team_with: { Args: { _other: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "user"],
    },
  },
} as const
