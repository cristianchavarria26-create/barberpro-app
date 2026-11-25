"use client";

import { useRef, useState } from "react";
import { Camera } from "lucide-react";
import { getToken } from "./api";
import { shrinkImage } from "@/lib/shrink-image";

async function uploadImage(file: File): Promise<string> {
  const blob = await shrinkImage(file).catch(() => file);
  const body = new FormData();
  body.append("file", blob, "foto.jpg");
  body.append("token", getToken());
  const response = await fetch("/api/admin/upload", { method: "POST", body });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || typeof data.url !== "string") throw new Error(data.error || "No pudimos subir la foto. Inténtalo de nuevo.");
  return data.url;
}

/** A button that lets the owner pick a photo, uploads it and hands back its address. */
export function PhotoPicker({ label, disabled, onUploaded, onError }: { label: string; disabled: boolean; onUploaded: (url: string) => void; onError: (text: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function pick(file?: File) {
    if (!file) return;
    setBusy(true);
    try {
      onUploaded(await uploadImage(file));
    } catch (error) {
      onError(error instanceof Error ? error.message : "No pudimos subir la foto. Inténtalo de nuevo.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden aria-label={label} onChange={(event) => pick(event.target.files?.[0])} />
      <button type="button" className="admin-btn" disabled={busy || disabled} onClick={() => input.current?.click()}>
        <Camera size={14} /> {busy ? "Subiendo..." : label}
      </button>
    </>
  );
}
