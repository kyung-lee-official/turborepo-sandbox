"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function NavLinkWithTooltip({
  href,
  children,
  description,
}: {
  href: string;
  children: ReactNode;
  description?: string;
}) {
  const link = (
    <Link href={href} className="hover:underline">
      {children}
    </Link>
  );

  if (!description) {
    return link;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={8} className="max-w-xs">
        {description}
      </TooltipContent>
    </Tooltip>
  );
}
