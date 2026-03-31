import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type TextInputRadius = "none" | "top" | "bottom" | "full";

type TextInputProps = InputHTMLAttributes<HTMLInputElement> & {
  radius?: TextInputRadius;
};

const radiusClassMap: Record<TextInputRadius, string> = {
  none: "rounded-none",
  top: "rounded-none rounded-t-md",
  bottom: "rounded-none rounded-b-md",
  full: "rounded-md",
};

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  ({ className, radius = "full", ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "relative block w-full appearance-none border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm",
          radiusClassMap[radius],
          className,
        )}
        {...props}
      />
    );
  },
);

TextInput.displayName = "TextInput";
