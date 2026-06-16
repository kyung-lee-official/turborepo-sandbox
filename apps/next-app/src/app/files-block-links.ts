export const filesBlockLinks = [
  {
    link: "/files/aliyun-oss",
    text: "aliyun oss upload and download",
    description:
      "Upload to Aliyun OSS via a signed PUT URL from a Next.js API route, then list and download objects from the bucket.",
  },
  {
    link: "/files/conditionally-download-json-or-buffer",
    text: "conditionally download json or buffer",
    description:
      "Nest randomly returns JSON (200) or an XLSX error report (422). Shows arraybuffer handling and downloading a file from an error response.",
  },
  {
    link: "/files/file-transmit",
    text: "file transmit (upload and download)",
    description:
      "Basic Nest multipart upload and download patterns with progress tracking (single file, blob, and multi-file variants).",
  },
  {
    link: "/files/image-cropper",
    text: "image cropper",
    description:
      "Pick an image, pan and zoom inside a circular crop area, then save locally or upload the cropped result to Tencent COS.",
  },
  {
    link: "/files/modify-excel-before-upload",
    text: "modify excel before upload",
    description:
      "Read an Excel file with ExcelJS in the browser, convert cell A1 from YYYY-MM-DD to ISO8601, then upload the modified workbook to Nest.",
  },
  {
    link: "/files/file-transmit/upload-files-multi",
    text: "upload files (one by one in a loop)",
    description:
      "Event-attachment UI: load existing files from the server, then upload each new file sequentially with per-file progress and preview.",
  },
  {
    link: "/files/tencent-cos",
    text: "tencent cos",
    description:
      "Tencent COS demos: direct browser upload with STS credentials, list bucket objects, signed URL download, plus a deprecated server-relay upload.",
  },
  {
    link: "/files/upload-large-xlsx-to-database",
    text: "upload large xlsx to database",
    description:
      "Large XLSX import: generate test files, upload to Nest, track background jobs via REST and Socket.IO, and download row-level error reports.",
  },
  {
    link: "/files/upload-multiple-excel",
    text: "compress and upload multiple excel files in individual inputs",
    description:
      "Two separate file inputs; pack both into a JSON archive, gzip-compress, and send one blob to Nest for server-side extraction.",
  },
  {
    link: "/files/upload-multiple-excel-single-input",
    text: "compress and upload multiple excel files in a single inputs",
    description:
      "One multiple file input; archive all selected Excel files, gzip-compress, and upload as a single blob to Nest.",
  },
] as const;
