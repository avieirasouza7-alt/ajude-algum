import { useEffect, useRef, useState } from "react";
import { getCampaignImageUrl } from "@/lib/storage";
import { HeartHandshake } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function SignedImage({
  path,
  alt,
  className = "",
  priority = false,
  objectFit = "cover",
}: {
  path: string | null | undefined;
  alt: string;
  className?: string;
  priority?: boolean;
  objectFit?: "cover" | "contain";
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    let active = true;
    setLoaded(false);
    setErrored(false);
    setUrl(null);
    if (!path) {
      setErrored(true);
      return;
    }
    getCampaignImageUrl(path)
      .then((u) => {
        if (!active) return;
        if (!u) {
          setErrored(true);
          return;
        }
        setUrl(u);
      })
      .catch(() => active && setErrored(true));
    return () => {
      active = false;
    };
  }, [path]);

  useEffect(() => {
    if (url && imgRef.current?.complete && imgRef.current.naturalWidth > 0) setLoaded(true);
  }, [url]);

  if (errored) {
    return (
      <div
        className={`flex items-center justify-center bg-muted ${className}`}
        aria-label={alt}
        role="img"
      >
        <HeartHandshake className="h-10 w-10 text-muted-foreground/40" />
      </div>
    );
  }

  const imgClass =
    objectFit === "contain"
      ? "mx-auto block h-auto w-full max-w-full object-contain"
      : "h-full w-full object-cover";

  return (
    <div
      className={`relative overflow-hidden ${objectFit === "contain" ? "w-full" : ""} ${className}`}
    >
      {!loaded && objectFit === "cover" && <Skeleton className="absolute inset-0 h-full w-full" />}
      {!loaded && objectFit === "contain" && (
        <Skeleton className="aspect-[3/4] w-full max-h-[min(85vh,1200px)]" />
      )}
      {url && (
        <img
          ref={imgRef}
          src={url}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : "auto"}
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
          className={`${imgClass} transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
        />
      )}
    </div>
  );
}
