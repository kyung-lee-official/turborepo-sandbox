import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type CardProps = {
  children: ReactNode;
  className?: string;
};

export const Card = ({ children, className }: CardProps) => {
  return (
    <div
      className={cn(
        "w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow",
        className,
      )}
    >
      {children}
    </div>
  );
};
