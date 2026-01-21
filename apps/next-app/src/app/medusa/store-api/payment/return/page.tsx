type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

const Page = async ({ searchParams }: Props) => {
  // Await the searchParams promise
  const { token, PayerID } = await searchParams;

  if (token && PayerID) {
    /* PayPal */
    return (
      <div>
        <p>
          Payment successful! Token: {token}, PayerID: {PayerID}
        </p>
      </div>
    );
  }

  return <div>Unknown payment status</div>;
};

export default Page;
