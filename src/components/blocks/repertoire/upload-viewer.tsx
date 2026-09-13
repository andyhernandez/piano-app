"use client";
import * as React from "react";
import { FileText } from "lucide-react";
import { repo } from "@/lib/db/repo";

/** Shows a teacher-uploaded score (PDF or image) stored in the recordings table. Object URL is revoked on unmount. */
export function UploadViewer({ uploadId, title }: { uploadId: string; title: string }) {
  type Loaded = { id: string; url: string | null; mime: string };
  const [loaded, setLoaded] = React.useState<Loaded | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    let url: string | null = null;
    void repo.getRecording(uploadId).then((rec) => {
      if (cancelled) return;
      if (!rec) { setLoaded({ id: uploadId, url: null, mime: "" }); return; }
      url = URL.createObjectURL(rec.blob);
      setLoaded({ id: uploadId, url, mime: rec.mimeType || rec.blob.type });
    });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [uploadId]);

  // Only trust state that belongs to the current upload id (avoids a reset-in-effect).
  const current = loaded?.id === uploadId ? loaded : null;
  const missing = current !== null && current.url === null;
  const src = current && current.url ? { url: current.url, mime: current.mime } : null;

  if (missing) return <p className="text-sm text-muted-foreground">The uploaded score could not be found on this device.</p>;
  if (!src) return <p className="text-sm text-muted-foreground">Loading score…</p>;

  const isImage = src.mime.startsWith("image/");
  return (
    <div className="overflow-hidden rounded-2xl border-2 bg-card">
      {isImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src.url} alt={`Score for ${title}`} className="max-h-[60vh] w-full object-contain" />
      ) : (
        <object data={src.url} type={src.mime || "application/pdf"} className="h-[60vh] w-full" aria-label={`Score for ${title}`}>
          <div className="flex h-40 flex-col items-center justify-center gap-2 text-muted-foreground">
            <FileText className="h-8 w-8" />
            <a href={src.url} target="_blank" rel="noopener noreferrer" className="font-bold text-primary underline">Open the score in a new tab</a>
          </div>
        </object>
      )}
    </div>
  );
}
