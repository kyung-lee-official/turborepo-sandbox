import Pattern1 from "./Pattern1";
import Pattern2 from "./Pattern2";
import Pattern3 from "./Pattern3";
import Pattern4 from "./Pattern4";

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
        <h1>Basic Motion Path</h1>
        <a
          href="https://blog.noelcserepy.com/how-to-animate-svg-paths-with-framer-motion"
          className="underline"
        >
          How to Animate SVG Paths with Framer Motion
        </a>
        <p>
          1. Set the strokeDasharray to the full length of the path, in this
          case, &quot;867&quot;.
        </p>
        <p> 2. Animate the strokeDashoffset from full length to 0.</p>
        <Pattern1 />
      </Block>
      <Block>
        <h1>Motion Segment</h1>
        <Pattern2 />
      </Block>
      <Block>
        <h1>Arrow Along the Path</h1>
        <Pattern3 />
      </Block>
      <Block>
        <h1>Gradient Segment</h1>
        <Pattern4 />
      </Block>
    </div>
  );
};

export default Page;
