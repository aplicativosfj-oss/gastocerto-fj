/** Verificação de papel de administrador reutilizável pelas server functions. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any;

export async function assertAdminRole(supabase: Db, userId: string) {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error) throw new Error("Não foi possível validar as permissões");
  if (!data) throw new Error("Acesso restrito a administradores");
}
