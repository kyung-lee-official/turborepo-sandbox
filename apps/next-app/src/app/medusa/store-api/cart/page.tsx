import { CartForm } from "./CartForm";
import { Content } from "./Content";

const Page = () => {
  return (
    <div className="min-h-screen bg-stone-100">
      <Content />
      <div className="border-t-2 border-[#1e1b84] bg-stone-200/50">
        <CartForm />
      </div>
    </div>
  );
};

export default Page;
