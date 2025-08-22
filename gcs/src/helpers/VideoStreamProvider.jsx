import { createContext, useContext, useRef, useState, useEffect } from "react";
import { socket } from "./socket";

const FrameContext = createContext(null);

export function useFrameStream() {
  return useContext(FrameContext);
}

export default function VideoStreamProvider({ children }) {
  const [rtspUrl, setRtspUrl] = useState("");
  const [cameraType, setCameraType] = useState("none");
  const latestFrameRef = useRef(null);
  const cameraResolution = useRef({});

  useEffect(() => {
    const onFrame = (data) => {
      latestFrameRef.current = data;
    };

    socket.on("video-frame", onFrame);

    socket.on("camera-resolution", (data) => {
      cameraResolution.current = data;
      console.log("Camera Resolution:", data);
    });

    return () => {
      socket.off("video-frame", onFrame);
      socket.off("camera-resolution");
    };
  }, []);

  return (
    <FrameContext.Provider value={{ rtspUrl, setRtspUrl, cameraType, setCameraType, latestFrameRef, cameraResolution }}>
      {children}
    </FrameContext.Provider>
  );
}
