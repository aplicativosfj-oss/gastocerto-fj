import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
async function assertAdmin(context) {
    const { data, error } = await context.supabase.rpc("has_role", {
        _user_id: context.userId,
        _role: "admin",
    });
    if (error || !data)
        throw new Error("Acesso restrito a administradores");
}
async function assertRole(context, role) {
    const { data, error } = await context.supabase.rpc("has_role", {
        _user_id: context.userId,
        _role: role,
    });
    if (error || !data)
        throw new Error(`Acesso restrito a usuários com papel ${role}`);
}
export const adminGetSupportTickets = createServerFn({ method: "GET" })
    .middleware([requireSupabaseAuth])
    .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
        .from("support_tickets")
        .select("*, profiles(full_name, contact_email)")
        .order("created_at", { ascending: false });
    if (error)
        throw error;
    return data;
});
export const adminUpdateTicket = createServerFn({ method: "POST" })
    .middleware([requireSupabaseAuth])
    .inputValidator((d) => z.object({ id: z.string(), status: z.string(), adminNotes: z.string().optional() }).parse(d))
    .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
        .from("support_tickets")
        .update({ status: data.status, admin_notes: data.adminNotes, updated_at: new Date().toISOString() })
        .eq("id", data.id);
    if (error)
        throw error;
    return { ok: true };
});
export const adminGetPlanConfigs = createServerFn({ method: "GET" })
    .middleware([requireSupabaseAuth])
    .handler(async ({ context }) => {
    // Permite que suporte também visualize as configs, mas apenas admin edita
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    const { data: isSupport } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "support" });
    if (!isAdmin && !isSupport)
        throw new Error("Acesso negado");
    const { data, error } = await context.supabase.from("plan_configs").select("*").order("slug");
    if (error)
        throw error;
    return data;
});
export const adminUpdatePlanConfig = createServerFn({ method: "POST" })
    .middleware([requireSupabaseAuth])
    .inputValidator((d) => z.object({ id: z.string(), monthlyPrice: z.number(), annualPrice: z.number(), limits: z.record(z.any()) }).parse(d))
    .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
        .from("plan_configs")
        .update({
        monthly_price: data.monthlyPrice,
        annual_price: data.annualPrice,
        limits: data.limits,
        updated_at: new Date().toISOString()
    })
        .eq("id", data.id);
    if (error)
        throw error;
    return { ok: true };
});
export const adminGetAnnouncements = createServerFn({ method: "GET" })
    .middleware([requireSupabaseAuth])
    .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase.from("global_announcements").select("*").order("created_at", { ascending: false });
    if (error)
        throw error;
    return data;
});
export const adminCreateAnnouncement = createServerFn({ method: "POST" })
    .middleware([requireSupabaseAuth])
    .inputValidator((d) => z.object({ title: z.string(), content: z.string(), type: z.string(), active: z.boolean(), expiresAt: z.string().optional().nullable() }).parse(d))
    .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
        .from("global_announcements")
        .insert({
        title: data.title,
        content: data.content,
        type: data.type,
        active: data.active,
        expires_at: data.expiresAt,
        created_by: context.userId
    });
    if (error)
        throw error;
    return { ok: true };
});
export const adminGetBusinessMetrics = createServerFn({ method: "GET" })
    .middleware([requireSupabaseAuth])
    .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase.from("business_metrics_daily").select("*").order("date", { ascending: false }).limit(30);
    if (error)
        throw error;
    return data;
});
export const createSupportTicket = createServerFn({ method: "POST" })
    .middleware([requireSupabaseAuth])
    .inputValidator((d) => z.object({ subject: z.string(), message: z.string() }).parse(d))
    .handler(async ({ data, context }) => {
    const { error } = await context.supabase
        .from("support_tickets")
        .insert({
        user_id: context.userId,
        subject: data.subject,
        message: data.message
    });
    if (error)
        throw error;
    return { ok: true };
});
