"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { stripImageMetadata } from "@/lib/strip-image-client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";

const MAX_PHOTOS = 5;
const MAX_BYTES = 5 * 1024 * 1024;

export async function uploadSpacePhotos(
  spaceId: string,
  files: File[],
  options: {
    bucket?: "listing-public" | "verification-private";
    isPublic?: boolean;
  } = {}
): Promise<{ ok: boolean; message: string }> {
  if (files.length === 0) {
    return { ok: false, message: "Add at least one photo." };
  }
  if (!isSupabaseConfigured()) {
    return { ok: true, message: "Demo mode: photos recorded locally." };
  }

  const bucket = options.bucket ?? "listing-public";
  const isPublic = options.isPublic ?? true;
  const supabase = createClient();

  // Ensure session recovery from storage/cookies has completed
  const {
    data: { session },
  } = await supabase.auth.getSession();
  console.log("[uploadSpacePhotos] Active session user:", session?.user?.id || "None (Anonymous)");

  try {
    for (let i = 0; i < files.length; i++) {
      const stripped = await stripImageMetadata(files[i]);
      const ext = files[i].type === "image/png" ? "png" : "jpg";
      const path = `${spaceId}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage.from(bucket).upload(path, stripped, {
        contentType: stripped.type,
        upsert: false,
      });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const { error: recordError } = await supabase.from("space_media").insert({
        space_id: spaceId,
        storage_path: path,
        bucket,
        is_public: isPublic,
        sort_order: i,
      });
      if (recordError) {
        throw new Error(recordError.message);
      }
    }
    return {
      ok: true,
      message: `${files.length} photo${files.length === 1 ? "" : "s"} uploaded.`,
    };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Upload failed.",
    };
  }
}

interface PhotoUploadProps {
  /** When set, shows an Upload button that writes immediately. */
  spaceId?: string;
  bucket?: "listing-public" | "verification-private";
  isPublic?: boolean;
  label?: string;
  description?: string;
  required?: boolean;
  minPhotos?: number;
  files?: File[];
  onFilesChange?: (files: File[]) => void;
  onComplete?: () => void;
}

export function PhotoUpload({
  spaceId,
  bucket = "listing-public",
  isPublic = true,
  label,
  description = "Up to 5 images. GPS and camera metadata are removed before upload.",
  required = false,
  minPhotos = 1,
  files: controlledFiles,
  onFilesChange,
  onComplete,
}: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [internalFiles, setInternalFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const files = controlledFiles ?? internalFiles;
  const resolvedLabel = label ?? (required ? "Photos" : "Photos (optional)");

  const previews = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);

  useEffect(() => {
    return () => {
      for (const url of previews) URL.revokeObjectURL(url);
    };
  }, [previews]);

  function setFiles(next: File[]) {
    if (controlledFiles === undefined) setInternalFiles(next);
    onFilesChange?.(next);
  }

  function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(event.target.files ?? []);
    if (picked.length === 0) return;

    const combined = [...files, ...picked].slice(0, MAX_PHOTOS);
    const tooLarge = combined.find((f) => f.size > MAX_BYTES);
    if (tooLarge) {
      setError("Each photo must be under 5 MB.");
      return;
    }

    setError(null);
    setFiles(combined);
    if (inputRef.current) inputRef.current.value = "";
  }

  function removeAt(index: number) {
    setFiles(files.filter((_, i) => i !== index));
  }

  async function upload() {
    if (!spaceId) return;
    if (required && files.length < minPhotos) {
      setError(`Add at least ${minPhotos} photo${minPhotos === 1 ? "" : "s"}.`);
      return;
    }
    if (files.length === 0) {
      onComplete?.();
      return;
    }

    setUploading(true);
    setError(null);
    const result = await uploadSpacePhotos(spaceId, files, { bucket, isPublic });
    setUploading(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }
    setDone(true);
    onComplete?.();
  }

  if (done) {
    return (
      <p className="text-base text-muted-foreground">
        {files.length} photo{files.length === 1 ? "" : "s"} uploaded.
      </p>
    );
  }

  return (
    <Field>
      <FieldLabel>
        {resolvedLabel}
        {required ? <span className="text-destructive"> *</span> : null}
      </FieldLabel>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={onPick}
      />
      {previews.length > 0 ? (
        <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
          {previews.map((src, i) => (
            <div
              key={`${src}-${i}`}
              className="relative aspect-square overflow-hidden rounded-lg border"
            >
              <Image src={src} alt="" fill className="object-cover" unoptimized />
              <button
                type="button"
                className="absolute top-1 right-1 rounded-full bg-background/90 p-0.5"
                onClick={() => removeAt(i)}
                aria-label="Remove photo"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="mb-3 flex min-h-36 w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-input bg-muted/30 px-4 py-8 text-center transition-colors hover:bg-muted/50"
        >
          <ImagePlus className="size-8 text-muted-foreground" />
          <span className="text-base font-medium">
            {required ? "Add photos of the space" : "Add photos"}
          </span>
          <span className="max-w-xs text-sm text-muted-foreground">
            {required
              ? "At least one clear photo is required. Show the entrance and main area."
              : "JPEG, PNG or WebP. Up to 5 images."}
          </span>
        </button>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={uploading || files.length >= MAX_PHOTOS}
          onClick={() => inputRef.current?.click()}
        >
          <ImagePlus data-icon="inline-start" />
          {files.length === 0 ? "Choose photos" : "Add more"}
        </Button>
        {spaceId && files.length > 0 ? (
          <Button type="button" disabled={uploading} onClick={upload}>
            {uploading
              ? "Uploading…"
              : `Upload ${files.length} photo${files.length === 1 ? "" : "s"}`}
          </Button>
        ) : null}
      </div>
      <FieldDescription>{description}</FieldDescription>
      {error ? <p className="text-base text-destructive">{error}</p> : null}
    </Field>
  );
}
