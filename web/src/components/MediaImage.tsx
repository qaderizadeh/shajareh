import { useEffect, useState } from "react";
import { getToken } from "../lib/api";

/**
 * Image component that fetches media files with authentication.
 * Since <img> tags can't send Bearer tokens, we fetch the blob client-side.
 */
export function MediaImage({ mediaId, alt, style, className }: { mediaId: string; alt?: string; style?: React.CSSProperties; className?: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let revoke: string | null = null;
    let cancelled = false;

    (async () => {
      try {
        const token = getToken();
        const res = await fetch(`/api/media/${mediaId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) return;
        const blob = await res.blob();
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        revoke = url;
        setSrc(url);
      } catch {
        // image unavailable
      }
    })();

    return () => {
      cancelled = true;
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [mediaId]);

  if (!src) {
    return <div className={className} style={{ ...style, background: "var(--surface-muted)", borderRadius: "var(--radius-md)" }} />;
  }

  return <img src={src} alt={alt || "عکس"} className={className} style={style} loading="lazy" />;
}
