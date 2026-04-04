import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type CardVariant = "default" | "pixel";

type CardProps = {
  children: ReactNode;
  className?: string;
  variant?: CardVariant;
};

const variantClassMap: Record<CardVariant, string> = {
  default:
    "w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow",
  pixel:
    "w-full max-w-md space-y-6 rounded-none border-2 border-[#1e1b84] bg-white p-6 shadow-[8px_8px_0_0_#0f172a]",
};

export const Card = ({
  children,
  className,
  variant = "default",
}: CardProps) => {
  return (
    <div className={cn(variantClassMap[variant], className)}>{children}</div>
  );
};
