import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type AlertVariant = "error" | "success";

type AlertProps = {
  title: string;
  children: ReactNode;
  variant?: AlertVariant;
  className?: string;
};

const variantClassMap: Record<AlertVariant, { root: string; title: string; body: string }> =
{
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
};

export const Alert = ({
  title,
  children,
  variant = "error",
  className,
}: AlertProps) => {
  const variantClasses = variantClassMap[variant];

  return (
    <div className={cn("rounded-md p-4", variantClasses.root, className)}>
      <div className="flex">
        <div className="ml-3">
          <h3 className={cn("font-medium text-sm", variantClasses.title)}>{title}</h3>
          <div className={cn("mt-2 text-sm", variantClasses.body)}>{children}</div>
        </div>
      </div>
    </div>
  );
};
