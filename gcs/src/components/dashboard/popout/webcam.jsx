"use client"

import Webcam from "react-webcam"
import { useSearchParams } from "react-router-dom"
import { IconX } from "@tabler/icons-react"
import { useRef, useEffect } from "react"
import { socket } from "../../../helpers/socket"

export default function CameraWindow() {
  const [searchParams] = useSearchParams()
  const videoRef = useRef(null)
  // const imgRef = useRef(null)

  const type = searchParams.get("type")
  const deviceId = searchParams.get("deviceId")
  const rtspUrl = searchParams.get("url")
  const deviceName = searchParams.get("deviceName")
  const cameraType = searchParams.get("cameraType")
  console.log("type :", type, "deviceId :", deviceId, "rtspUrl :", rtspUrl, "deviceName :", deviceName, "cameraType :", cameraType)

  const canvasRef = useRef(null);
  const latestFrameRef = useRef(null);
  const secondLastFrameRef = useRef(null);
  const isRenderingRef = useRef(false);

  useEffect(() => {
    socket.on('connect', () => {
      console.log(`Connected: ${socket.id}`);
    });
    console.log("testing useEffect.");
    let counter = 0;
    const interval = setInterval(() => {
      console.log(`${counter} fps`);
      counter = 0;
    }, 1000);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const renderLoop = () => {
      if (!isRenderingRef.current && !(latestFrameRef.current === secondLastFrameRef.current)) {
        isRenderingRef.current = true;
        let frame = latestFrameRef.current;
        secondLastFrameRef.current = latestFrameRef.current;

        createImageBitmap(new Blob([frame]))
          .then((bitmap) => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
            bitmap.close(); // Free up memory
          })
          .catch(console.error)
          .finally(() => {
            isRenderingRef.current = false;
            frame = null; // Free up memory
            counter++;
          });
      }

      requestAnimationFrame(renderLoop);
    };

    requestAnimationFrame(renderLoop);

    socket.on('video-frame', (data) => {
      // Always replace old frame with the newest one
      latestFrameRef.current = data;
    });

    return () => {
      socket.off('video-frame');
    };
  }, []);

  const handleStart = () => {
    socket.emit('start-stream');
  };

  const handleStop = () => {
    socket.emit('stop-stream');
  };

  return (
    <div className="w-[100%] h-[100%] overflow-hidden">
      <div className="flex flex-row items-center justify-between bg-falcongrey-800 h-7 allow-drag">
        <div className="text-slate-400 px-2 overflow-hidden text-ellipsis">
          {deviceName}
        </div>
        <button
          className="group px-2 no-drag hover:bg-red-500 h-[100%]"
          onClick={() => window.ipcRenderer.closeWebcamWindow()}
        >
          <IconX
            stroke={2}
            size="20px"
            className="stroke-slate-400 group-hover:stroke-white"
          />
        </button>
      </div>

      <div>
        {cameraType === "webcam" && deviceId && (
          <Webcam
            audio={false}
            ref={videoRef}
            videoConstraints={{ deviceId }}
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        )}
        {cameraType === "rtsp" && <canvas ref={canvasRef} width="640" height="480" />}
      </div>
    </div>
  )
}