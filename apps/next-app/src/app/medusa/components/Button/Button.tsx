import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "danger" | "outline";
export type ButtonSize = "default" | "icon" | "compact";

type MedusaButtonOptions = {
  className?: string;
  /** @default true for size "default"; ignored for "icon" */
  fullWidth?: boolean;
  size?: ButtonSize;
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  MedusaButtonOptions & {
    children: ReactNode;
    variant?: ButtonVariant;
  };

const focusPrimary =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#818cf8] focus-visible:ring-offset-2";
const focusDanger =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f87171] focus-visible:ring-offset-2";
const focusOutline =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2";

const brutalPrimary =
  "border-[#1e1b84] bg-[#4f46e5] text-white hover:bg-[#4338ca] shadow-[8px_8px_0_0_#0f172a]";
const brutalPrimarySm =
  "border-[#1e1b84] bg-[#4f46e5] text-white hover:bg-[#4338ca] shadow-[4px_4px_0_0_#0f172a]";
const brutalDanger =
  "border-[#7f1d1d] bg-[#dc2626] text-white hover:bg-[#b91c1c] shadow-[8px_8px_0_0_#450a0a]";
const brutalDangerSm =
  "border-[#7f1d1d] bg-[#dc2626] text-white hover:bg-[#b91c1c] shadow-[4px_4px_0_0_#450a0a]";

/** Shared look for `<Button />` and links (e.g. Next `Link`). */
export function medusaButtonClassName(
  variant: ButtonVariant = "primary",
  options?: MedusaButtonOptions,
): string {
  const { className, fullWidth = true, size = "default" } = options ?? {};

  if (variant === "outline") {
    return cn(
      "relative flex items-center justify-center border border-gray-300 bg-white text-gray-900 shadow-none",
      "hover:bg-gray-50",
      focusOutline,
      "disabled:cursor-not-allowed disabled:opacity-50",
      size === "icon" &&
        "h-8 w-8 min-h-8 min-w-8 shrink-0 rounded-md p-0 text-sm font-semibold",
      size === "compact" &&
        "rounded-md px-3 py-1 text-xs font-semibold tracking-normal",
      size === "default" &&
        "rounded-md px-5 py-[10px] font-sans text-xs font-bold tracking-[1px]",
      fullWidth && size === "default" ? "w-full" : undefined,
      className,
    );
  }

  const brutal =
    variant === "primary"
      ? size === "default"
        ? brutalPrimary
        : brutalPrimarySm
      : size === "default"
        ? brutalDanger
        : brutalDangerSm;
  const focus = variant === "primary" ? focusPrimary : focusDanger;

  return cn(
    "relative flex items-center justify-center font-sans disabled:cursor-not-allowed disabled:opacity-50",
    focus,
    brutal,
    size === "default" &&
      "rounded-none border-4 px-5 py-[10px] text-xs font-bold tracking-[1px]",
    size === "compact" &&
      "rounded-md border-2 px-3 py-1 text-xs font-semibold tracking-normal",
    size === "icon" &&
      "h-8 w-8 min-h-8 min-w-8 shrink-0 rounded-md border-2 p-0 text-sm font-semibold",
    fullWidth && size === "default" ? "w-full" : undefined,
    className,
  );
}

export const Button = ({
  children,
  className,
  variant = "primary",
  fullWidth = true,
  size = "default",
  ...props
}: ButtonProps) => {
  return (
    <button
      className={medusaButtonClassName(variant, {
        className,
        fullWidth,
        size,
      })}
      {...props}
    >
      {children}
    </button>
  );
};
