import dayjs from "dayjs";
import { jwtDecode } from "jwt-decode";
import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { CookieKey } from "../cookie-keys";

type LayoutProps = {
  children: ReactNode;
};

type DecodedToken = {
  actor_id: string;
  actor_type: string;
  app_metadata: Record<string, any>;
  auth_identity_id: string;
  iat: number;
  exp: number;
  user_metadata: Record<string, any>;
};

const layout = async (props: LayoutProps) => {
  const { children } = props;

  /* read cookies - access any cookie by name */
  const cookieStore = await cookies();
  /* default to "us" if undefined */
  const customerFPToken = cookieStore.get(CookieKey.CUSTOMER_TOKEN)?.value;

  if (!customerFPToken) {
    return <div>{children}</div>;
  }
  /* decode token with base64 */
  const decoded = jwtDecode(customerFPToken) as DecodedToken;

  return (
    <div>
      <div className="border-b border-dashed p-4">
        <div className="wrap-anywhere">
          Signed in customer: {customerFPToken}
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="border px-1">actor_id: {decoded.actor_id}</div>
          <div className="border px-1">actor_type: {decoded.actor_type}</div>
          <div className="border px-1">
            auth_identity_id: {decoded.auth_identity_id}
          </div>
          <div className="border px-1">
            iat: {dayjs(decoded.iat * 1000).format("YYYY-MM-DD HH:mm:ss")}
          </div>
          <div className="border px-1">
            exp: {dayjs(decoded.exp * 1000).format("YYYY-MM-DD HH:mm:ss")}
          </div>
        </div>
      </div>
      {children}
    </div>
  );
};

export default layout;
