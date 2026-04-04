import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type InlineCodeProps = {
  children: ReactNode;
  className?: string;
};

export const InlineCode = ({ children, className }: InlineCodeProps) => {
  return (
    <code
      className={cn(
        "rounded-none border border-gray-400 bg-stone-100 px-1.5 py-0.5 font-mono text-xs text-gray-900 shadow-[2px_2px_0_0_#0f172a]",
        className,
      )}
    >
      {children}
    </code>
  );
};
