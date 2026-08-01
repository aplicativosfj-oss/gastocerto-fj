import { describe, expect, it } from "vitest";

import {
  emailSchema,
  emailSignInSchema,
  forgotPasswordSchema,
  signUpSchema,
} from "@/lib/validation";

describe("emailSchema", () => {
  it("aceita e-mails válidos e normaliza espaços", () => {
    expect(emailSchema.parse("  nome@empresa.com ")).toBe("nome@empresa.com");
    expect(emailSchema.safeParse("a.b-c+tag@sub.dominio.com.br").success).toBe(true);
  });

  it("rejeita números soltos, CPF e formatos inválidos", () => {
    for (const invalid of [
      "69598193268",
      "695.981.932-68",
      "",
      "   ",
      "nome",
      "nome@",
      "@empresa.com",
      "nome@empresa",
      "nome empresa@teste.com",
      "nome@@empresa.com",
    ]) {
      expect(emailSchema.safeParse(invalid).success, invalid).toBe(false);
    }
  });

  it("rejeita e-mails longos demais", () => {
    expect(emailSchema.safeParse(`${"a".repeat(250)}@teste.com`).success).toBe(false);
  });
});

describe("emailSignInSchema", () => {
  it("exige e-mail válido no login administrativo", () => {
    expect(emailSignInSchema.safeParse({ email: "12345678900", password: "senha1234" }).success).toBe(
      false,
    );
    expect(
      emailSignInSchema.safeParse({ email: "admin@gastocerto.app", password: "senha1234" }).success,
    ).toBe(true);
  });
});

describe("forgotPasswordSchema", () => {
  it("não aceita apenas dígitos", () => {
    expect(forgotPasswordSchema.safeParse({ email: "11122233344" }).success).toBe(false);
    expect(forgotPasswordSchema.safeParse({ email: "cliente@dominio.com" }).success).toBe(true);
  });
});

describe("signUpSchema", () => {
  const base = {
    fullName: "Maria da Silva",
    email: "maria@dominio.com",
    password: "Senha1234",
    confirmPassword: "Senha1234",
    acceptTerms: true as const,
    acceptPrivacy: true as const,
  };

  it("aceita cadastro completo", () => {
    expect(signUpSchema.safeParse(base).success).toBe(true);
  });

  it("bloqueia e-mail inválido no cadastro", () => {
    expect(signUpSchema.safeParse({ ...base, email: "5551999999" }).success).toBe(false);
  });
});
