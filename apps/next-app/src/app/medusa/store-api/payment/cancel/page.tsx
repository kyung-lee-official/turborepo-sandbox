import { Card } from "@/app/medusa/components/Card";
import { PageHeading } from "@/app/medusa/components/PageHeading";
import { StoreApiScaffold } from "@/app/medusa/components/StoreApiScaffold";

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

const Page = async ({ searchParams }: Props) => {
  const sp = await searchParams;
  console.log(sp);

  return (
    <StoreApiScaffold maxWidth="narrow">
      <PageHeading
        title="Payment cancelled"
        description="You cancelled or abandoned the payment flow."
      />
      <Card variant="pixel" className="max-w-none p-6">
        <p className="text-gray-800">
          No charge was completed. You can return to the store and try again.
        </p>
      </Card>
    </StoreApiScaffold>
  );
};

export default Page;
