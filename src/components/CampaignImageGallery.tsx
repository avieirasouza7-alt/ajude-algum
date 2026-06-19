import { useState } from "react";
import { SignedImage } from "@/components/SignedImage";
import { cn } from "@/lib/utils";

type CampaignImageGalleryProps = {
  paths: string[];
  alt: string;
};

export function CampaignImageGallery({ paths, alt }: CampaignImageGalleryProps) {
  const [active, setActive] = useState(0);
  const slides = paths.length > 0 ? paths : [null];
  const current = Math.min(active, slides.length - 1);

  if (slides.length === 1 && !slides[0]) {
    return (
      <div className="overflow-hidden rounded-2xl bg-muted shadow-soft">
        <SignedImage path={null} alt={alt} className="aspect-[16/10] w-full object-cover" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl bg-muted shadow-soft">
        <SignedImage
          path={slides[current]}
          alt={current === 0 ? alt : `${alt} — foto ${current + 1}`}
          priority={current === 0}
          className="aspect-[16/10] w-full object-cover"
        />
      </div>
      {slides.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {slides.map((path, index) => (
            <button
              key={path ?? index}
              type="button"
              onClick={() => setActive(index)}
              className={cn(
                "relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 transition",
                current === index ? "border-primary ring-2 ring-primary/30" : "border-border opacity-80 hover:opacity-100",
              )}
              aria-label={`Ver foto ${index + 1}`}
            >
              <SignedImage
                path={path}
                alt=""
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
