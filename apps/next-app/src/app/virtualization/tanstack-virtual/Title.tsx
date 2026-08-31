import { useEffect, useState } from "react";
import { get } from "@/lib/fetcher";

export const Title = (props: { id: number }) => {
  const { id } = props;
  const loading = "Loading...";
  const [title, setTitle] = useState<string>(loading);

  useEffect(() => {
    let cancelled = false;
    async function mock() {
      try {
        const data = await get<{ title: string }>(
          `https://jsonplaceholder.typicode.com/posts/${id}`,
        );
        if (!cancelled) {
          setTitle(data.title);
        }
      } catch {
        if (!cancelled) {
          setTitle("Error fetching data");
        }
      }
    }
    mock();
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <div className={`${title === loading && "bg-amber-300"}`}>{title}</div>
  );
};
