import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
};

const variantClassMap: Record<ButtonVariant, string> = {
  primary:
    "border-transparent bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500",
  danger:
    "border-transparent bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
};

export const Button = ({
  children,
  className,
  variant = "primary",
  ...props
}: ButtonProps) => {
  return (
    <button
      className={cn(
        "group relative flex w-full justify-center rounded-md border px-4 py-2 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        variantClassMap[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
};
