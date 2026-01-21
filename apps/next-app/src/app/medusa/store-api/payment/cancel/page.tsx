type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

const Page = async ({ searchParams }: Props) => {
  // Await the searchParams promise
  const sp = await searchParams;
  console.log(sp);
  return <div>Payment cancelled</div>;
};

export default Page;
