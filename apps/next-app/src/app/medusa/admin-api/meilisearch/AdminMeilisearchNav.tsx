"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ROOT = "/medusa/admin-api/meilisearch";

const links = [
  { href: `${ROOT}/search`, label: "Search preview" },
  { href: `${ROOT}/tasks`, label: "Tasks" },
  { href: `${ROOT}/indexes`, label: "Indexes" },
] as const;

export const AdminMeilisearchNav = () => {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      <p className="mb-2 font-bold text-gray-500 text-xs uppercase tracking-wide">
        Meilisearch
      </p>
      {links.map(({ href, label }) => {
        const active =
          href === `${ROOT}/indexes`
            ? pathname?.startsWith(href) ?? false
            : pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "rounded-none border-2 px-3 py-2 font-semibold text-sm transition-colors",
              active
                ? "border-[#1e1b84] bg-indigo-50 text-indigo-950"
                : "border-transparent bg-white text-gray-800 hover:bg-stone-50",
            )}
          >
            {label}
          </Link>
        );
      })}
      <p className="mt-4 text-gray-500 text-xs leading-snug">
        Open an index from <strong>Indexes</strong> for documents and embedders.
      </p>
    </nav>
  );
};
