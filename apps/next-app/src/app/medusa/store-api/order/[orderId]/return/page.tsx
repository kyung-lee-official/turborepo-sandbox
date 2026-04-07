import { Content } from "./Content";

type Props = {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ itemId?: string; cartId?: string }>;
};

const Page = async (props: Props) => {
  const { orderId } = await props.params;
  const { itemId, cartId } = await props.searchParams;
  return <Content cartIdFromQuery={cartId} itemId={itemId} orderId={orderId} />;
};

export default Page;
