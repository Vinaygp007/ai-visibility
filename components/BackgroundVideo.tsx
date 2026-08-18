"use client";

import { useEffect, useRef, useState } from "react";

export default function BackgroundVideo({
  src,
  className = "",
}: {
  src: string;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "600px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className={className} aria-hidden="true">
      {shouldLoad && (
        <video
          className="w-full h-full object-cover"
          src={src}
          autoPlay
          muted
          loop
          playsInline
        />
      )}
    </div>
  );
}
