import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
};

/** Matches `Button.pen`: face fills, 4px stroke, 8×8 block shadow, square corners, label 12px / bold / +1px tracking. */
const variantClassMap: Record<ButtonVariant, string> = {
  primary: cn(
    "border-[#1e1b84] bg-[#4f46e5] text-white shadow-[8px_8px_0_0_#0f172a]",
    "hover:bg-[#4338ca]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#818cf8] focus-visible:ring-offset-2",
  ),
  danger: cn(
    "border-[#7f1d1d] bg-[#dc2626] text-white shadow-[8px_8px_0_0_#450a0a]",
    "hover:bg-[#b91c1c]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f87171] focus-visible:ring-offset-2",
  ),
};

const buttonBaseClassName =
  "relative flex items-center justify-center rounded-none border-4 px-5 py-[10px] font-sans text-xs font-bold tracking-[1px] disabled:cursor-not-allowed disabled:opacity-50";

/** Shared look for `<Button />` and links (e.g. Next `Link`). */
export function medusaButtonClassName(
  variant: ButtonVariant = "primary",
  className?: string,
) {
  return cn(buttonBaseClassName, variantClassMap[variant], className);
}

export const Button = ({
  children,
  className,
  variant = "primary",
  ...props
}: ButtonProps) => {
  return (
    <button className={cn(medusaButtonClassName(variant), "w-full", className)} {...props}>
      {children}
    </button>
  );
};
