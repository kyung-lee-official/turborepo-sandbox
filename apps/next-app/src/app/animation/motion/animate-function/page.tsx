import FromTo from "./FromTo";
import MotionValue from "./MotionValue";
import UseAnimate from "./UseAnimate";

const Block = ({ children }: any) => {
  return (
    <div className="flex w-fit flex-col gap-2 rounded-lg bg-neutral-100 p-4">
      {children}
    </div>
  );
};

const Page = () => {
  return (
    <div className="flex flex-col gap-4 p-4">
      <Block>
        <h1>From, To (Imperative Value)</h1>
        <FromTo />
      </Block>
      <Block>
        <h1>Motion Value (Imperative Value)</h1>
        <MotionValue />
      </Block>
      <Block>
        <h1>Element or Selector</h1>
        <UseAnimate />
      </Block>
    </div>
  );
};

export default Page;
