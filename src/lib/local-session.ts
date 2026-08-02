/**
 * Isolamento dos dados guardados no navegador.
 *
 * Preferências locais (filtros, período, categorias recentes, avisos
 * dispensados, liberações de meses anteriores) ficavam salvas sem vínculo com o
 * usuário: em um computador compartilhado, o que uma pessoa digitava aparecia
 * nos campos da próxima. Aqui o navegador passa a lembrar de qual conta são
 * esses dados e limpa tudo quando a conta muda ou ao sair.
 */

const ACTIVE_USER_KEY = "gc.active-user";

/** Prefixos usados pelas preferências locais do GastoCerto. */
const LOCAL_PREFIXES = ["gc.", "gc:", "gastocerto:", "gastocerto_"];

function matchesApp(key: string) {
  return LOCAL_PREFIXES.some((prefix) => key.startsWith(prefix));
}

function clearStore(store: Storage, keepActiveUser: boolean) {
  const doomed: string[] = [];
  for (let index = 0; index < store.length; index += 1) {
    const key = store.key(index);
    if (!key) continue;
    if (keepActiveUser && key === ACTIVE_USER_KEY) continue;
    if (matchesApp(key)) doomed.push(key);
  }
  doomed.forEach((key) => store.removeItem(key));
}

/** Remove preferências e rascunhos locais do app (não mexe na sessão atual). */
export function clearLocalAppData(options?: { keepActiveUser?: boolean }) {
  if (typeof window === "undefined") return;
  try {
    clearStore(window.localStorage, options?.keepActiveUser ?? false);
    clearStore(window.sessionStorage, true);
  } catch {
    // navegador sem acesso ao storage (modo restrito)
  }
}

/**
 * Garante que os dados locais pertencem ao usuário atual. Quando outra conta
 * entra no mesmo navegador, tudo que ficou da conta anterior é apagado.
 */
export function ensureLocalDataOwner(userId: string | null) {
  if (typeof window === "undefined") return;
  try {
    const previous = window.localStorage.getItem(ACTIVE_USER_KEY);
    if (!userId) return;
    if (previous === userId) return;
    clearLocalAppData({ keepActiveUser: true });
    window.localStorage.setItem(ACTIVE_USER_KEY, userId);
  } catch {
    // ignora
  }
}

/** Apaga credenciais e dados salvos no navegador (usado ao sair e no login). */
export function clearBrowserCredentials() {
  if (typeof window === "undefined") return;
  try {
    const doomed: string[] = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key) continue;
      if (matchesApp(key) || key.startsWith("sb-") || key.includes("supabase")) doomed.push(key);
    }
    doomed.forEach((key) => window.localStorage.removeItem(key));
    window.sessionStorage.clear();
  } catch {
    // ignora
  }
}
