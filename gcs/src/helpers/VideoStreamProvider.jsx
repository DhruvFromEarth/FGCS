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

  useEffect(() => {
    const onFrame = (data) => {
      latestFrameRef.current = data;
    };

    socket.on("video-frame", onFrame);

    return () => {
      socket.off("video-frame", onFrame);
    };
  }, []);

  return (
    <FrameContext.Provider value={{ rtspUrl, setRtspUrl, cameraType, setCameraType, latestFrameRef }}>
      {children}
    </FrameContext.Provider>
  );
}
