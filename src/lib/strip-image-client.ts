"use client";

/** Re-encode image in canvas to strip EXIF/GPS metadata before upload. */
export async function stripImageMetadata(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files are allowed.");
  }

  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process image.");
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  const mime = file.type === "image/png" ? "image/png" : "image/jpeg";
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error("Encode failed"))),
      mime,
      mime === "image/jpeg" ? 0.9 : undefined
    );
  });
  return blob;
}
