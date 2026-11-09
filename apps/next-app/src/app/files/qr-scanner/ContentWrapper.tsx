"use client";

import dynamic from "next/dynamic";

const DynamicContent = dynamic(() => import("./Content"), { ssr: false });

const ContentWrapper = () => {
  return <DynamicContent />;
};

export default ContentWrapper;
