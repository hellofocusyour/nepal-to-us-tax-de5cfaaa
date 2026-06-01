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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          created_at: string
          created_by: string | null
          description: string
          entity_id: string | null
          entity_type: string | null
          id: string
        }
        Insert: {
          action: string
          created_at?: string
          created_by?: string | null
          description: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
        }
        Update: {
          action?: string
          created_at?: string
          created_by?: string | null
          description?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
        }
        Relationships: []
      }
      admin_permissions: {
        Row: {
          granted_at: string
          granted_by: string | null
          id: string
          section: Database["public"]["Enums"]["admin_section"]
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          section: Database["public"]["Enums"]["admin_section"]
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          section?: Database["public"]["Enums"]["admin_section"]
          user_id?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          scheduled_at: string | null
          sent_at: string | null
          target_audience: string
          title: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          scheduled_at?: string | null
          sent_at?: string | null
          target_audience?: string
          title: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          scheduled_at?: string | null
          sent_at?: string | null
          target_audience?: string
          title?: string
        }
        Relationships: []
      }
      attendance: {
        Row: {
          created_at: string
          id: string
          present: boolean
          session_id: string
          student_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          present?: boolean
          session_id: string
          student_id: string
        }
        Update: {
          created_at?: string
          id?: string
          present?: boolean
          session_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "class_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      batches: {
        Row: {
          created_at: string
          end_date: string
          enrolled_count: number
          id: string
          max_seats: number
          name: string
          start_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date: string
          enrolled_count?: number
          id?: string
          max_seats?: number
          name: string
          start_date: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string
          enrolled_count?: number
          id?: string
          max_seats?: number
          name?: string
          start_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      class_sessions: {
        Row: {
          batch_id: string
          created_at: string
          id: string
          notes: string | null
          recording_link: string | null
          session_date: string
          topic: string
        }
        Insert: {
          batch_id: string
          created_at?: string
          id?: string
          notes?: string | null
          recording_link?: string | null
          session_date: string
          topic: string
        }
        Update: {
          batch_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          recording_link?: string | null
          session_date?: string
          topic?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_sessions_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          conversation_key: string
          created_at: string
          customer_avatar: string | null
          customer_id: string
          customer_name: string | null
          id: string
          last_message_at: string
          last_message_preview: string | null
          platform: string
          unread_count: number
        }
        Insert: {
          conversation_key: string
          created_at?: string
          customer_avatar?: string | null
          customer_id: string
          customer_name?: string | null
          id?: string
          last_message_at?: string
          last_message_preview?: string | null
          platform: string
          unread_count?: number
        }
        Update: {
          conversation_key?: string
          created_at?: string
          customer_avatar?: string | null
          customer_id?: string
          customer_name?: string | null
          id?: string
          last_message_at?: string
          last_message_preview?: string | null
          platform?: string
          unread_count?: number
        }
        Relationships: []
      }
      course_documents: {
        Row: {
          description: string
          file_name: string
          file_size: number
          file_url: string
          id: string
          tab: string
          title: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          description: string
          file_name: string
          file_size: number
          file_url: string
          id?: string
          tab: string
          title: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          description?: string
          file_name?: string
          file_size?: number
          file_url?: string
          id?: string
          tab?: string
          title?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      course_modules: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string | null
          id: string
          is_unlocked: boolean
          module_number: number
          slide_count: number
          title: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_unlocked?: boolean
          module_number: number
          slide_count?: number
          title: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_unlocked?: boolean
          module_number?: number
          slide_count?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          body: string
          clicks_count: number
          created_at: string
          cta_label: string | null
          cta_url: string | null
          error_message: string | null
          first_opened_at: string | null
          id: string
          inquiry_id: string | null
          last_clicked_at: string | null
          last_opened_at: string | null
          opens_count: number
          recipient_email: string
          recipient_name: string | null
          sent_by: string | null
          status: string
          subject: string
        }
        Insert: {
          body: string
          clicks_count?: number
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          error_message?: string | null
          first_opened_at?: string | null
          id?: string
          inquiry_id?: string | null
          last_clicked_at?: string | null
          last_opened_at?: string | null
          opens_count?: number
          recipient_email: string
          recipient_name?: string | null
          sent_by?: string | null
          status?: string
          subject: string
        }
        Update: {
          body?: string
          clicks_count?: number
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          error_message?: string | null
          first_opened_at?: string | null
          id?: string
          inquiry_id?: string | null
          last_clicked_at?: string | null
          last_opened_at?: string | null
          opens_count?: number
          recipient_email?: string
          recipient_name?: string | null
          sent_by?: string | null
          status?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "inquiries"
            referencedColumns: ["id"]
          },
        ]
      }
      inquiries: {
        Row: {
          background: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          message: string | null
          phone: string | null
          source: string
          status: Database["public"]["Enums"]["inquiry_status"]
          student_id: string | null
          updated_at: string
        }
        Insert: {
          background?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          message?: string | null
          phone?: string | null
          source?: string
          status?: Database["public"]["Enums"]["inquiry_status"]
          student_id?: string | null
          updated_at?: string
        }
        Update: {
          background?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          message?: string | null
          phone?: string | null
          source?: string
          status?: Database["public"]["Enums"]["inquiry_status"]
          student_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inquiries_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      live_class_settings: {
        Row: {
          class_description: string | null
          class_title: string
          created_at: string
          duration_minutes: number
          enabled: boolean
          id: string
          last_reminder_sent_for: string | null
          meet_link: string
          next_class_at: string | null
          reminder_minutes: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          class_description?: string | null
          class_title?: string
          created_at?: string
          duration_minutes?: number
          enabled?: boolean
          id?: string
          last_reminder_sent_for?: string | null
          meet_link?: string
          next_class_at?: string | null
          reminder_minutes?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          class_description?: string | null
          class_title?: string
          created_at?: string
          duration_minutes?: number
          enabled?: boolean
          id?: string
          last_reminder_sent_for?: string | null
          meet_link?: string
          next_class_at?: string | null
          reminder_minutes?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          attachments: Json | null
          conversation_key: string
          created_at: string
          direction: string
          external_message_id: string | null
          id: string
          is_read: boolean
          message_type: string
          platform: string
          raw_payload: Json | null
          sender_id: string | null
          sender_name: string | null
          text: string | null
        }
        Insert: {
          attachments?: Json | null
          conversation_key: string
          created_at?: string
          direction: string
          external_message_id?: string | null
          id?: string
          is_read?: boolean
          message_type?: string
          platform: string
          raw_payload?: Json | null
          sender_id?: string | null
          sender_name?: string | null
          text?: string | null
        }
        Update: {
          attachments?: Json | null
          conversation_key?: string
          created_at?: string
          direction?: string
          external_message_id?: string | null
          id?: string
          is_read?: boolean
          message_type?: string
          platform?: string
          raw_payload?: Json | null
          sender_id?: string | null
          sender_name?: string | null
          text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_key_fkey"
            columns: ["conversation_key"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["conversation_key"]
          },
        ]
      }
      payments: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string
          id: string
          installment_number: number
          payment_date: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          proof_url: string | null
          receipt_url: string | null
          rejection_reason: string | null
          status: Database["public"]["Enums"]["payment_status"]
          student_id: string
          transaction_reference: string | null
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string
          id?: string
          installment_number?: number
          payment_date?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          proof_url?: string | null
          receipt_url?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          student_id: string
          transaction_reference?: string | null
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string
          id?: string
          installment_number?: number
          payment_date?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          proof_url?: string | null
          receipt_url?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          student_id?: string
          transaction_reference?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_credentials: {
        Row: {
          app_secret: string | null
          id: string
          page_access_token: string | null
          updated_at: string
          updated_by: string | null
          verify_token: string | null
          whatsapp_phone_id: string | null
          whatsapp_token: string | null
        }
        Insert: {
          app_secret?: string | null
          id?: string
          page_access_token?: string | null
          updated_at?: string
          updated_by?: string | null
          verify_token?: string | null
          whatsapp_phone_id?: string | null
          whatsapp_token?: string | null
        }
        Update: {
          app_secret?: string | null
          id?: string
          page_access_token?: string | null
          updated_at?: string
          updated_by?: string | null
          verify_token?: string | null
          whatsapp_phone_id?: string | null
          whatsapp_token?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          background: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          background?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          background?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sms_logs: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          inquiry_id: string | null
          message: string
          provider_response: Json | null
          recipient_name: string | null
          recipient_phone: string
          sent_by: string | null
          status: string
          student_id: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          inquiry_id?: string | null
          message: string
          provider_response?: Json | null
          recipient_name?: string | null
          recipient_phone: string
          sent_by?: string | null
          status?: string
          student_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          inquiry_id?: string | null
          message?: string
          provider_response?: Json | null
          recipient_name?: string | null
          recipient_phone?: string
          sent_by?: string | null
          status?: string
          student_id?: string | null
        }
        Relationships: []
      }
      students: {
        Row: {
          background: string | null
          batch_id: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          notes: string | null
          payment_plan: string
          phone: string | null
          profile_id: string | null
          status: Database["public"]["Enums"]["student_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          background?: string | null
          batch_id?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          notes?: string | null
          payment_plan?: string
          phone?: string | null
          profile_id?: string | null
          status?: Database["public"]["Enums"]["student_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          background?: string | null
          batch_id?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          notes?: string | null
          payment_plan?: string
          phone?: string | null
          profile_id?: string | null
          status?: Database["public"]["Enums"]["student_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      video_access_logs: {
        Row: {
          id: string
          opened_at: string
          user_agent: string | null
          user_id: string
          video_id: string
        }
        Insert: {
          id?: string
          opened_at?: string
          user_agent?: string | null
          user_id: string
          video_id: string
        }
        Update: {
          id?: string
          opened_at?: string
          user_agent?: string | null
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_access_logs_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "video_materials"
            referencedColumns: ["id"]
          },
        ]
      }
      video_materials: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number
          drive_file_id: string
          duration_minutes: number | null
          id: string
          is_published: boolean
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          drive_file_id: string
          duration_minutes?: number | null
          id?: string
          is_published?: boolean
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          drive_file_id?: string
          duration_minutes?: number | null
          id?: string
          is_published?: boolean
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      video_terms_acknowledgments: {
        Row: {
          acknowledged_at: string
          id: string
          terms_version: string
          user_id: string
        }
        Insert: {
          acknowledged_at?: string
          id?: string
          terms_version?: string
          user_id: string
        }
        Update: {
          acknowledged_at?: string
          id?: string
          terms_version?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_admin_section: {
        Args: {
          _section: Database["public"]["Enums"]["admin_section"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_paid_student: { Args: { _user_id: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      admin_section:
        | "dashboard"
        | "inbox"
        | "students"
        | "inquiries"
        | "payments"
        | "batches"
        | "live_class"
        | "modules"
        | "video_materials"
        | "my_courses"
        | "announcements"
        | "reports"
        | "integrations"
        | "team"
      app_role: "admin" | "student"
      inquiry_status: "new" | "contacted" | "converted" | "dropped"
      payment_method: "bank_transfer" | "fonepay" | "ips"
      payment_status:
        | "pending_verification"
        | "verified"
        | "rejected"
        | "overdue"
      student_status:
        | "inquired"
        | "contacted"
        | "enrolled"
        | "payment_received"
        | "installment_2_due"
        | "fully_paid"
        | "active_student"
        | "completed"
        | "certified"
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
      admin_section: [
        "dashboard",
        "inbox",
        "students",
        "inquiries",
        "payments",
        "batches",
        "live_class",
        "modules",
        "video_materials",
        "my_courses",
        "announcements",
        "reports",
        "integrations",
        "team",
      ],
      app_role: ["admin", "student"],
      inquiry_status: ["new", "contacted", "converted", "dropped"],
      payment_method: ["bank_transfer", "fonepay", "ips"],
      payment_status: [
        "pending_verification",
        "verified",
        "rejected",
        "overdue",
      ],
      student_status: [
        "inquired",
        "contacted",
        "enrolled",
        "payment_received",
        "installment_2_due",
        "fully_paid",
        "active_student",
        "completed",
        "certified",
      ],
    },
  },
} as const
