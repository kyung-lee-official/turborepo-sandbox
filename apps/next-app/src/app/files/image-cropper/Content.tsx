"use client";

import axios from "axios";
import COS from "cos-js-sdk-v5";
import { add, multiply } from "mathjs";
import { useAnimate } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

const { NEXT_PUBLIC_BUCKET, NEXT_PUBLIC_REGION } = process.env;

const Content = () => {
  const draggableAreaSize: number[] = [568, 400];
  const canvasSize: number[] = [400, 400];
  const [imageSrc, setImageSrc] = useState<string>("");
  const [image, setImage] = useState<HTMLImageElement>(new Image());
  const [mappedImageSize, setMappedImageSize] = useState<number[]>([0, 0]);
  const [scale, setScale] = useState<number>(1);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  /**
   * Set the translation of the image.
   * Initially, the image is centered in the draggable area
   * and the translation is [0, 0].
   * If imageTranslation[0] is positive, the image will move to the right, and
   * vice versa.
   * If imageTranslation[1] is positive, the image will move down, and vice versa.
   */
  const [imageTranslation, setImageTranslation] = useState<number[]>([0, 0]);
  const [avatarRadius, setAvatarRadius] = useState<number>(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  /* Framer Motion */
  const [scope, animate] = useAnimate();

  const onFileChange = async (e: any) => {
    const file = e.target.files[0];
    setImageSrc(URL.createObjectURL(file));
    if (dialogRef.current) {
      dialogRef.current.showModal();
      await animate(dialogRef.current, { opacity: 1, scale: 1 });
    }
    if (inputRef.current) {
      /* This is to clear the input file value, so that the same file can be uploaded again */
      inputRef.current.value = "";
    }
  };

  const onPointerDown = (e: any) => {
    setIsDragging(true);
  };

  const onPointerMove = (e: any) => {
    if (isDragging) {
      /**
       * If drag to right, e.movementX > 0
       * If drag to left, e.movementX < 0
       */
      const imageTranslationX = Math.max(
        Math.min(
          imageTranslation[0] + e.movementX,
          (mappedImageSize[0]! * scale) / 2 - avatarRadius,
        ),
        (-mappedImageSize[0]! * scale) / 2 + avatarRadius,
      );
      const imageTranslationY = Math.max(
        Math.min(
          imageTranslation[1] + e.movementY,
          (mappedImageSize[1]! * scale) / 2 - avatarRadius,
        ),
        (-mappedImageSize[1]! * scale) / 2 + avatarRadius,
      );
      setImageTranslation([imageTranslationX, imageTranslationY]);
    }
  };

  const onPointerUp = useCallback((_e: any) => {
    setIsDragging(false);
  }, []);

  const onScaleChange = (e: any) => {
    const newScale = +e.target.value;
    setScale(newScale);
    /* Keep the image stay in the cropper area */
    setImageTranslation([
      Math.max(
        Math.min(
          imageTranslation[0]!,
          (mappedImageSize[0]! * scale) / 2 - avatarRadius,
        ),
        -(mappedImageSize[0]! * scale) / 2 + avatarRadius,
      ),
      Math.max(
        Math.min(
          imageTranslation[1]!,
          (mappedImageSize[1]! * scale) / 2 - avatarRadius,
        ),
        -(mappedImageSize[1]! * scale) / 2 + avatarRadius,
      ),
    ]);
  };

  useEffect(() => {
    if (dialogRef.current) {
      console.log("init");
      animate(dialogRef.current, { opacity: 0, scale: 0.9 });
    }
  }, [animate]);

  /* Set initial image info */
  useEffect(() => {
    if (canvasRef.current) {
      const context = canvasRef.current.getContext("2d");
      image.src = imageSrc;
      image.onload = () => {
        const imageWidth = image.width;
        const imageHeight = image.height;
        if (context) {
          context.clearRect(0, 0, canvasSize[0]!, canvasSize[1]!);
          if (imageWidth / imageHeight > 1) {
            /* Initial image width and height are equal to draggable area width */
            const mappedImageWidth =
              draggableAreaSize[1]! * (imageWidth / imageHeight);
            const mappedImageHeight = draggableAreaSize[1]!;
            setMappedImageSize([mappedImageWidth, mappedImageHeight]);

            const avtrRadius = draggableAreaSize[1]! / 2;
            setAvatarRadius(avtrRadius);
          } else {
            /* Initial image width and height are equal to draggable area height */
            const mappedImageWidth =
              draggableAreaSize[1]! * (imageWidth / imageHeight);
            const mappedImageHeight = draggableAreaSize[1];
            setMappedImageSize([mappedImageWidth, mappedImageHeight!]);

            const avtrRadius =
              (draggableAreaSize[1]! * (imageWidth / imageHeight)) / 2;
            setAvatarRadius(avtrRadius);
          }
        }
        setImageTranslation([0, 0]);
      };
    }

    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [imageSrc, image, onPointerUp]);

  useEffect(() => {
    /* Draw canvas */
    if (canvasRef.current) {
      const context = canvasRef.current.getContext("2d");
      if (context) {
        context.clearRect(0, 0, canvasSize[0]!, canvasSize[1]!);

        const imageToScaledImageRatio =
          image.width / (mappedImageSize[0]! * scale);
        const origin = multiply(imageTranslation, -1);
        const shiftRangeToPositive = add(
          add(origin, multiply(multiply(mappedImageSize, scale), 0.5)),
          -avatarRadius,
        );
        const correspondingPointOnOriginalImage: number[] = multiply(
          shiftRangeToPositive,
          imageToScaledImageRatio,
        ) as number[];
        console.log(
          "org",
          origin,
          "shft",
          shiftRangeToPositive,
          "pOnOri",
          correspondingPointOnOriginalImage,
        );
        const sw = avatarRadius * 2 * imageToScaledImageRatio;
        const sh = avatarRadius * 2 * imageToScaledImageRatio;
        context.drawImage(
          image,
          correspondingPointOnOriginalImage[0]!,
          correspondingPointOnOriginalImage[1]!,
          sw,
          sh,
          0,
          0,
          canvasSize[0]!,
          canvasSize[1]!,
        );
      }
    }
  }, [scale, imageTranslation, avatarRadius, image, mappedImageSize]);

  return (
    <div className="flex flex-col gap-6 p-10">
      <h1 className="font-bold text-4xl">Image Cropper</h1>
      <div className="flex justify-start">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg"
          onChange={onFileChange}
        />
      </div>
      <div>
        <h1 className="text-xl">Original Image</h1>
        <div>
          <img src={imageSrc} alt="" className="h-full" />
        </div>
      </div>
      <div>
        <h1 className="text-xl">Preview</h1>
        <h2 className="w-[600px] text-base">
          The preview can be abnormal if the image is scaled and the
          &quot;Cancel&quot; button is clicked. This is because the
          &quot;Cancel&quot; button reset scale to 1. In production environment,
          you don&apos;t need this preview canvas and all operations are done
          before the dialog is closed so you can ignore this issue.
        </h2>
        <div className="h-[400px] w-[400px] bg-slate-500">
          <canvas
            ref={canvasRef}
            width={canvasSize[0]}
            height={canvasSize[1]}
            /* Can set to hidden in production environment */
            className="rounded-md"
          ></canvas>
        </div>
      </div>
      <dialog
        ref={dialogRef}
        className="w-[600px] rounded-md bg-white/30 p-4 shadow-lg backdrop:bg-black/50 backdrop:[backdrop-filter:blur(1px)]"
        onClose={() => {
          setScale(1);
          if (dialogRef.current) {
            animate(dialogRef.current, { opacity: 0, scale: 0.9 });
          }
        }}
      >
        <div className="flex flex-col gap-8">
          <div className="relative flex h-[400px] w-full cursor-grab items-center justify-center rounded-md bg-slate-500">
            {/* The width of mappedImageSize can be larger than the draggable
						area, need an overflow-hidden container to hide the image outside the draggable area */}
            <div className="h-full w-full overflow-hidden rounded-md">
              <div
                className="rounded-md"
                style={{
                  width: `${mappedImageSize[0]}px`,
                  transform: `translateX(${
                    -(mappedImageSize[0]! - draggableAreaSize[0]!) / 2
                  }px)`,
                }}
              >
                <img
                  ref={imageRef}
                  src={imageSrc}
                  alt=""
                  width={`${mappedImageSize[0]!}px`}
                  /* When scaled, the value of imageTranslation doesn't match
									the actual pixel value, so need to divide by scale */
                  style={{
                    transform: `translateX(${
                      imageTranslation[0]! / scale
                    }px) translateY(${imageTranslation[1]! / scale}px)`,
                    scale: `${scale}`,
                  }}
                  className="select-none"
                  onDragStart={(e) => {
                    e.preventDefault();
                    return false;
                  }}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                />
              </div>
            </div>
            <div className="pointer-events-none absolute top-0 right-0 bottom-0 left-0 select-none">
              <svg
                viewBox="0 0 568 400"
                xmlns="http://www.w3.org/2000/svg"
                className="rounded-md"
                onDrag={(e) => {
                  e.preventDefault();
                  return false;
                }}
              >
                <rect
                  width="100%"
                  height="100%"
                  className="fill-gray-800/60 [mask:url(#circleMask)]"
                />
                <mask id="circleMask">
                  <rect width="100%" height="100%" fill="white" />
                  <circle
                    cx={"50%"}
                    cy={"50%"}
                    r={avatarRadius}
                    className="fill-black"
                  ></circle>
                </mask>
              </svg>
            </div>
            <div
              className="pointer-events-none absolute rounded-full border-4 border-gray-100"
              style={{
                width: `${avatarRadius * 2}px`,
                height: `${avatarRadius * 2}px`,
              }}
            ></div>
          </div>
          <div className="flex items-center justify-between gap-6">
            <svg
              viewBox="0 0 24 24"
              height="24"
              width="24"
              focusable="false"
              role="img"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M5 21h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2zm3-7 2.363 2.363L14 11l5 7H5l3-4z"></path>
            </svg>
            <input
              type="range"
              id="scale"
              name="scale"
              value={scale}
              min={1}
              max={3}
              step={0.01}
              className="w-full"
              onChange={onScaleChange}
            />
            <svg
              viewBox="0 0 24 24"
              height="32"
              width="32"
              focusable="false"
              role="img"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M5 21h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2zm3-7 2.363 2.363L14 11l5 7H5l3-4z"></path>
            </svg>
          </div>
          <div>
            <div>scale {scale}</div>
            <div>
              (scaled image width)/2 - avatarRadius{" "}
              {(mappedImageSize[0]! * scale) / 2 - avatarRadius}
            </div>
            <div>
              imageTranslation {imageTranslation[0]} {imageTranslation[1]}
            </div>
          </div>
          <div className="flex justify-between gap-4">
            <button
              className="rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
              onClick={() => {
                setImageTranslation([0, 0]);
                setScale(1);
              }}
            >
              Reset
            </button>
            <button
              className="rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
              onClick={() => {
                if (canvasRef.current) {
                  const link = document.createElement("a");
                  link.download = "image.png";
                  link.href = canvasRef.current.toDataURL();
                  link.click();
                }
              }}
            >
              Save to Local
            </button>
            <button
              className="rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
              onClick={async () => {
                const res = await axios.get(
                  `${
                    process.env.NEXT_PUBLIC_ELYSIA ?? "http://localhost:3002"
                  }/tencent-cos-objects/temporary-credential`,
                );
                const { tmpSecretId, tmpSecretKey, sessionToken } =
                  res.data.credentials;
                const cos = new COS({
                  SecretId: tmpSecretId,
                  SecretKey: tmpSecretKey,
                  SecurityToken: sessionToken,
                });
                if (canvasRef.current) {
                  const blob = await new Promise((resolve) => {
                    return canvasRef.current!.toBlob(resolve);
                  });
                  const cosRes = await cos.putObject({
                    Bucket: NEXT_PUBLIC_BUCKET as string,
                    Region: NEXT_PUBLIC_REGION as string,
                    Key: "app/avatar.png",
                    Body: blob as Blob,
                    // onProgress: function (progressData) {
                    // 	const percentCompleted = progressData.percent
                    // 		? (progressData.percent * 100).toFixed(2) +
                    // 		  "%"
                    // 		: "0%";
                    // 	setProgress(percentCompleted);
                    // },
                  });
                }
              }}
            >
              Upload to Tencent COS
            </button>
            <button
              className="rounded-md bg-white/30 px-4 py-2 hover:bg-white/20"
              onClick={() => {
                if (dialogRef.current) {
                  dialogRef.current.close();
                }
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
};

export default Content;
