import { useEffect, useRef, useState } from "react";
import { getCampaignImageUrl } from "@/lib/storage";
import { HeartHandshake } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function SignedImage({
  path,
  alt,
  className = "",
  priority = false,
}: {
  path: string | null | undefined;
  alt: string;
  className?: string;
  priority?: boolean;
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

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {!loaded && <Skeleton className="absolute inset-0 h-full w-full" />}
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
          className={`h-full w-full object-cover transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
        />
      )}
    </div>
  );
}
