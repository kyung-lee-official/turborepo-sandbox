import Link from "next/link";
import type { ReactNode } from "react";
import { Airbnb } from "./chart/visx/Icons";

const Block = ({
  title,
  list,
  children,
}: {
  title: string | ReactNode;
  list: { link: string; text: string | ReactNode }[];
  children?: ReactNode;
}) => {
  return (
    <div className="flex flex-col gap-3 rounded-lg bg-white/50 p-6">
      <h1 className="text-xl">{title}</h1>
      {children}
      <div className="flex flex-col">
        {list.map((item) => {
          return (
            <Link key={item.link} href={item.link} className="hover:underline">
              {item.text}
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default function Home() {
  return (
    <main className="grid min-h-svh grid-cols-1 gap-6 bg-linear-to-br from-cyan-500/60 to-purple-500/60 p-10 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      <Block
        title="Home"
        list={[
          { link: "/", text: "home" },
          { link: "/cors-test", text: "CORS Test" },
        ]}
      />
      <Block
        title="Security"
        list={[
          {
            link: "/security/http-only-cookies",
            text: "HTTP Only Cookies Test",
          },
        ]}
      />
      <Block
        title="Server-Sent Events"
        list={[
          {
            link: "/sse/server-sent-event",
            text: "Server-Sent Event",
          },
        ]}
      />
      <Block
        title="Animation | AnimeJS"
        list={[
          {
            link: "/animation/animejs/anime-basic",
            text: "anime basic",
          },
          {
            link: "/animation/animejs/chitubox-logo-stroke-dashoffset",
            text: "chitubox-logo-stroke-dashoffset",
          },
          {
            link: "/animation/animejs/hover",
            text: "hover",
          },
          {
            link: "/animation/animejs/lemon-drop",
            text: "lemon drop",
          },
          {
            link: "/animation/animejs/line-drawing",
            text: "line drawing",
          },
          {
            link: "/animation/animejs/requestanimationframe",
            text: "requestanimationframe",
          },
          {
            link: "/animation/animejs/stroke-dashoffset",
            text: "stroke-dashoffset",
          },
          {
            link: "/animation/animejs/svg-sphere",
            text: "svg sphere",
          },
          {
            link: "/animation/animejs/timeline",
            text: "timeline",
          },
        ]}
      />
      <Block
        title="Animation | Framer Motion"
        list={[
          {
            link: "/animation/framer-motion/animate-function",
            text: "animate function",
          },
          {
            link: "/animation/framer-motion/animatepresence",
            text: "AnimatePresence",
          },
          {
            link: "/animation/framer-motion/animatepresence-bug",
            text: "AnimatePresence bug",
          },
          {
            link: "/animation/framer-motion/animation",
            text: "animation",
          },
          {
            link: "/animation/framer-motion/buttons",
            text: "buttons",
          },
          {
            link: "/animation/framer-motion/chitubox-drop",
            text: "chitubox-drop",
          },
          {
            link: "/animation/framer-motion/clippath",
            text: "clippath",
          },
          {
            link: "/animation/framer-motion/gooey-effect",
            text: "gooey-effect",
          },
          {
            link: "/animation/framer-motion/layout-animation",
            text: "layout animation",
          },
          {
            link: "/animation/framer-motion/motion-path",
            text: "motion path",
          },
          {
            link: "/animation/framer-motion/theme-switch",
            text: "theme switch",
          },
          {
            link: "/animation/motion/use-scroll",
            text: "useScroll",
          },
          {
            link: "/animation/motion/use-scroll-page",
            text: "useScroll page",
          },
          {
            link: "/animation/framer-motion/variants",
            text: "variants",
          },
          {
            link: "/animation/motion/use-in-view",
            text: "useInView",
          },
        ]}
      />
      <Block
        title="Animation | keyframes"
        list={[
          {
            link: "/animation/keyframes/basic",
            text: "basic",
          },
          {
            link: "/animation/keyframes/tailwind",
            text: "tailwind",
          },
        ]}
      />
      <Block
        title="Animation | Lottie"
        list={[
          {
            link: "/animation/lottie/lottie-basic",
            text: "lottie basic",
          },
        ]}
      />
      <Block
        title={<del>Animation | React Spring</del>}
        list={[
          {
            link: "/animation/react-spring/basic-spring",
            text: "basic spring",
          },
          {
            link: "/animation/react-spring/usetransition",
            text: "useTransition",
          },
          {
            link: "/animation/react-spring/declaretive-vs-imperative",
            text: "declaretive vs imperative",
          },
          {
            link: "/animation/react-spring/chain",
            text: "chain",
          },
          {
            link: "/animation/react-spring/trail",
            text: "trail",
          },
        ]}
      >
        <Link
          href={"https://github.com/pmndrs/react-spring/issues/2146"}
          className={"underline"}
        >
          Bug #2146
        </Link>
      </Block>
      <Block
        title="Auth | Google OAuth2"
        list={[{ link: "/auth/google-oauth-2/vanilla", text: "vanilla" }]}
      />
      <Block
        title="CAPTCHA | Google reCAPTCHA v3"
        list={[
          {
            link: "/captcha/google-recaptcha-v3",
            text: "google reCAPTCHA v3",
          },
        ]}
      />
      <Block title="Casl" list={[{ link: "/casl/basic", text: "basic" }]} />
      <Block
        title={
          <div className="flex items-center gap-2">
            <div>Chart |</div> <Airbnb size={20} /> <div>Visx</div>
          </div>
        }
        list={[
          {
            link: "/chart/visx/bars",
            text: "bars",
          },
          {
            link: "/chart/visx/barstack",
            text: "barstack",
          },
          {
            link: "/chart/visx/pies",
            text: "pies",
          },
          {
            link: "/chart/visx/treemap/treemap-squarify",
            text: "treemap-squarify",
          },
        ]}
      />
      <Block
        title="Data Fetching"
        list={[
          {
            link: "/data-fetching/axios",
            text: "axios & qs",
          },
          {
            link: "/data-fetching/tanstack-query",
            text: "TanStack Query",
          },
        ]}
      />
      <Block
        title="Files"
        list={[
          {
            link: "/files/aliyun-oss",
            text: "aliyun oss upload and download",
          },
          {
            link: "/files/conditionally-download-json-or-buffer",
            text: "conditionally download json or buffer",
          },
          {
            link: "/files/file-transmit",
            text: "file transmit (upload and download)",
          },
          { link: "/files/image-cropper", text: "image cropper" },
          {
            link: "/files/modify-excel-before-upload",
            text: "modify excel before upload",
          },
          {
            link: "/files/file-transmit/upload-files-multi",
            text: "upload files (one by one in a loop)",
          },
          { link: "/files/tencent-cos", text: "tencent cos" },
          {
            link: "/files/upload-large-xlsx-to-database",
            text: "upload large xlsx to database",
          },
          {
            link: "/files/upload-multiple-excel",
            text: "compress and upload multiple excel files in individual inputs",
          },
          {
            link: "/files/upload-multiple-excel-single-input",
            text: "compress and upload multiple excel files in a single inputs",
          },
        ]}
      />
      <Block
        title="Javascript | React"
        list={[
          {
            link: "/js/react/array-map-caveat",
            text: "array map() caveat",
          },
          {
            link: "/js/react/component-overload",
            text: "Component Overload",
          },
          {
            link: "/js/react/falsy-value",
            text: "falsy value",
          },
          {
            link: "/js/react/setstate-union-type",
            text: "setState union type",
          },
          {
            link: "/js/react/context",
            text: "context",
          },
          {
            link: "/js/react/event-listener",
            text: "event listener",
          },
          {
            link: "/js/react/functional-update",
            text: "functional update",
          },
          {
            link: "/js/react/generics/arrow-component",
            text: "generics | arrow component",
          },
          {
            link: "/js/react/suspense",
            text: "Suspense",
          },
          {
            link: "/js/react/suspense-use-promise",
            text: "Suspense use promise",
          },
          {
            link: "/js/react/useeffect-order",
            text: "useEffect order",
          },
          {
            link: "/js/react/useeffect-timer",
            text: "useEffect timer",
          },
          { link: "/js/react/useref", text: "useRef" },
          { link: "js/react/usereducer", text: "useReducer" },
          { link: "/js/react/usetransition", text: "useTransition" },
          {
            link: "/js/react/resize-observer",
            text: "work with resize observer",
          },
        ]}
      />
      <Block
        title="Javascript | React Features"
        list={[
          {
            link: "/js/react-features/drag-and-drop",
            text: "drag and drop",
          },
        ]}
      />
      <Block
        title="Javascript | Vanilla"
        list={[{ link: "/js/vanilla/new-date", text: "new date" }]}
      />
      <Block
        title="Libraries"
        list={[{ link: "/libraries/local-library", text: "local library" }]}
      />
      <Block title="Medusa" list={[{ link: "/medusa", text: "Medusa" }]} />
      <Block
        title="NextJS"
        list={[
          {
            link: "/nextjs/data-crud",
            text: "data CRUD best practice",
          },
          {
            link: "/nextjs/image-onload",
            text: "image-onload",
          },
          {
            link: "/nextjs/usepathname",
            text: "usePathname",
          },
        ]}
      />
      <Block
        title="Search"
        list={[
          {
            link: "/search/orama",
            text: "orama",
          },
        ]}
      />
      <Block
        title="Payment"
        list={[
          {
            link: "/payment/paypal",
            text: "paypal",
          },
        ]}
      />
      <Block
        title="Styles | Ant Design"
        list={[
          {
            link: "/styles/ant-design/tables",
            text: "tables",
          },
        ]}
      />
      <Block
        title="Styles | Basic"
        list={[
          {
            link: "/styles/basic/aspect-ratio",
            text: "aspect-ratio",
          },
          {
            link: "/styles/basic/clippath",
            text: "clippath",
          },
          {
            link: "/styles/basic/gradient-text",
            text: "gradient text",
          },
          {
            link: "/styles/basic/conic-gradient",
            text: "conic gradient",
          },
          {
            link: "/styles/basic/css-translate",
            text: "css translate",
          },
          {
            link: "/styles/basic/image",
            text: "image",
          },
          {
            link: "/styles/basic/image/sharp",
            text: "sharp image processing",
          },
          {
            link: "/styles/basic/zoomable",
            text: "zoomable image or video",
          },
          {
            link: "/styles/basic/mix-blend-difference",
            text: "mix blend difference",
          },
          {
            link: "/styles/basic/overflow-x",
            text: "overflow-x",
          },
          {
            link: "/styles/basic/sticky",
            text: "sticky",
          },
          {
            link: "/styles/basic/svg-icon-inline-text",
            text: "svg icon inline text",
          },
          {
            link: "/styles/basic/text-ellipsis",
            text: "text ellipsis",
          },
          {
            link: "/styles/basic/tooltip",
            text: "tooltip",
          },
          {
            link: "/styles/basic/turing-fonts",
            text: "turing fonts",
          },
          {
            link: "/styles/basic/table",
            text: "table",
          },
        ]}
      />
      <Block
        title="Styles | reactflow.dev"
        list={[
          {
            link: "/styles/reactflow/tree-like",
            text: "tree like",
          },
        ]}
      />
      <Block
        title="Tables | tanstack-react-table"
        list={[
          {
            link: "/tables/tanstack-react-table/get-started",
            text: "get started",
          },
          {
            link: "/tables/tanstack-react-table/pivot-table-group-by",
            text: "pivot table group by",
          },
          {
            link: "/tables/tanstack-react-table/pivot-table-nested-rows",
            text: "pivot table nested rows",
          },
          {
            link: "/tables/tanstack-react-table/frozen-columns",
            text: "frozen columns",
          },
        ]}
      />
      <Block
        title="Virtualization"
        list={[
          {
            link: "/virtualization/tanstack-virtual/style-pattern",
            text: "style pattern",
          },
          {
            link: "/virtualization/tanstack-virtual/style-pattern-frozen-columns",
            text: "style pattern frozen columns",
          },
          {
            link: "/virtualization/tanstack-virtual",
            text: "tanstack virtual",
          },
          {
            link: "/virtualization/tanstack-virtual/plain-table",
            text: "plain table (for comparison)",
          },
          {
            link: "/virtualization/tanstack-virtual/colspan-rowspan",
            text: "colspan and rowspan",
          },
        ]}
      />
      <Block
        title="Styles | Modal (Portal)"
        list={[
          {
            link: "/styles/modal/modal-dialog",
            text: "traditional modal dialog",
          },
          {
            link: "/styles/modal/modal-dialog-example",
            text: "traditional modal dialog example",
          },
          {
            link: "/styles/modal/confirm-dialog",
            text: "confirm dialog",
          },
          {
            link: "/styles/modal/dialog",
            text: "html <dialog>",
          },
          {
            link: "/styles/modal/click-listener-in-a-modal",
            text: "click listener in a modal",
          },
        ]}
      />
      <Block
        title="Styles | Dropdown"
        list={[
          {
            link: "/styles/dropdown/basic",
            text: "basic",
          },
          {
            link: "/styles/dropdown/header-dropdown",
            text: "header dropdown",
          },
          {
            link: "/styles/dropdown/hover-dropdown",
            text: "hover dropdown",
          },
          {
            link: "/styles/dropdown/online-dropdown",
            text: "online dropdown",
          },
          {
            link: "/styles/dropdown/universal-dropdown",
            text: "universal dropdown",
          },
          {
            link: "/styles/dropdown/universal-dropdown-old",
            text: "universal dropdown old",
          },
        ]}
      />
      <Block
        title="Styles | Form and Input"
        list={[
          {
            link: "/styles/form-and-input/react-hook-form-submit",
            text: "react-hook-form submit",
          },
          {
            link: "/styles/form-and-input/zod-and-react-hook-form",
            text: "zod and react-hook-form",
          },
          {
            link: "/styles/form-and-input/zod-and-react-hook-form-discriminated-union",
            text: "zod and react-hook-form (discriminated union)",
          },
          {
            link: "/styles/form-and-input/zod-and-tanstack-form",
            text: "zod and tanstack-form",
          },
          {
            link: "/styles/form-and-input/integer-input",
            text: "Integer Input",
          },
          {
            link: "/styles/form-and-input/decimal-input",
            text: "Decimal Input",
          },
          {
            link: "/styles/date/date-picker",
            text: "Date Picker",
          },
          {
            link: "/styles/date/date-range-picker",
            text: "Date Range Picker",
          },
        ]}
      />
      <Block
        title="Styles | Layout"
        list={[
          {
            link: "/styles/layout/header-flexbox",
            text: "header flexbox",
          },
          {
            link: "/styles/layout/flexbox-overflow-x",
            text: "flexbox-overflow-x",
          },
          {
            link: "/styles/layout/flexbox-overflow-y",
            text: "flexbox-overflow-y",
          },
          {
            link: "/styles/layout/grid",
            text: "grid",
          },
        ]}
      />
      <Block
        title="Styles | Menu"
        list={[
          {
            link: "/styles/menu/navigation-menu/navigation-menu-1",
            text: "navigation menu 1",
          },
          {
            link: "/styles/menu/navigation-menu/navigation-menu-2",
            text: "navigation menu 2",
          },
          {
            link: "/styles/menu/navigation-menu/cat1/navigation-menu-3",
            text: "navigation menu 3",
          },
          {
            link: "/styles/menu/navigation-menu/cat1/navigation-menu-4",
            text: "navigation menu 4",
          },
          {
            link: "/styles/menu/context-menu",
            text: "context menu",
          },
          {
            link: "/styles/menu/left-click-menu",
            text: "left click menu (popover)",
          },
        ]}
      />
      <Block
        title="Styles | Tailwind"
        list={[
          {
            link: "/styles/tailwind/animation",
            text: "animation",
          },
          {
            link: "/styles/tailwind/customized-theme",
            text: "customized theme",
          },
          {
            link: "/styles/tailwind/react-responsive",
            text: "react-responsive",
          },
        ]}
      />
      <Block
        title="Styles | Progress Gadgets"
        list={[
          {
            link: "/styles/gadgets/circular-progress",
            text: "circular progress",
          },
        ]}
      />
      <Block
        title="SVG"
        list={[
          {
            link: "/svg/mask",
            text: "mask",
          },
        ]}
      />
      <Block
        title="WebSocket"
        list={[
          {
            link: "/websocket/ws/demo",
            text: "Bun websocket + Browser Native WebSocket demo",
          },
          {
            link: "/websocket/socket.io/chat",
            text: "socket.io - chat",
          },
          {
            link: "/websocket/socket.io/dashboard",
            text: "socket.io - dashboard",
          },
          {
            link: "/websocket/upload-large-json",
            text: "upload large json",
          },
        ]}
      />
    </main>
  );
}
