import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/app/data-fetching/tanstack-query/queryClient";
import { del, get, post } from "@/lib/fetcher";
import { AliyunOssQK } from "./query-keys";

export const Item = (props: any) => {
  const { file } = props;

  const signatureQuery = useQuery({
    queryKey: ["aliyun-oss-file-signature", file.name],
    queryFn: async () => {
      return post<{ url?: string }>(
        "/api/aliyun-oss/get-download-signed-url",
        {
          fileName: file.name,
          method: "GET",
        },
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    },
  });

  const downloadMutation = useMutation({
    mutationFn: async () => {
      const url = signatureQuery.data as unknown as string;
      const blob = await get<Blob>(url, { responseType: "blob" });
      const objectUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return {
        name: file.name,
        url,
      };
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return del<unknown>("/api/aliyun-oss/delete-file", {
        params: { filename: file.name },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [AliyunOssQK.ALIYUN_OSS_FILE_LIST_QUERY_KEY],
      });
    },
  });

  return (
    <div className="flex items-center justify-between gap-2 rounded-md bg-neutral-200 p-2">
      <div>{file.name}</div>
      <div className="flex items-center gap-2">
        <button
          className="cursor-pointer rounded bg-blue-400 px-2 py-1 text-white hover:bg-blue-500"
          onClick={() => {
            downloadMutation.mutate();
          }}
        >
          Download
        </button>
        <button
          className="cursor-pointer rounded bg-red-500 px-2 py-1 text-white hover:bg-red-600"
          onClick={() => {
            deleteMutation.mutate();
          }}
        >
          Delete
        </button>
      </div>
    </div>
  );
};
