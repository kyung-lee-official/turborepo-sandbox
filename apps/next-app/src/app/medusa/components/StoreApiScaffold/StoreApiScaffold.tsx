import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type StoreApiScaffoldProps = {
  children: ReactNode;
  className?: string;
  /** Default `max-w-6xl`; use `narrow` for checkout-style layouts. */
  maxWidth?: "default" | "narrow";
};

const maxWidthClass = {
  default: "max-w-6xl",
  narrow: "max-w-4xl",
} as const;

export const StoreApiScaffold = ({
  children,
  className,
  maxWidth = "default",
}: StoreApiScaffoldProps) => {
  return (
    <div className={cn("min-h-screen bg-stone-100", className)}>
      <div
        className={cn("mx-auto px-4 py-8", maxWidthClass[maxWidth])}
      >
        {children}
      </div>
    </div>
  );
};
