import { Card } from "@/app/medusa/components/Card";
import { PageHeading } from "@/app/medusa/components/PageHeading";
import { StoreApiScaffold } from "@/app/medusa/components/StoreApiScaffold";
import PayPal from "./PayPal";

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

const Page = async ({ searchParams }: Props) => {
  const { token, PayerID } = await searchParams;

  if (token && PayerID) {
    return <PayPal token={token as string} PayerID={PayerID as string} />;
  }

  return (
    <StoreApiScaffold maxWidth="narrow">
      <PageHeading title="Payment return" description="Unknown payment status." />
      <Card variant="pixel" className="max-w-none p-6">
        <p className="text-gray-700">
          Missing <code className="font-mono text-sm">token</code> or{" "}
          <code className="font-mono text-sm">PayerID</code> query parameters.
        </p>
      </Card>
    </StoreApiScaffold>
  );
};

export default Page;
