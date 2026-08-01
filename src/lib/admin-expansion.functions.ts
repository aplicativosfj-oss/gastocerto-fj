import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { formatCurrency } from "@/lib/format";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Acesso restrito a administradores");
}

async function assertRole(context: { supabase: any; userId: string }, role: string) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: role,
  });
  if (error || !data) throw new Error(`Acesso restrito a usuários com papel ${role}`);
}

export const adminGetSupportTickets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("support_tickets" as any)
      .select("*, profiles(full_name, contact_email)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data as any[];
  });

export const adminUpdateTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string(), status: z.string(), adminNotes: z.string().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("support_tickets" as any)
      .update({ status: data.status, admin_notes: data.adminNotes, updated_at: new Date().toISOString() } as any)
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const adminGetPlanConfigs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Permite que suporte também visualize as configs, mas apenas admin edita
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    const { data: isSupport } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "support" });
    
    if (!isAdmin && !isSupport) throw new Error("Acesso negado");

    const { data, error } = await context.supabase.from("plan_configs" as any).select("*").order("slug");
    if (error) throw error;
    return data as any[];
  });

export const adminUpdatePlanConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string(), monthlyPrice: z.number(), annualPrice: z.number(), limits: z.record(z.any()) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("plan_configs" as any)
      .update({ 
        monthly_price: data.monthlyPrice, 
        annual_price: data.annualPrice, 
        limits: data.limits,
        updated_at: new Date().toISOString() 
      } as any)
      .eq("id", data.id);
    if (error) throw error;

    await context.supabase.from("admin_logs").insert({
      actor_id: context.userId,
      action: "plan_config_updated",
      details: {
        plan_config_id: data.id,
        monthly_price: data.monthlyPrice,
        annual_price: data.annualPrice,
        limits: data.limits,
      },
    });

    return { ok: true };
  });

export const adminGetAnnouncements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Permite que suporte também visualize os avisos
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    const { data: isSupport } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "support" });
    
    if (!isAdmin && !isSupport) throw new Error("Acesso negado");
    
    const { data, error } = await context.supabase.from("global_announcements" as any).select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return data as any[];
  });

export const adminCreateAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ title: z.string(), content: z.string(), type: z.string(), active: z.boolean(), expiresAt: z.string().optional().nullable() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("global_announcements" as any)
      .insert({ 
        title: data.title, 
        content: data.content, 
        type: data.type, 
        active: data.active, 
        expires_at: data.expiresAt,
        created_by: context.userId
      } as any);
    if (error) throw error;

    await context.supabase.from("admin_logs").insert({
      actor_id: context.userId,
      action: "announcement_created",
      details: { title: data.title, type: data.type, active: data.active },
    });

    return { ok: true };
  });

export const adminGetBusinessMetrics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase.from("business_metrics_daily" as any).select("*").order("date", { ascending: false }).limit(30);
    if (error) throw error;
    return data as any[];
  });

export const createSupportTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ subject: z.string(), message: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("support_tickets" as any)
      .insert({ 
        user_id: context.userId,
        subject: data.subject, 
        message: data.message 
      } as any);
    if (error) throw error;
    return { ok: true };
  });
