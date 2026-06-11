/*
  Right hand side floating toolbar. This holds toggles like outside visibility mode and anchoring.
*/

// React
import { useRef, useState } from "react";
import Webcam from "react-webcam";

// 3rd Party Imports
import { Tooltip } from "@mantine/core";
import { useSessionStorage } from "@mantine/hooks";
import { IconExternalLink } from "@tabler/icons-react";

// Custom Components and Helper Functions
import CanvasRenderer from "../CanvasRenderer";
import { useFrameStream } from "../../helpers/VideoStreamProvider";
// import MapSection from "./map";

export default function CameraBox() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const isResizing = useRef(false);

  const baseSize = { width: 0, height: 0 }; // Your default window size 444 X 250.
  const { rtspUrl, cameraType, cameraResolution } = useFrameStream();
  const [deviceId] = useSessionStorage({
    key: "deviceId",
    defaultValue: null,
  });

  const [scale, setScale] = useState(1);
  const [popout, setPopout] = useState(false);
  const [isCameraBoxVisible, setIsCameraBoxVisible] = useState(cameraType !== "none");

  window.ipcRenderer.onCameraWindowClose(() => setPopout(false));

  const { width, height } = cameraResolution.current;
  baseSize.width = Math.floor(width / (height / 250));
  baseSize.height = 250;

  // Adjust for webcam
  cameraType === "webcam" && (baseSize.width = 350);

  const startResize = (e) => {
    e.preventDefault();
    isResizing.current = true;

    const startX = e.clientX;
    const startY = e.clientY;
    const startScale = scale;

    const onMouseMove = (e) => {
      if (!isResizing.current) return;

      const dx = startX - e.clientX;
      const dy = startY - e.clientY;
      const delta = Math.max(dx, dy); // Use the larger movement
      let newScale = startScale + delta / 450; // Adjust divisor for sensitivity
      const maxScale = Math.min(window.innerWidth / baseSize.width, 2);

      newScale = Math.min(Math.max(newScale, 0.5), maxScale); // Clamp scale
      console.log("maxScale", maxScale);
      setScale(newScale);
    };

    const onMouseUp = () => {
      isResizing.current = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  function toggleWebcamPopout() {
    const streamTrack = videoRef.current.video.srcObject.getTracks()[0]
    const streamAspect = streamTrack.getSettings().width / streamTrack.getSettings().height

    console.log("streamTrack.label, streamAspect", streamTrack.label, streamAspect)
    popout
      ? window.ipcRenderer.closeWebcamWindow()
      : window.ipcRenderer.openWebcamWindow(
        deviceId,
        streamTrack.label,
        streamAspect,
        cameraType,
      )
    setPopout(!popout)
  }

  const toggleRTSPcamPopout = () => {
    console.log("RTSP Camera Popout");

    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const width = canvas.width;
    const height = canvas.height;

    const streamAspect = width / height;
    const streamId = rtspUrl;
    const streamName = "RTSP";
    const cameraType = "RTSP";

    popout
      ? window.ipcRenderer.closeWebcamWindow()
      : window.ipcRenderer.openWebcamWindow(
        streamId,
        streamName,
        streamAspect,
        cameraType
      );

    setPopout(!popout);
  };

  return (
    <>
      {!popout && cameraType !== "none" && isCameraBoxVisible === true && <div
        className="absolute bottom-0 right-0 z-20 custom-handle-cam"
        style={{
          width: `${baseSize.width}px`,
          height: `${baseSize.height}px`,
          transform: `scale(${scale})`,
          transformOrigin: "bottom right", // scale from top-left corner by fixing(anchoring) bottom right.
        }}
      >
        {/* rtsp camera stream */}
        {cameraType === "rtsp" && (
          <CanvasRenderer
            ref={canvasRef}
            // width={baseSize.width}
            // height={baseSize.height}
            style={{ width: "100%", height: "100%" }}
          />
        )}

        {/* webcam stream */}
        {cameraType === "webcam" && (
          <Webcam
            ref={videoRef}
            audio={false}
            // width={baseSize.width}
            // height={baseSize.height}
            // mirrored={true}
            videoConstraints={{ deviceId }}
            className="max-w-[350px] w-[100%] @xl:max-w-[640px]"
            onUserMedia={() => console.log("Webcam stream ready")}
            // onUserMediaError={() => setInvalidStream(true)}
          />
        )}

        {/* resize button */}
        <Tooltip label="Resize">
          <div
            className="resize-handle bg-falcongrey-900/60"
            onMouseDown={startResize}
          />
        </Tooltip>

        {/* popout button */}
        <Tooltip label="Popout">
          <button
            className="absolute top-0 right-0 bg-falcongrey-900/60 p-1 rounded-[0.2em]"
            onClick={() => {
              if (cameraType === "webcam") {
                toggleWebcamPopout();
              }
              else if (cameraType === "rtsp") {
                toggleRTSPcamPopout();
              }
            }}
          >
            <IconExternalLink
              stroke={2}
              className="stroke-slate-200 size-5"
            />
          </button>
        </Tooltip>
      </div>}

      {/* hide button */}
      {!popout && cameraType !== "none" && <Tooltip label={isCameraBoxVisible ? "Hide Camera" : "Show Camera"}>
        <button
          className="absolute bottom-0 right-0 bg-falcongrey-900/60 p-1 rounded-[0.2em] z-50"
          onClick={() => setIsCameraBoxVisible(!isCameraBoxVisible)}
        >{isCameraBoxVisible ? `>>` : `<<`}</button>
      </Tooltip>
      }
    </>
  );
}
