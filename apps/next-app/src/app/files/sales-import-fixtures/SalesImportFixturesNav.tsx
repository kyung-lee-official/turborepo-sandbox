import Link from "next/link";

type SalesImportFixturesNavProps = {
  current: "generate" | "import";
};

export function SalesImportFixturesNav({
  current,
}: SalesImportFixturesNavProps) {
  return (
    <nav className="mb-6 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
      {current === "generate" ? (
        <p className="text-gray-700">
          Next step:{" "}
          <Link
            href="/files/import-sales-test-fixtures"
            className="font-medium text-blue-600 underline hover:text-blue-800"
          >
            Import sales test fixtures
          </Link>
          {" — select the three files and run the sales import job."}
        </p>
      ) : (
        <p className="text-gray-700">
          Need files first?{" "}
          <Link
            href="/files/sales-import-fixtures"
            className="font-medium text-blue-600 underline hover:text-blue-800"
          >
            Generate sales import test fixtures
          </Link>
          {
            " — create perfect, partial, and fail_fast bundles under nest-app/temp."
          }
        </p>
      )}
    </nav>
  );
}
