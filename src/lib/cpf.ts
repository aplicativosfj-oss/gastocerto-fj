/** Utilitários de CPF: normalização, máscara e validação dos dígitos verificadores. */

export function onlyDigits(value: string): string {
  return (value ?? "").replace(/\D/g, "");
}

/** Aplica a máscara 000.000.000-00 progressivamente. */
export function maskCpf(value: string): string {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

/** Valida CPF pelo algoritmo módulo 11, rejeitando dígitos repetidos. */
export function isValidCpf(value: string): boolean {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const digits = cpf.split("").map(Number);

  for (const [length, position] of [
    [9, 10],
    [10, 11],
  ] as const) {
    let sum = 0;
    for (let index = 0; index < length; index += 1) {
      sum += digits[index] * (position - index);
    }
    const remainder = (sum * 10) % 11;
    const check = remainder === 10 || remainder === 11 ? 0 : remainder;
    if (check !== digits[length]) return false;
  }

  return true;
}

/**
 * Domínio técnico usado internamente para transformar o CPF em um identificador
 * de conta. O usuário nunca vê este endereço.
 */
export const CPF_EMAIL_DOMAIN = "cpf.gastocerto.app";

export function cpfToLoginEmail(value: string): string {
  return `${onlyDigits(value)}@${CPF_EMAIL_DOMAIN}`;
}

export function isCpfLoginEmail(email: string | null | undefined): boolean {
  return Boolean(email && email.toLowerCase().endsWith(`@${CPF_EMAIL_DOMAIN}`));
}

/** Extrai o CPF de um e-mail técnico, quando aplicável. */
export function cpfFromLoginEmail(email: string | null | undefined): string | null {
  if (!isCpfLoginEmail(email)) return null;
  const cpf = onlyDigits(email!.split("@")[0]);
  return cpf.length === 11 ? cpf : null;
}

export const ADMIN_EMAIL = "francdenisbr@gmail.com";

/**
 * Deriva a senha real enviada ao provedor de autenticação a partir do CPF e do
 * PIN de 6 dígitos. O PIN sozinho seria recusado por ser previsível; a derivação
 * mantém a senha única por conta sem mudar a experiência do usuário.
 */
export function pinToPassword(cpf: string, pin: string): string {
  const digits = onlyDigits(cpf);
  return `GC.${digits}.${onlyDigits(pin)}`;
}
