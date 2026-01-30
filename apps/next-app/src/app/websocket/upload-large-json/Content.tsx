import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import pako from "pako";
import { useMemo, useState } from "react";
import { io } from "socket.io-client";
import { z } from "zod";

/* define the Zod schema for a single object */
const itemSchema = z.object({
  batchId: z.number(),
  id: z.number(),
  name: z.string(),
});
/* define the Zod schema for an array of objects */
const jsonSchema = z.array(itemSchema);

export const Content = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [progress, setProgress] = useState(0);

  const socket = useMemo(() => {
    const socket = io(
      `${process.env.NEXT_PUBLIC_NESTJS}/upload-large-json-progress`,
      {
        autoConnect: false,
      },
    );
    socket.on("connect", () => {
      console.log("Connected to server");
      setIsConnected(true);
    });
    socket.on("disconnect", () => {
      console.log("Disconnected from server");
      setIsConnected(false);
    });
    socket.on("message", (data: { message: string }) => {
      const { message } = data;
      console.log(message);
    });
    socket.on("saving-progress", (data: { progress: number }) => {
      const { progress } = data;
      setProgress(progress);
    });
    return socket;
  }, []);

  async function sendDataAsBinary(file: File) {
    /* read the file as text */
    const fileContent = await file.text();
    /* parse the JSON content */
    let parsedData: unknown;
    try {
      parsedData = JSON.parse(fileContent);
    } catch (error) {
      throw new Error("Invalid JSON format");
    }
    /* validate the JSON content using Zod */
    try {
      jsonSchema.parse(parsedData);
    } catch (error) {
      console.error("Validation failed:", error);
      throw new Error("JSON validation failed");
    }

    /* compress the JSON data using Gzip */
    const compressedData = pako.gzip(JSON.stringify(parsedData));
    console.log(`Size of compressed data: ${compressedData.length} bytes`);

    /* convert parsedData to blob for minimum size */
    const blob = new Blob([compressedData], {
      type: "application/gzip",
    });

    /* create a FormData object and append the file */
    const formData = new FormData();
    formData.append("data", blob);

    /* send the FormData to the backend */
    const res = await axios.post(`applications/upload-large-json`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      baseURL: process.env.NEXT_PUBLIC_NESTJS,
    });
    return res.data;
  }

  const mutation = useMutation({
    mutationFn: async (file: File) => {
      return await sendDataAsBinary(file);
    },
    onSuccess: () => {
      console.log("File uploaded successfully");
    },
    onError: (error) => {
      console.error("Error uploading file:", error);
    },
  });

  return (
    <div className="my-10 flex min-h-[70vh] flex-col items-start justify-start gap-4 bg-gray-200 p-10">
      <div>
        Test data:
        https://github.com/kyung-lee-official/typescript-sandbox/tree/main/src/mock-data-generator/generate-users
      </div>
      <input
        className="w-96 bg-neutral-50 p-2"
        type="file"
        accept=".json"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            setSelectedFile(file); // Store the selected file in state
          }
        }}
      />
      <button
        className="mt-4 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
        onClick={() => {
          if (selectedFile) {
            mutation.mutate(selectedFile); // Send the file when the button is clicked
            socket.connect();
          } else {
            console.error("No file selected");
          }
        }}
      >
        Send File
      </button>
      <div className="mt-4 flex items-center gap-6">
        <div
          className={`h-3 w-3 ${isConnected ? "bg-green-500" : "bg-gray-500"}
                    ${isConnected ? "shadow-[0_0_10px_#00ff00]" : ""}rounded-full duration-700`}
        ></div>
      </div>
      <div>Progress: {progress}</div>
    </div>
  );
};
