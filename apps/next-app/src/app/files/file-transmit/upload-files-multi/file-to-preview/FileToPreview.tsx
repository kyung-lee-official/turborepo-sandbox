import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { queryClient } from "@/app/data-fetching/tanstack-query/queryClient";
import { Item } from "@/app/files/file-transmit/upload-files-multi/Item";
import { elysiaBaseUrl } from "@/lib/api-base-url";
import { del } from "@/lib/fetcher";
import { getFileBlob, UploadFilesQK } from "../api";
import type { Preview } from "../UploadFiles";

const apiBaseUrl = elysiaBaseUrl();

export const FileToPreview = (props: { preview: Preview }) => {
  const { preview } = props;
  const { name } = preview;
  const [url, setUrl] = useState<string>();

  const fileBlobQuery = useQuery({
    queryKey: [UploadFilesQK.GET_FILE_BLOB, name],
    queryFn: async () => {
      const blob = await getFileBlob(name);
      setUrl(URL.createObjectURL(blob));
      return blob;
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  async function onDelete() {
    await del(`${apiBaseUrl}/techniques/delete-file/${name}`);
    queryClient.invalidateQueries({
      queryKey: [UploadFilesQK.GET_PREVIEW_FILELIST],
    });
  }

  return (
    <Item
      isLoading={fileBlobQuery.isPending || !url}
      name={name}
      src={url}
      question="Are you sure you want to delete this file?"
      onDelete={onDelete}
    />
  );
};
