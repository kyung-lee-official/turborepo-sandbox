"use client";

import { useEffect, useId, useRef } from "react";
import { cn } from "@/lib/utils";

const lightThemeVariables = {
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

const darkThemeVariables = {
  background: "#161a21",
  primaryColor: "#1c212a",
  primaryBorderColor: "#2b323d",
  primaryTextColor: "#e6eaf0",
  secondaryColor: "#1c212a",
  secondaryBorderColor: "#2b323d",
  secondaryTextColor: "#e6eaf0",
  tertiaryColor: "#161a21",
  tertiaryBorderColor: "#2b323d",
  tertiaryTextColor: "#e6eaf0",
  mainBkg: "#1c212a",
  nodeBorder: "#2b323d",
  clusterBkg: "#12161d",
  clusterBorder: "#2b323d",
  edgeLabelBackground: "#161a21",
  lineColor: "#5f6b7c",
  textColor: "#d5dae2",
  fontSize: "13px",
  fontFamily: "ui-sans-serif, system-ui, sans-serif",
};

function Mermaid({
  chart,
  theme = "light",
  className,
}: {
  chart: string;
  theme?: "light" | "dark";
  className?: string;
}) {
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
          themeVariables:
            theme === "dark" ? darkThemeVariables : lightThemeVariables,
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
  }, [chart, rawId, theme]);

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
