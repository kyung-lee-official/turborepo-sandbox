import type { ReactNode } from "react";
import { AdminMeilisearchNav } from "./AdminMeilisearchNav";

type LayoutProps = {
  children: ReactNode;
};

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-stone-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 md:flex-row md:items-start">
        <aside className="w-full shrink-0 border-[#1e1b84] border-b-2 border-dashed pb-4 md:w-52 md:border-r md:border-b-0 md:pr-4 md:pb-0">
          <AdminMeilisearchNav />
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
};

export default Layout;
