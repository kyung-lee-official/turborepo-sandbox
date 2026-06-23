import Link from "next/link";

export type SalesDataNavPage = "generate" | "import" | "jobs";

type SalesDataNavProps = {
  current: SalesDataNavPage;
};

const NAV_ITEMS: { id: SalesDataNavPage; label: string; href: string }[] = [
  {
    id: "generate",
    label: "Generate fixtures",
    href: "/files/sales-import-fixtures",
  },
  {
    id: "import",
    label: "Import",
    href: "/files/import-sales-test-fixtures",
  },
  {
    id: "jobs",
    label: "Processing jobs",
    href: "/files/processing-jobs",
  },
];

export function SalesDataNav({ current }: SalesDataNavProps) {
  return (
    <nav
      aria-label="Sales data"
      className="mb-6 border-gray-200 border-b bg-white"
    >
      <div className="flex flex-wrap gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive = item.id === current;
          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`border-b-2 px-4 py-3 font-medium text-sm transition-colors ${
                isActive
                  ? "border-blue-600 text-blue-700"
                  : "border-transparent text-gray-600 hover:border-gray-300 hover:text-gray-900"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
