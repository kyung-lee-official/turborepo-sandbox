import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PageShellProps = {
  children: ReactNode;
  className?: string;
};

export const PageShell = ({ children, className }: PageShellProps) => {
  return (
    <div
      className={cn(
        "flex min-h-screen flex-col items-center justify-center gap-3 bg-stone-100",
        className,
      )}
    >
      {children}
    </div>
  );
};
