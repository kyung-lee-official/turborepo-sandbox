import axios from "axios";
import { elysiaBaseUrl } from "@/lib/api-base-url";

const apiBaseUrl = elysiaBaseUrl();

export const conditionallyDownloadJsonOrBuffer = async () => {
  const res = await axios.get(
    "/techniques/conditionally-download-json-or-buffer",
    {
      baseURL: apiBaseUrl,
      /**
       * Crucial: Set responseType to "arraybuffer" to handle both JSON and binary data responses.
       */
      responseType: "arraybuffer",
    },
  );
  return res.data;
};
