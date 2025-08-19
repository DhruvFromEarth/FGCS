// RtspCanvasPage.tsx

import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { socket } from "../../../helpers/socket";
import { IconX } from "@tabler/icons-react";
import CanvasRenderer from "../../canvasRenderer";

export default function RtspCanvasPage() {
  // const canvasRef = useRef(null);
  const [params] = useSearchParams();

  const streamId = params.get("deviceId");
  const width = 640;
  const height = 350;

  const latestFrameRef = useRef(null);
  const secondLastFrameRef = useRef(null);
  const isRenderingRef = useRef(false);

  //   useEffect(() => {
  //     const canvas = canvasRef.current;
  //     if (!canvas || !streamId) return;

  //     canvas.width = width;
  //     canvas.height = height;

  //     const ctx = canvas.getContext("2d");

  //     const renderLoop = () => {
  //       if (!isRenderingRef.current && !(latestFrameRef.current === secondLastFrameRef.current)) {
  //         isRenderingRef.current = true;

  //         createImageBitmap(new Blob([latestFrameRef.current]))
  //           .then((bitmap) => {
  //             ctx.clearRect(0, 0, canvas.width, canvas.height);
  //             ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  //             bitmap.close();
  //           })
  //           .catch(console.error)
  //           .finally(() => {
  //             isRenderingRef.current = false;
  //             secondLastFrameRef.current = latestFrameRef.current;
  //           });
  //       }
  //       requestAnimationFrame(renderLoop);
  //     };

  //     requestAnimationFrame(renderLoop);

  //     socket.emit("start-stream", streamId);
  //     socket.on("video-frame", (data) => {
  //       latestFrameRef.current = data;
  //     });

  //     return () => {
  //       socket.emit("stop-stream");
  //       socket.off("video-frame");
  //     };
  //   }, [streamId]);

  return (
    <div className="w-[100%] h-[100%] overflow-hidden">
      <div className="flex flex-row items-center justify-between bg-falcongrey-800 h-7 allow-drag">
        <div className="text-slate-400 px-2 overflow-hidden text-ellipsis">
          RTSP
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
      <CanvasRenderer
        // ref={canvasRef}
        width={width}
        height={height}
        style={{ display: "block", height: "100%", width: "100%", objectFit: "contain" }}
      />
      {/* <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ display: "block", height: "100%", width: "100%", objectFit: "contain" }}
      /> */}
    </div>
  );
}
