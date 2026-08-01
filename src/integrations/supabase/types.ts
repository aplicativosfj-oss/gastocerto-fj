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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          account_type: string
          active: boolean
          color: string | null
          created_at: string
          current_balance: number
          icon: string | null
          id: string
          initial_balance: number
          institution: string | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_type?: string
          active?: boolean
          color?: string | null
          created_at?: string
          current_balance?: number
          icon?: string | null
          id?: string
          initial_balance?: number
          institution?: string | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_type?: string
          active?: boolean
          color?: string | null
          created_at?: string
          current_balance?: number
          icon?: string | null
          id?: string
          initial_balance?: number
          institution?: string | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_logs: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          details: Json
          id: string
          target_user_id: string | null
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          details?: Json
          id?: string
          target_user_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          details?: Json
          id?: string
          target_user_id?: string | null
        }
        Relationships: []
      }
      ai_usage_log: {
        Row: {
          action: string
          allowed: boolean
          created_at: string
          credits: number
          feature: string
          id: string
          input_tokens: number
          model: string | null
          output_tokens: number
          plan_slug: string | null
          question: string | null
          reason: string | null
          total_tokens: number
          user_id: string
        }
        Insert: {
          action: string
          allowed?: boolean
          created_at?: string
          credits?: number
          feature?: string
          id?: string
          input_tokens?: number
          model?: string | null
          output_tokens?: number
          plan_slug?: string | null
          question?: string | null
          reason?: string | null
          total_tokens?: number
          user_id: string
        }
        Update: {
          action?: string
          allowed?: boolean
          created_at?: string
          credits?: number
          feature?: string
          id?: string
          input_tokens?: number
          model?: string | null
          output_tokens?: number
          plan_slug?: string | null
          question?: string | null
          reason?: string | null
          total_tokens?: number
          user_id?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      blocked_ips: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          ip: string
          reason: string | null
          target_user_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          ip: string
          reason?: string | null
          target_user_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          ip?: string
          reason?: string | null
          target_user_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      budgets: {
        Row: {
          alert_percentage: number
          category_id: string | null
          created_at: string
          id: string
          limit_amount: number
          month: number
          period_type: string
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          alert_percentage?: number
          category_id?: string | null
          created_at?: string
          id?: string
          limit_amount?: number
          month: number
          period_type?: string
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
          alert_percentage?: number
          category_id?: string | null
          created_at?: string
          id?: string
          limit_amount?: number
          month?: number
          period_type?: string
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          active: boolean
          color: string | null
          created_at: string
          description: string | null
          display_order: number | null
          icon: string | null
          id: string
          is_default: boolean
          name: string
          parent_id: string | null
          type: Database["public"]["Enums"]["category_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          color?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_default?: boolean
          name: string
          parent_id?: string | null
          type?: Database["public"]["Enums"]["category_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          color?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_default?: boolean
          name?: string
          parent_id?: string | null
          type?: Database["public"]["Enums"]["category_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      category_suggestion_feedback: {
        Row: {
          accepted: boolean
          corrected_category_id: string | null
          created_at: string
          description: string
          id: string
          suggested_category_id: string | null
          user_id: string
        }
        Insert: {
          accepted: boolean
          corrected_category_id?: string | null
          created_at?: string
          description: string
          id?: string
          suggested_category_id?: string | null
          user_id: string
        }
        Update: {
          accepted?: boolean
          corrected_category_id?: string | null
          created_at?: string
          description?: string
          id?: string
          suggested_category_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_suggestion_feedback_corrected_category_id_fkey"
            columns: ["corrected_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_suggestion_feedback_suggested_category_id_fkey"
            columns: ["suggested_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      category_suggestions: {
        Row: {
          category_id: string
          description_pattern: string
          id: string
          last_used_at: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          usage_count: number | null
          user_id: string
        }
        Insert: {
          category_id: string
          description_pattern: string
          id?: string
          last_used_at?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          usage_count?: number | null
          user_id: string
        }
        Update: {
          category_id?: string
          description_pattern?: string
          id?: string
          last_used_at?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
          usage_count?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_suggestions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      closed_period_audit: {
        Row: {
          action: string
          actor_id: string | null
          changes: Json
          created_at: string
          entity: string
          id: string
          month: number
          record_id: string | null
          user_id: string
          year: number
        }
        Insert: {
          action: string
          actor_id?: string | null
          changes?: Json
          created_at?: string
          entity: string
          id?: string
          month: number
          record_id?: string | null
          user_id: string
          year: number
        }
        Update: {
          action?: string
          actor_id?: string | null
          changes?: Json
          created_at?: string
          entity?: string
          id?: string
          month?: number
          record_id?: string | null
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      closing_reopen_requests: {
        Row: {
          admin_note: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: string
          month: number
          reason: string
          reopen_until: string | null
          status: string
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          month: number
          reason: string
          reopen_until?: string | null
          status?: string
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          month?: number
          reason?: string
          reopen_until?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      commitment_entries: {
        Row: {
          amount: number
          commitment_id: string
          created_at: string
          description: string | null
          due_date: string | null
          entry_date: string
          entry_type: string
          id: string
          installment_number: number | null
          notes: string | null
          payment_method: string | null
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          commitment_id: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          entry_date?: string
          entry_type?: string
          id?: string
          installment_number?: number | null
          notes?: string | null
          payment_method?: string | null
          transaction_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          commitment_id?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          entry_date?: string
          entry_type?: string
          id?: string
          installment_number?: number | null
          notes?: string | null
          payment_method?: string | null
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commitment_entries_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "commitments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commitment_entries_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      commitments: {
        Row: {
          account_id: string | null
          category_id: string | null
          color: string | null
          commitment_type: string
          contact: string | null
          created_at: string
          creditor: string | null
          due_day: number | null
          end_date: string | null
          id: string
          installment_amount: number | null
          installments_paid: number
          installments_total: number | null
          interest_rate: number | null
          is_open_account: boolean
          name: string
          next_due_date: string | null
          notes: string | null
          payment_method: string | null
          start_date: string
          status: string
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          category_id?: string | null
          color?: string | null
          commitment_type?: string
          contact?: string | null
          created_at?: string
          creditor?: string | null
          due_day?: number | null
          end_date?: string | null
          id?: string
          installment_amount?: number | null
          installments_paid?: number
          installments_total?: number | null
          interest_rate?: number | null
          is_open_account?: boolean
          name: string
          next_due_date?: string | null
          notes?: string | null
          payment_method?: string | null
          start_date?: string
          status?: string
          total_amount?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          category_id?: string | null
          color?: string | null
          commitment_type?: string
          contact?: string | null
          created_at?: string
          creditor?: string | null
          due_day?: number | null
          end_date?: string | null
          id?: string
          installment_amount?: number | null
          installments_paid?: number
          installments_total?: number | null
          interest_rate?: number | null
          is_open_account?: boolean
          name?: string
          next_due_date?: string | null
          notes?: string | null
          payment_method?: string | null
          start_date?: string
          status?: string
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commitments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commitments_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      dependents: {
        Row: {
          active: boolean
          birth_date: string | null
          color: string | null
          created_at: string
          id: string
          monthly_allowance: number | null
          name: string
          nickname: string | null
          notes: string | null
          relation: string
          school: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          birth_date?: string | null
          color?: string | null
          created_at?: string
          id?: string
          monthly_allowance?: number | null
          name: string
          nickname?: string | null
          notes?: string | null
          relation?: string
          school?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          birth_date?: string | null
          color?: string | null
          created_at?: string
          id?: string
          monthly_allowance?: number | null
          name?: string
          nickname?: string | null
          notes?: string | null
          relation?: string
          school?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      fuel_audit_log: {
        Row: {
          action: string
          actor_name: string | null
          changes: Json
          created_at: string
          fuel_entry_id: string | null
          id: string
          notes: string | null
          odometer_after: number | null
          odometer_before: number | null
          user_id: string
          vehicle_id: string | null
          warnings: string[]
        }
        Insert: {
          action: string
          actor_name?: string | null
          changes?: Json
          created_at?: string
          fuel_entry_id?: string | null
          id?: string
          notes?: string | null
          odometer_after?: number | null
          odometer_before?: number | null
          user_id: string
          vehicle_id?: string | null
          warnings?: string[]
        }
        Update: {
          action?: string
          actor_name?: string | null
          changes?: Json
          created_at?: string
          fuel_entry_id?: string | null
          id?: string
          notes?: string | null
          odometer_after?: number | null
          odometer_before?: number | null
          user_id?: string
          vehicle_id?: string | null
          warnings?: string[]
        }
        Relationships: []
      }
      fuel_entries: {
        Row: {
          attachment_url: string | null
          consumption: number | null
          cost_per_km: number | null
          created_at: string
          distance: number | null
          entry_date: string
          fuel_type: string
          full_tank: boolean
          id: string
          liters: number
          notes: string | null
          odometer: number
          price_per_liter: number
          station: string | null
          total_amount: number
          transaction_id: string | null
          updated_at: string
          user_id: string
          vehicle_id: string
        }
        Insert: {
          attachment_url?: string | null
          consumption?: number | null
          cost_per_km?: number | null
          created_at?: string
          distance?: number | null
          entry_date?: string
          fuel_type?: string
          full_tank?: boolean
          id?: string
          liters: number
          notes?: string | null
          odometer: number
          price_per_liter: number
          station?: string | null
          total_amount: number
          transaction_id?: string | null
          updated_at?: string
          user_id: string
          vehicle_id: string
        }
        Update: {
          attachment_url?: string | null
          consumption?: number | null
          cost_per_km?: number | null
          created_at?: string
          distance?: number | null
          entry_date?: string
          fuel_type?: string
          full_tank?: boolean
          id?: string
          liters?: number
          notes?: string | null
          odometer?: number
          price_per_liter?: number
          station?: string | null
          total_amount?: number
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fuel_entries_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_entries_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      gas_refills: {
        Row: {
          amount: number
          created_at: string
          id: string
          notes: string | null
          payment_method: string | null
          refill_date: string
          size_kg: number
          supplier: string | null
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          refill_date: string
          size_kg?: number
          supplier?: string | null
          transaction_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          refill_date?: string
          size_kg?: number
          supplier?: string | null
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gas_refills_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_contributions: {
        Row: {
          amount: number
          contribution_date: string
          created_at: string
          goal_id: string
          id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          amount: number
          contribution_date?: string
          created_at?: string
          goal_id: string
          id?: string
          notes?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          contribution_date?: string
          created_at?: string
          goal_id?: string
          id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_contributions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          category_id: string | null
          color: string | null
          created_at: string
          current_amount: number
          goal_type: string
          icon: string | null
          id: string
          name: string
          notes: string | null
          start_date: string
          status: string
          target_amount: number
          target_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id?: string | null
          color?: string | null
          created_at?: string
          current_amount?: number
          goal_type?: string
          icon?: string | null
          id?: string
          name: string
          notes?: string | null
          start_date?: string
          status?: string
          target_amount?: number
          target_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category_id?: string | null
          color?: string | null
          created_at?: string
          current_amount?: number
          goal_type?: string
          icon?: string | null
          id?: string
          name?: string
          notes?: string | null
          start_date?: string
          status?: string
          target_amount?: number
          target_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      licenses: {
        Row: {
          activated_at: string | null
          amount: number
          billing_cycle: string
          cpf: string | null
          created_at: string
          created_by: string | null
          email: string | null
          expires_at: string | null
          full_name: string | null
          id: string
          issued_at: string
          license_key: string
          notes: string | null
          plan_id: string | null
          source: string
          status: Database["public"]["Enums"]["license_status"]
          trial_days: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          activated_at?: string | null
          amount?: number
          billing_cycle?: string
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          expires_at?: string | null
          full_name?: string | null
          id?: string
          issued_at?: string
          license_key?: string
          notes?: string | null
          plan_id?: string | null
          source?: string
          status?: Database["public"]["Enums"]["license_status"]
          trial_days?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          activated_at?: string | null
          amount?: number
          billing_cycle?: string
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          expires_at?: string | null
          full_name?: string | null
          id?: string
          issued_at?: string
          license_key?: string
          notes?: string | null
          plan_id?: string | null
          source?: string
          status?: Database["public"]["Enums"]["license_status"]
          trial_days?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "licenses_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_closings: {
        Row: {
          closed_at: string
          closing_balance: number
          created_at: string
          id: string
          locked: boolean
          month: number
          notes: string | null
          opening_balance: number
          reopen_note: string | null
          reopened_by: string | null
          reopened_until: string | null
          total_expense: number
          total_income: number
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          closed_at?: string
          closing_balance?: number
          created_at?: string
          id?: string
          locked?: boolean
          month: number
          notes?: string | null
          opening_balance?: number
          reopen_note?: string | null
          reopened_by?: string | null
          reopened_until?: string | null
          total_expense?: number
          total_income?: number
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
          closed_at?: string
          closing_balance?: number
          created_at?: string
          id?: string
          locked?: boolean
          month?: number
          notes?: string | null
          opening_balance?: number
          reopen_note?: string | null
          reopened_by?: string | null
          reopened_until?: string | null
          total_expense?: number
          total_income?: number
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          budget_alerts: boolean
          created_at: string
          days_before_due: number
          due_alerts: boolean
          fuel_alerts: boolean
          gas_alerts: boolean
          goal_alerts: boolean
          id: string
          overdue_alerts: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          budget_alerts?: boolean
          created_at?: string
          days_before_due?: number
          due_alerts?: boolean
          fuel_alerts?: boolean
          gas_alerts?: boolean
          goal_alerts?: boolean
          id?: string
          overdue_alerts?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          budget_alerts?: boolean
          created_at?: string
          days_before_due?: number
          due_alerts?: boolean
          fuel_alerts?: boolean
          gas_alerts?: boolean
          goal_alerts?: boolean
          id?: string
          overdue_alerts?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          dedupe_key: string | null
          id: string
          link: string | null
          message: string
          notification_type: string
          read_at: string | null
          reference_date: string | null
          reference_id: string | null
          severity: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dedupe_key?: string | null
          id?: string
          link?: string | null
          message: string
          notification_type: string
          read_at?: string | null
          reference_date?: string | null
          reference_id?: string | null
          severity?: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          dedupe_key?: string | null
          id?: string
          link?: string | null
          message?: string
          notification_type?: string
          read_at?: string | null
          reference_date?: string | null
          reference_id?: string | null
          severity?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      onboarding_preferences: {
        Row: {
          created_at: string
          has_vehicle: boolean
          id: string
          main_goal: string | null
          monthly_income: number | null
          payday: number | null
          spending_limit: number | null
          track_fuel: boolean
          track_gas_cylinder: boolean
          track_subscriptions: boolean
          updated_at: string
          used_categories: string[]
          user_id: string
          wants_alerts: boolean
        }
        Insert: {
          created_at?: string
          has_vehicle?: boolean
          id?: string
          main_goal?: string | null
          monthly_income?: number | null
          payday?: number | null
          spending_limit?: number | null
          track_fuel?: boolean
          track_gas_cylinder?: boolean
          track_subscriptions?: boolean
          updated_at?: string
          used_categories?: string[]
          user_id: string
          wants_alerts?: boolean
        }
        Update: {
          created_at?: string
          has_vehicle?: boolean
          id?: string
          main_goal?: string | null
          monthly_income?: number | null
          payday?: number | null
          spending_limit?: number | null
          track_fuel?: boolean
          track_gas_cylinder?: boolean
          track_subscriptions?: boolean
          updated_at?: string
          used_categories?: string[]
          user_id?: string
          wants_alerts?: boolean
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          email: string | null
          external_id: string | null
          id: string
          license_id: string | null
          method: string
          paid_at: string | null
          provider: string
          qr_code: string | null
          qr_code_base64: string | null
          raw: Json
          status: string
          ticket_url: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          email?: string | null
          external_id?: string | null
          id?: string
          license_id?: string | null
          method?: string
          paid_at?: string | null
          provider?: string
          qr_code?: string | null
          qr_code_base64?: string | null
          raw?: Json
          status?: string
          ticket_url?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          email?: string | null
          external_id?: string | null
          id?: string
          license_id?: string | null
          method?: string
          paid_at?: string | null
          provider?: string
          qr_code?: string | null
          qr_code_base64?: string | null
          raw?: Json
          status?: string
          ticket_url?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          active: boolean
          annual_price: number
          created_at: string
          description: string | null
          features: Json
          id: string
          monthly_price: number
          name: string
          slug: string
          tier: string
          transaction_limit: number | null
          trial_days: number | null
          updated_at: string
          vehicle_limit: number | null
        }
        Insert: {
          active?: boolean
          annual_price?: number
          created_at?: string
          description?: string | null
          features?: Json
          id?: string
          monthly_price?: number
          name: string
          slug: string
          tier?: string
          transaction_limit?: number | null
          trial_days?: number | null
          updated_at?: string
          vehicle_limit?: number | null
        }
        Update: {
          active?: boolean
          annual_price?: number
          created_at?: string
          description?: string | null
          features?: Json
          id?: string
          monthly_price?: number
          name?: string
          slug?: string
          tier?: string
          transaction_limit?: number | null
          trial_days?: number | null
          updated_at?: string
          vehicle_limit?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          contact_email: string | null
          cpf: string | null
          created_at: string
          full_name: string | null
          id: string
          monthly_income: number | null
          onboarding_completed: boolean
          phone: string | null
          plan_id: string | null
          preferred_currency: string
          privacy_accepted_at: string | null
          status: string
          support_notes: string | null
          terms_accepted_at: string | null
          trial_ends_at: string | null
          trial_plan_slug: string | null
          trial_started_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          contact_email?: string | null
          cpf?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          monthly_income?: number | null
          onboarding_completed?: boolean
          phone?: string | null
          plan_id?: string | null
          preferred_currency?: string
          privacy_accepted_at?: string | null
          status?: string
          support_notes?: string | null
          terms_accepted_at?: string | null
          trial_ends_at?: string | null
          trial_plan_slug?: string | null
          trial_started_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          contact_email?: string | null
          cpf?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          monthly_income?: number | null
          onboarding_completed?: boolean
          phone?: string | null
          plan_id?: string | null
          preferred_currency?: string
          privacy_accepted_at?: string | null
          status?: string
          support_notes?: string | null
          terms_accepted_at?: string | null
          trial_ends_at?: string | null
          trial_plan_slug?: string | null
          trial_started_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_audit_log: {
        Row: {
          action: string
          actor_name: string | null
          changes: Json
          created_at: string
          id: string
          notes: string | null
          source: string
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          actor_name?: string | null
          changes?: Json
          created_at?: string
          id?: string
          notes?: string | null
          source?: string
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          action?: string
          actor_name?: string | null
          changes?: Json
          created_at?: string
          id?: string
          notes?: string | null
          source?: string
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_audit_log_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_rules: {
        Row: {
          account_id: string | null
          active: boolean
          amount: number
          category_id: string | null
          created_at: string
          day_of_month: number | null
          description: string
          end_date: string | null
          frequency: string
          id: string
          is_essential: boolean
          last_generated_date: string | null
          notes: string | null
          payment_method: string | null
          start_date: string
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          active?: boolean
          amount: number
          category_id?: string | null
          created_at?: string
          day_of_month?: number | null
          description: string
          end_date?: string | null
          frequency?: string
          id?: string
          is_essential?: boolean
          last_generated_date?: string | null
          notes?: string | null
          payment_method?: string | null
          start_date?: string
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          active?: boolean
          amount?: number
          category_id?: string | null
          created_at?: string
          day_of_month?: number | null
          description?: string
          end_date?: string | null
          frequency?: string
          id?: string
          is_essential?: boolean
          last_generated_date?: string | null
          notes?: string | null
          payment_method?: string | null
          start_date?: string
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_rules_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_rules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      share_links: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          include_amounts: boolean
          include_categories: boolean
          include_charts: boolean
          include_notes: boolean
          include_totals: boolean
          include_transactions: boolean
          label: string | null
          last_viewed_at: string | null
          month: number
          password_hash: string
          password_salt: string
          revoked_at: string | null
          token: string
          updated_at: string
          user_id: string
          view_count: number
          year: number
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          include_amounts?: boolean
          include_categories?: boolean
          include_charts?: boolean
          include_notes?: boolean
          include_totals?: boolean
          include_transactions?: boolean
          label?: string | null
          last_viewed_at?: string | null
          month: number
          password_hash: string
          password_salt: string
          revoked_at?: string | null
          token: string
          updated_at?: string
          user_id: string
          view_count?: number
          year: number
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          include_amounts?: boolean
          include_categories?: boolean
          include_charts?: boolean
          include_notes?: boolean
          include_totals?: boolean
          include_transactions?: boolean
          label?: string | null
          last_viewed_at?: string | null
          month?: number
          password_hash?: string
          password_salt?: string
          revoked_at?: string | null
          token?: string
          updated_at?: string
          user_id?: string
          view_count?: number
          year?: number
        }
        Relationships: []
      }
      transaction_items: {
        Row: {
          created_at: string
          id: string
          name: string
          notes: string | null
          quantity: number
          total_amount: number
          transaction_id: string
          unit: string
          unit_price: number | null
          updated_at: string
          user_id: string
          weight: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          quantity?: number
          total_amount?: number
          transaction_id: string
          unit?: string
          unit_price?: number | null
          updated_at?: string
          user_id: string
          weight?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          quantity?: number
          total_amount?: number
          transaction_id?: string
          unit?: string
          unit_price?: number | null
          updated_at?: string
          user_id?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "transaction_items_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_note_history: {
        Row: {
          changed_at: string
          field: string
          id: string
          new_value: string | null
          old_value: string | null
          transaction_id: string
          user_id: string
        }
        Insert: {
          changed_at?: string
          field: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          transaction_id: string
          user_id: string
        }
        Update: {
          changed_at?: string
          field?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          transaction_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_note_history_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string | null
          amount: number
          attachment_url: string | null
          category_id: string | null
          created_at: string
          credit_card_id: string | null
          deleted_at: string | null
          description: string
          due_date: string | null
          expense_type: string | null
          id: string
          installment_number: number | null
          is_essential: boolean
          is_recurring: boolean
          merchant_name: string | null
          notes: string | null
          payment_date: string | null
          payment_method: string | null
          recurring_rule_id: string | null
          status: Database["public"]["Enums"]["transaction_status"]
          sub_category_id: string | null
          tags: string[]
          total_installments: number | null
          transaction_date: string
          transaction_time: string | null
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
          user_id: string
          vehicle_id: string | null
        }
        Insert: {
          account_id?: string | null
          amount: number
          attachment_url?: string | null
          category_id?: string | null
          created_at?: string
          credit_card_id?: string | null
          deleted_at?: string | null
          description: string
          due_date?: string | null
          expense_type?: string | null
          id?: string
          installment_number?: number | null
          is_essential?: boolean
          is_recurring?: boolean
          merchant_name?: string | null
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          recurring_rule_id?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          sub_category_id?: string | null
          tags?: string[]
          total_installments?: number | null
          transaction_date?: string
          transaction_time?: string | null
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id: string
          vehicle_id?: string | null
        }
        Update: {
          account_id?: string | null
          amount?: number
          attachment_url?: string | null
          category_id?: string | null
          created_at?: string
          credit_card_id?: string | null
          deleted_at?: string | null
          description?: string
          due_date?: string | null
          expense_type?: string | null
          id?: string
          installment_number?: number | null
          is_essential?: boolean
          is_recurring?: boolean
          merchant_name?: string | null
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          recurring_rule_id?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          sub_category_id?: string | null
          tags?: string[]
          total_installments?: number | null
          transaction_date?: string
          transaction_time?: string | null
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_sub_category_id_fkey"
            columns: ["sub_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
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
          role?: Database["public"]["Enums"]["app_role"]
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
      vehicles: {
        Row: {
          active: boolean
          alert_threshold: number
          alerts_enabled: boolean
          average_consumption: number | null
          brand: string | null
          color: string | null
          created_at: string
          fuel_type: string
          id: string
          initial_odometer: number
          model: string | null
          monthly_fuel_budget: number | null
          name: string
          plate: string | null
          tank_capacity: number | null
          target_consumption: number | null
          updated_at: string
          user_id: string
          vehicle_type: string
          year: number | null
        }
        Insert: {
          active?: boolean
          alert_threshold?: number
          alerts_enabled?: boolean
          average_consumption?: number | null
          brand?: string | null
          color?: string | null
          created_at?: string
          fuel_type?: string
          id?: string
          initial_odometer?: number
          model?: string | null
          monthly_fuel_budget?: number | null
          name: string
          plate?: string | null
          tank_capacity?: number | null
          target_consumption?: number | null
          updated_at?: string
          user_id: string
          vehicle_type?: string
          year?: number | null
        }
        Update: {
          active?: boolean
          alert_threshold?: number
          alerts_enabled?: boolean
          average_consumption?: number | null
          brand?: string | null
          color?: string | null
          created_at?: string
          fuel_type?: string
          id?: string
          initial_odometer?: number
          model?: string | null
          monthly_fuel_budget?: number | null
          name?: string
          plate?: string | null
          tank_capacity?: number | null
          target_consumption?: number | null
          updated_at?: string
          user_id?: string
          vehicle_type?: string
          year?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_default_categories: {
        Args: { _user_id: string }
        Returns: undefined
      }
      generate_license_key: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "user" | "admin" | "support"
      category_type: "expense" | "income"
      license_status: "pending" | "active" | "expired" | "revoked"
      transaction_status:
        | "pending"
        | "paid"
        | "received"
        | "canceled"
        | "overdue"
      transaction_type: "expense" | "income" | "transfer"
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
      app_role: ["user", "admin", "support"],
      category_type: ["expense", "income"],
      license_status: ["pending", "active", "expired", "revoked"],
      transaction_status: [
        "pending",
        "paid",
        "received",
        "canceled",
        "overdue",
      ],
      transaction_type: ["expense", "income", "transfer"],
    },
  },
} as const
