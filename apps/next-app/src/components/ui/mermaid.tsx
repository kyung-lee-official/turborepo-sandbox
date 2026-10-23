"use client";

import { useEffect, useId, useRef } from "react";
import { cn } from "@/lib/utils";

const themeVariables = {
  background: "#ffffff",
  primaryColor: "#f8fafc",
  primaryBorderColor: "#cbd5e1",
  primaryTextColor: "#1f2937",
  secondaryColor: "#f1f5f9",
  secondaryBorderColor: "#cbd5e1",
  secondaryTextColor: "#1f2937",
  tertiaryColor: "#ffffff",
  tertiaryBorderColor: "#cbd5e1",
  tertiaryTextColor: "#1f2937",
  lineColor: "#94a3b8",
  textColor: "#1f2937",
  fontSize: "13px",
  fontFamily: "ui-sans-serif, system-ui, sans-serif",
};

function Mermaid({ chart, className }: { chart: string; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const renderCount = useRef(0);
  const rawId = useId();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    let cancelled = false;
    const id = `mermaid-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}-${renderCount.current++}`;

    import("mermaid")
      .then(async ({ default: mermaid }) => {
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: "base",
          themeVariables,
          flowchart: { curve: "basis", htmlLabels: true, padding: 12 },
        });

        const { svg } = await mermaid.render(id, chart);
        if (!cancelled) {
          container.innerHTML = svg;
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [chart, rawId]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex min-h-56 w-full justify-center overflow-x-auto [&_svg]:h-auto [&_svg]:max-w-full",
        className,
      )}
    />
  );
}

export { Mermaid };
