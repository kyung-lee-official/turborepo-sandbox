import axios from "axios";

export const conditionallyDownloadJsonOrBuffer = async () => {
  const res = await axios.get(
    "/techniques/conditionally-download-json-or-buffer",
    {
      baseURL: process.env.NEXT_PUBLIC_ELYSIA,
      /**
       * Crucial: Set responseType to "arraybuffer" to handle both JSON and binary data responses.
       */
      responseType: "arraybuffer",
    },
  );
  return res.data;
};
