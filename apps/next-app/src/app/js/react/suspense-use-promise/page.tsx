import { Suspense } from "react";
import { get } from "@/lib/fetcher";
import { Content } from "./Content";

const Page = async () => {
  /**
   * The `Content` component consumes a Promise via React's `use()` hook and
   * expects an object shaped like `{ data: Todo[] }` (the old axios
   * `AxiosResponse.data` shape). We wrap `get()` so the returned promise
   * resolves to that shape.
   */
  const todosPromise = get<unknown[]>(
    "https://jsonplaceholder.typicode.com/todos/",
  ).then((data) => ({ data }));

  return (
    <div className="flex flex-col gap-4 p-10">
      <h1>React `use` with Suspense and Promise</h1>
      <p>
        Open the devtools network tab to see the requests, you will notice that
        no request is made on the client side, because the data is fetched on
        the server side. If you click the &quot;suspense&quot; doc, you will see
        the suspense loading.
      </p>
      <div className="w-96 bg-neutral-100">
        <Suspense fallback={<div>Loading...</div>}>
          <Content promise={todosPromise} />
        </Suspense>
      </div>
    </div>
  );
};

export default Page;
