/**
 * Padronização do texto digitado: todas as informações cadastradas ficam em
 * MAIÚSCULAS automaticamente, mantendo os acentos do português.
 */
export function upperText(value: string): string {
  return value.toLocaleUpperCase("pt-BR");
}
