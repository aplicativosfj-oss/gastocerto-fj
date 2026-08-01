import { z } from "zod";
import { isValidCpf, onlyDigits } from "@/lib/cpf";

/** Remove caracteres de controle e espaços extras. */
export function sanitizeText(value: string): string {
  return value
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function sanitizePhone(value: string): string {
  return value.replace(/[^\d+()\-\s]/g, "").trim();
}

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Informe seu e-mail")
  .email("E-mail inválido")
  .max(255, "E-mail muito longo");

export const passwordSchema = z
  .string()
  .min(8, "A senha deve ter ao menos 8 caracteres")
  .max(72, "A senha deve ter no máximo 72 caracteres")
  .regex(/[a-zA-Z]/, "A senha deve conter ao menos uma letra")
  .regex(/[0-9]/, "A senha deve conter ao menos um número");

export const fullNameSchema = z
  .string()
  .transform(sanitizeText)
  .pipe(
    z
      .string()
      .min(3, "Informe seu nome completo")
      .max(100, "Nome muito longo")
      .regex(/^[\p{L}\p{M}'\-\s.]+$/u, "O nome contém caracteres inválidos"),
  );

export const phoneSchema = z
  .string()
  .transform(sanitizePhone)
  .pipe(
    z
      .string()
      .max(20, "Telefone muito longo")
      .regex(/^$|^[\d+()\-\s]{8,20}$/, "Telefone inválido"),
  );

export const signUpSchema = z
  .object({
    fullName: fullNameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    acceptTerms: z.literal(true, {
      errorMap: () => ({ message: "É necessário aceitar os termos de uso" }),
    }),
    acceptPrivacy: z.literal(true, {
      errorMap: () => ({ message: "É necessário aceitar a política de privacidade" }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas não conferem",
  });

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Informe sua senha").max(72),
});

/** CPF: aceita com ou sem máscara, valida dígitos verificadores. */
export const cpfSchema = z
  .string()
  .transform(onlyDigits)
  .pipe(
    z
      .string()
      .length(11, "O CPF deve ter 11 dígitos")
      .refine(isValidCpf, "CPF inválido"),
  );

/** Senha numérica de 6 dígitos usada no acesso por CPF. */
export const pinSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "A senha deve ter exatamente 6 dígitos numéricos");

/** Recusa PINs triviais (todos iguais ou sequenciais). */
export function isWeakPin(pin: string): boolean {
  if (/^(\d)\1{5}$/.test(pin)) return true;
  const asc = "0123456789";
  const desc = "9876543210";
  return asc.includes(pin) || desc.includes(pin);
}

export const strongPinSchema = pinSchema.refine(
  (pin) => !isWeakPin(pin),
  "Evite senhas óbvias como 111111 ou 123456",
);

export const cpfSignInSchema = z.object({
  cpf: cpfSchema,
  pin: pinSchema,
});

export const emailSignInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Informe sua senha"),
});

export const cpfSignUpSchema = z
  .object({
    fullName: fullNameSchema,
    cpf: cpfSchema,
    contactEmail: z.string().trim().max(255, "E-mail muito longo").optional().or(z.literal("")),
    pin: strongPinSchema,
    confirmPin: z.string(),
    acceptTerms: z.literal(true, {
      errorMap: () => ({ message: "É necessário aceitar os termos de uso" }),
    }),
    acceptPrivacy: z.literal(true, {
      errorMap: () => ({ message: "É necessário aceitar a política de privacidade" }),
    }),
  })
  .refine((data) => data.pin === data.confirmPin, {
    path: ["confirmPin"],
    message: "As senhas não conferem. Digite os mesmos 6 dígitos.",
  })
  .refine((data) => !data.contactEmail || z.string().email().safeParse(data.contactEmail).success, {
    path: ["contactEmail"],
    message: "E-mail inválido. Use o formato nome@dominio.com",
  });

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const newPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas não conferem",
  });

export const profileSchema = z.object({
  fullName: fullNameSchema,
  phone: phoneSchema.optional().or(z.literal("")),
  monthlyIncome: z
    .number({ invalid_type_error: "Valor inválido" })
    .min(0, "O valor não pode ser negativo")
    .max(100_000_000, "Valor muito alto")
    .optional(),
});

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024; // 2 MB
export const AVATAR_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function validateAvatarFile(file: File): string | null {
  if (!AVATAR_ALLOWED_TYPES.includes(file.type)) {
    return "Use uma imagem JPG, PNG ou WEBP.";
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return "A imagem deve ter no máximo 2 MB.";
  }
  return null;
}

/** Mensagens de erro amigáveis, sem vazar detalhes internos. */
export function friendlyAuthError(message?: string): string {
  const raw = (message ?? "").toLowerCase();
  if (raw.includes("invalid login credentials")) return "CPF/e-mail ou senha incorretos.";
  if (raw.includes("email not confirmed")) return "Confirme seu e-mail antes de entrar.";
  if (raw.includes("user already registered")) return "Já existe uma conta com este CPF ou e-mail.";
  if (raw.includes("pwned") || raw.includes("compromised"))
    return "Esta senha já apareceu em vazamentos. Escolha outra.";
  return message ?? "Erro ao processar solicitação.";
}
