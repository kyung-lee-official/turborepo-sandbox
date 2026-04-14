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
        description="Use this URL as OCEANPAYMENT_PAYMENT_RESULT_REDIRECT_BASE — the browser arrives here via GET after Medusa verifies the synchronous backUrl POST."
      />

      <Card variant="pixel" className="max-w-none space-y-4 p-6">
        <p className="text-gray-800 text-sm leading-relaxed">
          Flow: Ocean <strong className="font-semibold">POSTs</strong> the payment
          form to your Medusa <code className="font-mono text-xs">backUrl</code>{" "}
          (e.g. <code className="font-mono text-xs">/hooks/payment/oceanpayment_oceanpayment/back</code>
          ). Medusa verifies <code className="font-mono text-xs">signValue</code>, then responds with{" "}
          <strong className="font-semibold">303</strong> to this page with an allowlisted subset of fields
          in the query string. This Next.js <code className="font-mono text-xs">page.tsx</code> only handles
          that final <strong className="font-semibold">GET</strong>.
        </p>
        <p className="text-gray-700 text-sm">
          This page is a <strong className="font-semibold">visual demo</strong>
          : query parameters shown below are whatever Medusa attached on redirect
          (e.g. <code className="font-mono text-xs">payment_id</code>,{" "}
          <code className="font-mono text-xs">payment_status</code>).
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
            No query parameters on this request. Open this URL from the checkout
            flow after Medusa&apos;s 303 redirect, or append test query params manually.
          </p>
        </Card>
      )}
    </StoreApiScaffold>
  );
};

export default Page;
