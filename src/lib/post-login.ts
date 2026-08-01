import { supabase } from "@/integrations/supabase/client";

/** Descobre o destino correto após o login: administradores vão para o painel administrativo. */
export async function resolveHomeRoute(userId?: string | null): Promise<"/admin" | "/painel"> {
  if (!userId) return "/painel";
  try {
    const { data, error } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    
    // Prioridade absoluta: se for admin ou suporte, sempre vai para /admin
    if (data === true) {
      console.log("[auth] redirecionando para painel administrativo");
      return "/admin";
    }
    
    const { data: isSupport } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "support",
    });
    if (isSupport === true) {
      console.log("[auth] redirecionando para painel de suporte");
      return "/admin";
    }

    return "/painel";
  } catch {
    return "/painel";
  }
}

/** Destino após autenticação usando a sessão corrente. */
export async function resolveHomeRouteForSession(): Promise<"/admin" | "/painel"> {
  const { data } = await supabase.auth.getUser();
  return resolveHomeRoute(data.user?.id);
}
