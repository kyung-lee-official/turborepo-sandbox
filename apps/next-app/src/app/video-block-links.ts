export const videoBlockLinks = [
  {
    link: "/video/vfr-to-cfr",
    text: "VFR → CFR (mp4)",
    description:
      "Upload a VFR MP4; Nest runs ffmpeg in a BullMQ job to re-encode constant 30 fps, then download the result.",
  },
] as const;
