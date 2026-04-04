import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type AlertVariant = "error" | "success" | "warning";

type AlertAppearance = "soft" | "pixel";

type AlertProps = {
  title: string;
  children: ReactNode;
  variant?: AlertVariant;
  appearance?: AlertAppearance;
  className?: string;
};

const variantClassMap: Record<
  AlertVariant,
  { root: string; title: string; body: string }
> = {
  error: {
    root: "bg-red-50",
    title: "text-red-800",
    body: "text-red-700",
  },
  success: {
    root: "bg-green-50",
    title: "text-green-800",
    body: "text-green-700",
  },
  warning: {
    root: "bg-amber-50",
    title: "text-amber-950",
    body: "text-amber-900",
  },
};

const pixelChrome: Record<AlertVariant, string> = {
  error: "border-2 border-[#7f1d1d] shadow-[4px_4px_0_0_#450a0a]",
  success: "border-2 border-green-800 shadow-[4px_4px_0_0_#14532d]",
  warning: "border-2 border-amber-900 shadow-[4px_4px_0_0_#78350f]",
};

export const Alert = ({
  title,
  children,
  variant = "error",
  appearance = "soft",
  className,
}: AlertProps) => {
  const variantClasses = variantClassMap[variant];

  return (
    <div
      className={cn(
        "p-4",
        appearance === "soft" && "rounded-md",
        appearance === "pixel" && cn("rounded-none", pixelChrome[variant]),
        variantClasses.root,
        className,
      )}
    >
      <div className="flex">
        <div className="ml-3">
          <h3 className={cn("font-medium text-sm", variantClasses.title)}>
            {title}
          </h3>
          <div className={cn("mt-2 text-sm", variantClasses.body)}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
