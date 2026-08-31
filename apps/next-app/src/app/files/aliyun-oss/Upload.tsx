import { useMutation } from "@tanstack/react-query";
import { useRef } from "react";
import { useForm } from "react-hook-form";
import { queryClient } from "@/app/data-fetching/tanstack-query/queryClient";
import { post, put } from "@/lib/fetcher";
import { AliyunOssQK } from "./query-keys";

type FormValues = {
  files: FileList;
};

export const Upload = () => {
  const { register, handleSubmit } = useForm<FormValues>();
  const mutation = useMutation({
    mutationFn: async (files: FileList) => {
      if (!files || files.length === 0) {
        console.error("No files selected");
        return;
      }
      for (const file of files) {
        const signedUrl = await post<string>(
          "/api/aliyun-oss/get-upload-signed-url",
          {
            fileName: file.name,
            method: "PUT", // Use PUT for uploading files
          },
          {
            headers: { "Content-Type": "application/json" },
          },
        );
        console.log(signedUrl);
        // Direct PUT to the OSS signed URL — use the raw fetcher so we can
        // forward the binary body with the right Content-Type. The endpoint
        // is a pre-signed URL on OSS, not our own API, so no baseURL.
        await put(signedUrl, file, {
          headers: { "Content-Type": "application/octet-stream" },
          // The signed URL is absolute, so the fetcher treats it as such.
        });
      }
      return Array.from(files).map((file) => file.name);
    },
    onSuccess: (data) => {
      console.log("Uploaded files:", data);
      queryClient.invalidateQueries({
        queryKey: [AliyunOssQK.ALIYUN_OSS_FILE_LIST_QUERY_KEY],
      });
    },
  });

  const inputRef = useRef<HTMLInputElement>(null);

  const onSubmit = async () => {
    const files = inputRef.current?.files;
    if (files && files.length > 0) {
      mutation.mutate(files);
    }
  };

  return (
    <form className="space-y-4 border-neutral-300 border-b p-6">
      <input
        type="file"
        multiple
        ref={(e) => {
          register("files").ref(e);
          inputRef.current = e;
        }}
        className="block w-fit bg-neutral-300 px-2"
      />
      <button
        type="submit"
        className="rounded bg-blue-500 px-1.5 text-white"
        onClick={handleSubmit(onSubmit)}
      >
        {mutation.isPending ? "Uploading..." : "Upload"}
      </button>
    </form>
  );
};
