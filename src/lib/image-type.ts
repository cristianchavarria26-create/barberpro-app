export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

type ImageResult = { ok: true; bytes: Buffer; mimeType: string } | { ok: false; status: number; error: string };

// Trust the file contents, not the name or the type the browser reports.
function detectType(bytes: Buffer) {
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length > 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (bytes.length > 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
}

/** True when the request is clearly bigger than any image we accept, so it is refused before being read. */
export function bodyTooLarge(request: Request) {
  return Number(request.headers.get("content-length") ?? 0) > MAX_IMAGE_BYTES + 64 * 1024;
}

/** Checks an uploaded form file and returns its bytes, or the reason it cannot be used. */
export async function readImage(file: FormDataEntryValue | null | undefined): Promise<ImageResult> {
  if (!(file instanceof File) || file.size === 0) return { ok: false, status: 400, error: "Selecciona una imagen." };
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, status: 413, error: "La imagen pesa más de 5 MB. Elige una más liviana." };
  const bytes = Buffer.from(await file.arrayBuffer());
  const mimeType = detectType(bytes);
  if (!mimeType) return { ok: false, status: 400, error: "Sube una imagen en formato JPG, PNG o WebP." };
  return { ok: true, bytes, mimeType };
}
