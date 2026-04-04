import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PageHeadingProps = {
  title: string;
  description?: ReactNode;
  className?: string;
};

export const PageHeading = ({
  title,
  description,
  className,
}: PageHeadingProps) => {
  return (
    <div
      className={cn(
        "border-b-2 border-[#1e1b84] pb-4 shadow-[0_4px_0_0_#0f172a]",
        className,
      )}
    >
      <h1 className="font-bold text-3xl text-gray-800">{title}</h1>
      {description ? (
        <div className="mt-2 text-gray-600">{description}</div>
      ) : null}
    </div>
  );
};
