import { Card } from "@/app/medusa/components/Card";
import { PageHeading } from "@/app/medusa/components/PageHeading";
import { PixelSurface } from "@/app/medusa/components/PixelSurface";
import { StoreApiScaffold } from "@/app/medusa/components/StoreApiScaffold";

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

function formatParamValue(value: string | string[] | undefined): string {
  if (value === undefined) {
    return "";
  }
  return Array.isArray(value) ? value.join(", ") : value;
}

const Page = async ({ searchParams }: Props) => {
  const sp = await searchParams;
  const rows = Object.entries(sp).filter(
    ([, v]) => v !== undefined && v !== "",
  );

  return (
    <StoreApiScaffold maxWidth="narrow">
      <PageHeading
        title="OceanPayment return (demo)"
        description="Hosted checkout browser return — use this URL as OCEANPAYMENT_BACK_URL while integrating."
      />

      <Card variant="pixel" className="max-w-none space-y-4 p-6">
        <p className="text-gray-800 text-sm leading-relaxed">
          Ocean&apos;s default is to{" "}
          <strong className="font-semibold">POST</strong> form fields to your{" "}
          <code className="font-mono text-xs">backUrl</code>. A Next.js{" "}
          <code className="font-mono text-xs">page.tsx</code> only handles{" "}
          <strong className="font-semibold">GET</strong>, so for production you
          need a <code className="font-mono text-xs">route.ts</code> POST handler
          (or configure Ocean to return via GET if your account supports it),
          then verify the synchronous signature before completing the Medusa
          payment.
        </p>
        <p className="text-gray-700 text-sm">
          This page is a <strong className="font-semibold">visual demo</strong>
          : if you open it with query parameters (e.g. after a test redirect), they
          are listed below.
        </p>
      </Card>

      {rows.length > 0 ? (
        <Card variant="pixel" className="max-w-none p-6">
          <h2 className="mb-4 font-bold text-gray-900 text-lg">
            Query parameters
          </h2>
          <div className="space-y-2">
            {rows.map(([key, value]) => (
              <PixelSurface key={key} shadow="sm" className="p-3">
                <p className="font-mono text-gray-500 text-xs">{key}</p>
                <p className="break-all font-mono text-gray-900 text-sm">
                  {formatParamValue(value)}
                </p>
              </PixelSurface>
            ))}
          </div>
        </Card>
      ) : (
        <Card variant="pixel" className="max-w-none p-6">
          <p className="text-gray-700 text-sm">
            No query parameters on this request. After a real Ocean redirect you
            may see an empty GET here while the POST body is handled elsewhere.
          </p>
        </Card>
      )}
    </StoreApiScaffold>
  );
};

export default Page;
