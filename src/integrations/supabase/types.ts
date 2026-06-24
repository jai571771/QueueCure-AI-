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
      clinic_members: {
        Row: {
          clinic_id: string
          created_at: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_members_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinics: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      consultation_events: {
        Row: {
          clinic_id: string
          completed_at: string
          created_at: string
          doctor_id: string
          duration_seconds: number | null
          id: string
          patient_id: string | null
          started_at: string
          visit_type: Database["public"]["Enums"]["visit_type"]
        }
        Insert: {
          clinic_id: string
          completed_at: string
          created_at?: string
          doctor_id: string
          duration_seconds?: number | null
          id?: string
          patient_id?: string | null
          started_at: string
          visit_type: Database["public"]["Enums"]["visit_type"]
        }
        Update: {
          clinic_id?: string
          completed_at?: string
          created_at?: string
          doctor_id?: string
          duration_seconds?: number | null
          id?: string
          patient_id?: string | null
          started_at?: string
          visit_type?: Database["public"]["Enums"]["visit_type"]
        }
        Relationships: [
          {
            foreignKeyName: "consultation_events_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultation_events_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "queue_patients"
            referencedColumns: ["id"]
          },
        ]
      }
      duration_stats: {
        Row: {
          clinic_id: string
          ewma_seconds: number
          sample_count: number
          updated_at: string
          variance: number
          visit_type: Database["public"]["Enums"]["visit_type"]
        }
        Insert: {
          clinic_id: string
          ewma_seconds?: number
          sample_count?: number
          updated_at?: string
          variance?: number
          visit_type: Database["public"]["Enums"]["visit_type"]
        }
        Update: {
          clinic_id?: string
          ewma_seconds?: number
          sample_count?: number
          updated_at?: string
          variance?: number
          visit_type?: Database["public"]["Enums"]["visit_type"]
        }
        Relationships: [
          {
            foreignKeyName: "duration_stats_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          default_clinic_id: string | null
          display_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          default_clinic_id?: string | null
          display_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          default_clinic_id?: string | null
          display_name?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_default_clinic_id_fkey"
            columns: ["default_clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      queue_audit_log: {
        Row: {
          actor_id: string | null
          clinic_id: string
          created_at: string
          eta_after_minutes: number | null
          eta_before_minutes: number | null
          event: Database["public"]["Enums"]["audit_event_type"]
          from_status: Database["public"]["Enums"]["queue_status"] | null
          id: string
          metadata: Json | null
          patient_id: string | null
          reason: Database["public"]["Enums"]["eta_change_reason"] | null
          to_status: Database["public"]["Enums"]["queue_status"] | null
        }
        Insert: {
          actor_id?: string | null
          clinic_id: string
          created_at?: string
          eta_after_minutes?: number | null
          eta_before_minutes?: number | null
          event: Database["public"]["Enums"]["audit_event_type"]
          from_status?: Database["public"]["Enums"]["queue_status"] | null
          id?: string
          metadata?: Json | null
          patient_id?: string | null
          reason?: Database["public"]["Enums"]["eta_change_reason"] | null
          to_status?: Database["public"]["Enums"]["queue_status"] | null
        }
        Update: {
          actor_id?: string | null
          clinic_id?: string
          created_at?: string
          eta_after_minutes?: number | null
          eta_before_minutes?: number | null
          event?: Database["public"]["Enums"]["audit_event_type"]
          from_status?: Database["public"]["Enums"]["queue_status"] | null
          id?: string
          metadata?: Json | null
          patient_id?: string | null
          reason?: Database["public"]["Enums"]["eta_change_reason"] | null
          to_status?: Database["public"]["Enums"]["queue_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "queue_audit_log_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      queue_patients: {
        Row: {
          age: number | null
          called_at: string | null
          called_by: string | null
          clinic_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          current_eta_minutes: number | null
          doctor_id: string | null
          id: string
          notes: string | null
          patient_name: string
          phone: string | null
          predicted_duration_minutes: number
          priority: Database["public"]["Enums"]["priority_level"]
          started_at: string | null
          status: Database["public"]["Enums"]["queue_status"]
          token_number: number
          visit_type: Database["public"]["Enums"]["visit_type"]
        }
        Insert: {
          age?: number | null
          called_at?: string | null
          called_by?: string | null
          clinic_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          current_eta_minutes?: number | null
          doctor_id?: string | null
          id?: string
          notes?: string | null
          patient_name: string
          phone?: string | null
          predicted_duration_minutes?: number
          priority?: Database["public"]["Enums"]["priority_level"]
          started_at?: string | null
          status?: Database["public"]["Enums"]["queue_status"]
          token_number: number
          visit_type?: Database["public"]["Enums"]["visit_type"]
        }
        Update: {
          age?: number | null
          called_at?: string | null
          called_by?: string | null
          clinic_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          current_eta_minutes?: number | null
          doctor_id?: string | null
          id?: string
          notes?: string | null
          patient_name?: string
          phone?: string | null
          predicted_duration_minutes?: number
          priority?: Database["public"]["Enums"]["priority_level"]
          started_at?: string | null
          status?: Database["public"]["Enums"]["queue_status"]
          token_number?: number
          visit_type?: Database["public"]["Enums"]["visit_type"]
        }
        Relationships: [
          {
            foreignKeyName: "queue_patients_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      token_counters: {
        Row: {
          clinic_id: string
          counter_date: string
          last_token: number
        }
        Insert: {
          clinic_id: string
          counter_date: string
          last_token?: number
        }
        Update: {
          clinic_id?: string
          counter_date?: string
          last_token?: number
        }
        Relationships: [
          {
            foreignKeyName: "token_counters_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
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
      baseline_seconds: {
        Args: { _vt: Database["public"]["Enums"]["visit_type"] }
        Returns: number
      }
      compute_arrival_intel: {
        Args: { _clinic_id: string; _patient_id: string }
        Returns: Json
      }
      compute_bottlenecks: { Args: { _clinic_id: string }; Returns: Json }
      compute_demo_health: { Args: { _clinic_id: string }; Returns: Json }
      compute_doctor_productivity: {
        Args: { _clinic_id: string; _days?: number; _doctor_id: string }
        Returns: Json
      }
      compute_efficiency_score: { Args: { _clinic_id: string }; Returns: Json }
      compute_forecast: {
        Args: { _clinic_id: string; _horizon?: string }
        Returns: Json
      }
      compute_prediction_accuracy: {
        Args: { _clinic_id: string; _days?: number }
        Returns: Json
      }
      compute_queue_health: { Args: { _clinic_id: string }; Returns: Json }
      compute_queue_risk: { Args: { _clinic_id: string }; Returns: Json }
      compute_recommendations: { Args: { _clinic_id: string }; Returns: Json }
      generate_token: { Args: { _clinic_id: string }; Returns: number }
      get_public_eta_history: {
        Args: { _clinic_slug: string; _token: number }
        Returns: Json
      }
      get_public_tracking: {
        Args: { _clinic_slug: string; _token: number }
        Returns: Json
      }
      has_clinic_access: {
        Args: { _clinic_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      predicted_seconds: {
        Args: {
          _clinic_id: string
          _vt: Database["public"]["Enums"]["visit_type"]
        }
        Returns: number
      }
      recompute_clinic_etas: {
        Args: {
          _clinic_id: string
          _reason: Database["public"]["Enums"]["eta_change_reason"]
        }
        Returns: undefined
      }
      reset_demo_data: { Args: { _clinic_id: string }; Returns: Json }
      seed_scenario: {
        Args: { _clinic_id: string; _scenario: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "receptionist" | "doctor"
      audit_event_type:
        | "patient_added"
        | "token_called"
        | "consultation_started"
        | "consultation_completed"
        | "patient_skipped"
        | "patient_removed"
        | "emergency_inserted"
        | "eta_recomputed"
      eta_change_reason:
        | "emergency"
        | "faster_consultations"
        | "slower_consultations"
        | "normal_progress"
      priority_level: "normal" | "urgent" | "emergency"
      queue_status:
        | "waiting"
        | "called"
        | "in_progress"
        | "completed"
        | "skipped"
        | "removed"
      visit_type:
        | "general"
        | "follow_up"
        | "prescription"
        | "lab_review"
        | "vaccination"
        | "emergency"
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
      app_role: ["receptionist", "doctor"],
      audit_event_type: [
        "patient_added",
        "token_called",
        "consultation_started",
        "consultation_completed",
        "patient_skipped",
        "patient_removed",
        "emergency_inserted",
        "eta_recomputed",
      ],
      eta_change_reason: [
        "emergency",
        "faster_consultations",
        "slower_consultations",
        "normal_progress",
      ],
      priority_level: ["normal", "urgent", "emergency"],
      queue_status: [
        "waiting",
        "called",
        "in_progress",
        "completed",
        "skipped",
        "removed",
      ],
      visit_type: [
        "general",
        "follow_up",
        "prescription",
        "lab_review",
        "vaccination",
        "emergency",
      ],
    },
  },
} as const
