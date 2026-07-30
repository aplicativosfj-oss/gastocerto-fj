import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

export const RECEIPTS_BUCKET = "receipts";
export const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;
export const ALLOWED_RECEIPT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

/** Envia um comprovante para a pasta privada do usuário e devolve o caminho salvo. */
export async function uploadReceipt(file: File, userId: string): Promise<string> {
  if (!ALLOWED_RECEIPT_TYPES.includes(file.type)) {
    throw new Error("Formato inválido. Envie JPG, PNG, WEBP ou PDF.");
  }
  if (file.size > MAX_RECEIPT_BYTES) {
    throw new Error("Arquivo muito grande. O limite é 5 MB.");
  }

  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const path = `${userId}/${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage
    .from(RECEIPTS_BUCKET)
    .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
  if (error) throw error;

  return path;
}

export async function removeReceipt(path: string) {
  await supabase.storage.from(RECEIPTS_BUCKET).remove([path]);
}

export async function signedReceiptUrl(path: string) {
  const { data } = await supabase.storage.from(RECEIPTS_BUCKET).createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

/** URL assinada temporária para exibir um comprovante privado. */
export function useReceiptUrl(path: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!path) {
      setUrl(null);
      return;
    }
    signedReceiptUrl(path).then((value) => {
      if (active) setUrl(value);
    });
    return () => {
      active = false;
    };
  }, [path]);

  return url;
}

export function isPdfPath(path: string | null | undefined) {
  return Boolean(path?.toLowerCase().endsWith(".pdf"));
}
