import dayjs from "dayjs";
import { jwtDecode } from "jwt-decode";
import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { PixelSurface } from "@/app/medusa/components/PixelSurface";
import { CookieKey } from "../cookie-keys";

type LayoutProps = {
  children: ReactNode;
};

type DecodedToken = {
  actor_id: string;
  actor_type: string;
  app_metadata: Record<string, unknown>;
  auth_identity_id: string;
  iat: number;
  exp: number;
  user_metadata: Record<string, unknown>;
};

const layout = async (props: LayoutProps) => {
  const { children } = props;

  const cookieStore = await cookies();
  const customerFPToken = cookieStore.get(CookieKey.CUSTOMER_TOKEN)?.value;

  if (!customerFPToken) {
    return <div className="min-h-screen bg-stone-100">{children}</div>;
  }

  const decoded = jwtDecode(customerFPToken) as DecodedToken;

  return (
    <div className="min-h-screen bg-stone-100">
      <PixelSurface
        shadow="sm"
        className="border-b-2 border-[#1e1b84] p-3 font-mono text-xs text-stone-800"
      >
        <p className="wrap-anywhere break-all text-[10px] leading-snug opacity-90">
          Signed-in customer token: {customerFPToken}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="border border-[#1e1b84] bg-white px-2 py-0.5 shadow-[2px_2px_0_0_#0f172a]">
            actor_id: {decoded.actor_id}
          </span>
          <span className="border border-[#1e1b84] bg-white px-2 py-0.5 shadow-[2px_2px_0_0_#0f172a]">
            actor_type: {decoded.actor_type}
          </span>
          <span className="border border-[#1e1b84] bg-white px-2 py-0.5 shadow-[2px_2px_0_0_#0f172a]">
            auth_identity_id: {decoded.auth_identity_id}
          </span>
          <span className="border border-[#1e1b84] bg-white px-2 py-0.5 shadow-[2px_2px_0_0_#0f172a]">
            iat: {dayjs(decoded.iat * 1000).format("YYYY-MM-DD HH:mm:ss")}
          </span>
          <span className="border border-[#1e1b84] bg-white px-2 py-0.5 shadow-[2px_2px_0_0_#0f172a]">
            exp: {dayjs(decoded.exp * 1000).format("YYYY-MM-DD HH:mm:ss")}
          </span>
        </div>
      </PixelSurface>
      {children}
    </div>
  );
};

export default layout;
