"use client";

import { forwardRef, useEffect, useState } from "react";

/** Wraps Google's <model-viewer>, loaded on the client only. */
const ModelViewer = forwardRef<HTMLElement, { src: string; alt: string; className?: string }>(
  function ModelViewer({ src, alt, className }, ref) {
    const [ready, setReady] = useState(false);

    useEffect(() => {
      import("@google/model-viewer").then(() => setReady(true));
    }, []);

    if (!ready) return <div className={`viewer viewer-loading ${className ?? ""}`}>Loading 3D…</div>;
    return (
      <model-viewer
        ref={ref}
        className={`viewer ${className ?? ""}`}
        src={src}
        alt={alt}
        camera-controls=""
        auto-rotate=""
        shadow-intensity="1"
        exposure="1.1"
        interaction-prompt="none"
      />
    );
  },
);

export default ModelViewer;
