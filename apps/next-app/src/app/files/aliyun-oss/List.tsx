import { useQuery } from "@tanstack/react-query";
import { get } from "@/lib/fetcher";
import { Item } from "./Item";
import { AliyunOssQK } from "./query-keys";

export const List = () => {
  const query = useQuery({
    queryKey: [AliyunOssQK.ALIYUN_OSS_FILE_LIST_QUERY_KEY],
    queryFn: async () => {
      return get<unknown[]>("/api/aliyun-oss/get-file-list");
    },
  });

  return (
    <div className="space-y-2 border-neutral-300 border-b p-6">
      {query.data?.map((file: any) => (
        <Item key={file.name} file={file} />
      ))}
    </div>
  );
};
