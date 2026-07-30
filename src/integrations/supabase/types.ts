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
          transaction_limit: number | null
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
          transaction_limit?: number | null
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
          transaction_limit?: number | null
          updated_at?: string
          vehicle_limit?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
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
          terms_accepted_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
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
          terms_accepted_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
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
          terms_accepted_at?: string | null
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
