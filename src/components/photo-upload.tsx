"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { stripImageMetadata } from "@/lib/strip-image-client";
import { createClient } from "@/lib/supabase/client";

const MAX_PHOTOS = 5;
const MAX_BYTES = 5 * 1024 * 1024;

interface PhotoUploadProps {
  spaceId: string;
  bucket?: "listing-public" | "verification-private";
  isPublic?: boolean;
  label?: string;
  description?: string;
  onComplete?: () => void;
}

export function PhotoUpload({
  spaceId,
  bucket = "listing-public",
  isPublic = true,
  label = "Photos (optional)",
  description = "Up to 5 images. GPS and camera metadata are removed before upload.",
  onComplete,
}: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

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
    setPreviews(combined.map((f) => URL.createObjectURL(f)));
  }

  function removeAt(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  async function upload() {
    if (files.length === 0) {
      onComplete?.();
      return;
    }

    setUploading(true);
    setError(null);
    const supabase = createClient();

    try {
      for (let i = 0; i < files.length; i++) {
        const stripped = await stripImageMetadata(files[i]);
        const ext = files[i].type === "image/png" ? "png" : "jpg";
        const path = `${spaceId}/${crypto.randomUUID()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(path, stripped, {
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
      setDone(true);
      onComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  if (done) {
    return (
      <p className="text-sm text-muted-foreground">
        {files.length} photo{files.length === 1 ? "" : "s"} uploaded.
      </p>
    );
  }

  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
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
            <div key={src} className="relative aspect-square overflow-hidden rounded-lg border">
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
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading || files.length >= MAX_PHOTOS}
          onClick={() => inputRef.current?.click()}
        >
          <ImagePlus data-icon="inline-start" />
          Add photos
        </Button>
        {files.length > 0 ? (
          <Button type="button" size="sm" disabled={uploading} onClick={upload}>
            {uploading ? "Uploading…" : `Upload ${files.length} photo${files.length === 1 ? "" : "s"}`}
          </Button>
        ) : null}
      </div>
      <FieldDescription>{description}</FieldDescription>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </Field>
  );
}
