import type { InputHTMLAttributes } from "react";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Checkbox = forwardRef<
  HTMLInputElement,
  Omit<InputHTMLAttributes<HTMLInputElement>, "type">
>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      type="checkbox"
      className={cn(
        "h-5 w-5 shrink-0 rounded-none border-2 border-[#1e1b84] bg-white accent-[#4f46e5]",
        "shadow-[4px_4px_0_0_#0f172a]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#818cf8] focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
});

Checkbox.displayName = "Checkbox";
