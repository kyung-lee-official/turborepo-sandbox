import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/utils";

type PixelShadow = "sm" | "md";

type PixelSurfaceProps = {
  children: ReactNode;
  className?: string;
  shadow?: PixelShadow;
} & Omit<ComponentPropsWithoutRef<"div">, "children" | "className">;

const shadowClass: Record<PixelShadow, string> = {
  sm: "shadow-[4px_4px_0_0_#0f172a]",
  md: "shadow-[8px_8px_0_0_#0f172a]",
};

export const PixelSurface = ({
  children,
  className,
  shadow = "md",
  ...rest
}: PixelSurfaceProps) => {
  return (
    <div
      className={cn(
        "rounded-none border-2 border-[#1e1b84] bg-white",
        shadowClass[shadow],
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
};
