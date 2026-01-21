import PayPal from "./PayPal";

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

const Page = async ({ searchParams }: Props) => {
  // Await the searchParams promise
  const { token, PayerID } = await searchParams;

  if (token && PayerID) {
    /* PayPal */
    return <PayPal token={token as string} PayerID={PayerID as string} />;
  }

  return <div>Unknown payment status</div>;
};

export default Page;
