import { useRef, useState } from "react";
import { IconExternalLink } from "@tabler/icons-react";
import CanvasRenderer from "../CanvasRenderer";
import { useFrameStream } from "../../helpers/VideoStreamProvider";
import { useSessionStorage } from "@mantine/hooks";
import Webcam from "react-webcam";

export default function CameraBox() {
  const [scale, setScale] = useState(1);
  const containerRef = useRef(null);
  const isResizing = useRef(false);
  const baseSize = { width: 444, height: 250 }; // Your default canvas size
  const canvasRef = useRef(null);
  const [pictureInPicture, setPictureInPicture] = useState(false);
  const { rtspUrl, cameraType } = useFrameStream();
  const [deviceId] = useSessionStorage({
    key: "deviceId",
    defaultValue: null,
  });
  const videoRef = useRef(null);
  const [isCameraBoxVisible, setIsCameraBoxVisible] = useState(false);

  window.ipcRenderer.onCameraWindowClose(() => setPictureInPicture(false));

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
    pictureInPicture
      ? window.ipcRenderer.closeWebcamWindow()
      : window.ipcRenderer.openWebcamWindow(
        deviceId,
        streamTrack.label,
        streamAspect,
        cameraType,
      )
    setPictureInPicture(!pictureInPicture)
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

    pictureInPicture
      ? window.ipcRenderer.closeWebcamWindow()
      : window.ipcRenderer.openWebcamWindow(
        streamId,
        streamName,
        streamAspect,
        cameraType
      );

    setPictureInPicture(!pictureInPicture);
  };

  return (
    <>
      {!pictureInPicture && cameraType !== "none" && isCameraBoxVisible === true && <div
        ref={containerRef}
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
            width={baseSize.width}
            height={baseSize.height}
            style={{ width: "100%", height: "100%" }}
          />
        )}

        {/* webcam stream */}
        {cameraType === "webcam" && (
          <Webcam
            ref={videoRef}
            audio={false}
            videoConstraints={{ deviceId }}
            className="max-w-[350px] w-[100%] @xl:max-w-[640px]"
            onUserMedia={() => console.log("Webcam stream ready")}
            onUserMediaError={() => setInvalidStream(true)}
          />
        )}

        {/* resize button */}
        <div
          className="resize-handle"
          onMouseDown={startResize}
          title="Scale video"
        />

        {/* popout button */}
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
      </div>}

      {/* hide button */}
      {!pictureInPicture &&
        <button
          className="absolute bottom-0 right-0 bg-falcongrey-900/60 p-1 rounded-[0.2em] z-50"
          onClick={() => setIsCameraBoxVisible(!isCameraBoxVisible)}
        >{isCameraBoxVisible ? `>>>` : `<<<`}</button>
      }
    </>
  );
}
