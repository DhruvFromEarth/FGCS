/*
  Video Settings Screen.

  Allows the user to connect to video source or change video settings.
*/

// Base imports
import React, { useCallback, useEffect, useState, useRef } from 'react'

// 3rd Party Imports
import { ResizableBox } from "react-resizable";

// Custom component and helpers
import Layout from "./components/layout"
import CanvasRenderer from "./components/CanvasRenderer"

// Mantine
import { useSessionStorage } from "@mantine/hooks"
import { Tabs, Select } from "@mantine/core"

// Helper
import Webcam from "react-webcam"
import { IconExternalLink, IconVideoOff } from "@tabler/icons-react"
import { socket } from "./helpers/socket"

import { useFrameStream } from "./helpers/VideoStreamProvider"

export default function Video() {
  // Camera devices
  const [deviceId, setDeviceId] = useSessionStorage({
    key: "deviceId",
    defaultValue: null,
  })

  // window.ipcRenderer.onCameraWindowClose(() => setPictureInPicture(false))

  const { cameraType, setCameraType } = useFrameStream();
  //   const canvasRef = useRef(null);
  const videoRef = useRef(null)
  const [devices, setDevices] = useState([])

  const [streamLoaded, setStreamLoaded] = useState(false)
  const [invalidStream, setInvalidStream] = useState(false)
  const [pictureInPicture, setPictureInPicture] = useState(false)

  // const latestFrameRef = useRef(null);
  // const secondLastFrameRef = useRef(null);
  // const isRenderingRef = useRef(false);
  const rtspStreamRunningRef = useRef(false); //no use

  const { rtspUrl, setRtspUrl } = useFrameStream();
  const [rerunUseEffect, setRerunUseEffect] = useState(0);

  const handleDevices = useCallback(
    (mediaDevices) =>
      setDevices(mediaDevices.filter(({ kind }) => kind === "videoinput")),
    [setDevices],
  )

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then(handleDevices)
  }, [handleDevices])

  function toggleWebcamPopout() {
    const streamTrack = videoRef.current.video.srcObject.getTracks()[0]
    const streamAspect =
      streamTrack.getSettings().width / streamTrack.getSettings().height

    pictureInPicture
      ? window.ipcRenderer.closeWebcamWindow()
      : window.ipcRenderer.openWebcamWindow(
        deviceId,
        streamTrack.label,
        streamAspect,
      )
    setPictureInPicture(!pictureInPicture)
  }

  function onStreamLoaded() {
    setInvalidStream(false)
    setStreamLoaded(true)
  }

  // useEffect(() => {
  //   socket.on('connect', () => {
  //     console.log(`Connected: ${socket.id}`);
  //   });
  //   console.log("testing useEffect.");
  //   // let counter = 0;
  //   // const fpsinterval = setInterval(() => {
  //   //   console.log(`${counter} fps`);
  //   //   counter = 0;
  //   // }, 1000);

  //   const canvas = canvasRef.current;
  //   if (!canvas) return;
  //   const ctx = canvas.getContext('2d');

  //   const renderLoop = () => {
  //     if (!isRenderingRef.current && !(latestFrameRef.current === secondLastFrameRef.current)) {
  //       isRenderingRef.current = true;

  //       createImageBitmap(new Blob([latestFrameRef.current]))
  //         .then((bitmap) => {
  //           ctx.clearRect(0, 0, canvas.width, canvas.height);
  //           ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  //           bitmap.close(); // Free up memory
  //         })
  //         .catch(console.error)
  //         .finally(() => {
  //           isRenderingRef.current = false;
  //           // counter++;
  //         }
  //         );
  //       secondLastFrameRef.current = latestFrameRef.current;
  //     }
  //     requestAnimationFrame(renderLoop);
  //   };

  //   requestAnimationFrame(renderLoop);

  //   socket.on('video-frame', (data) => {
  //     // Always replace old frame with the newest one
  //     latestFrameRef.current = data;
  //   });

  //   return () => {
  //     socket.off('video-frame');
  //   };
  // }, [rerunUseEffect]);

  // "video stream stopped" will print after "starting video stream..." in console, async await has no effect here.
  const handleStart = () => {
    handleStop(); // Stop any existing stream before starting a new one
    socket.emit('start-stream', rtspUrl);
    rtspStreamRunningRef.current = true;
    setRerunUseEffect(rerunUseEffect + 1);
  };

  const handleStop = () => {
    socket.emit('stop-stream');
    rtspStreamRunningRef.current = false;
  };

  const handleChange = (value) => {
    // Stop RTSP stream if switching to another type
    if (cameraType === "rtsp" && value !== "rtsp") {
      handleStop();
    }
    setCameraType(value);

    if (value === "none") {
      setDeviceId(null);
      setRtspUrl("");
      handleStop();
    }
    if (value === "webcam" && devices.length > 0) {
      setDeviceId(devices[0].deviceId);
    }
    if (value === "rtsp") {
      setDeviceId("rtsp");
    }
  };

  return (
    <Layout currentPage="video">
      {/* Banner */}
      <div className="bg-falconred-700 text-white text-center"> Under Development. </div>

      <div className="flex justify-center">
        <ResizableBox
          width={350}
          height={420} // edit height for extend handle position
          minConstraints={[250, 200]}
          maxConstraints={[600, 500]}
          resizeHandles={["e"]}
          axis="x"
          handle={
            <div className="w-4 h-4 bg-gray-600 hover:bg-red-500 cursor-w-resize absolute bottom-0 right-0 z-10"></div>
          }
          className="top-4"
        >
          {/* settings */}
          <div className="flex flex-col gap-4">
            <label htmlFor='video-source'>Video Source :</label>
            <Select
              placeholder="Select camera input"
              data={[
                { value: "none", label: "Disable Video Stream" },
                { value: "rtsp", label: "RTSP Camera" },
                ...devices.map((device) => {
                  return { value: "webcam", label: device.label }
                })
              ]}
              value={cameraType}
              onChange={handleChange}
              className={`w-[100%] max-w-[350px] @xl:max-w-[640px]`}
            />

            {/* //console.log all useStates */}
            {console.log("deviceId :", deviceId, "cameraType :", cameraType, "rtspurl :", rtspUrl, "pictureInPicture :", pictureInPicture, "rerunUseEffect :", rerunUseEffect)}

            {/* Camera feed */}
            {(cameraType === "rtsp") ? (

              <div className="relative">
                {/* check if we can this same div for both rtsp and webcam */}
                <input
                  type="text"
                  placeholder="Enter RTSP URL"
                  value={rtspUrl}
                  onChange={(event) => {
                    setRtspUrl(event.currentTarget.value);
                    // handleStart(); //creating multiple requests
                    console.log("cameratype :", cameraType, "rtspStreamRunningRef :", rtspStreamRunningRef.current);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      setRtspUrl(event.currentTarget.value);
                      handleStart();
                      console.log("cameratype :", cameraType, "rtspStreamRunningRef :", rtspStreamRunningRef.current);
                    }
                  }}
                  className="w-full border border-gray-500 p-1 rounded mb-2"
                />
                <p>press Enter to start streaming.</p><br />

                {console.log("frame render")}
                <p>preview : </p>
                <CanvasRenderer
                  width={640}
                  height={350}
                  className="max-w-[350px] w-[100%] @xl:max-w-[640px]"
                />

                {/* <canvas ref={canvasRef} alt="rtsp cam Feed" className="bg-gray-500 max-w-[350px] w-[100%] @xl:max-w-[640px]" /> */}
              </div>

            ) : (cameraType === "webcam") ? (
              <div className="relative"> {/* write a logic to conditionally render webcam or canvas to use other function of webcam like pip and error etc. */}
                <p>preview : </p>
                <Webcam
                  onUserMedia={() => onStreamLoaded()}
                  ref={videoRef}
                  audio={false}
                  videoConstraints={{ deviceId: deviceId }}
                  className="max-w-[350px] w-[100%] @xl:max-w-[640px]"
                  onUserMediaError={() => setInvalidStream(true)}
                />
                {/* Overlay black background instead of conditionally rendering webcam to prevent reloading stream */}
                {/* {pictureInPicture && (
                  <div className="absolute top-0 right-0 w-[100%] h-[100%] bg-black" />
                )} */}

                {/* Overlay invalid stream message if video stream failed to be created */}
                {invalidStream && (
                  <div className="flex justify-center items-center absolute top-10 right-0 w-[100%] h-[100%] bg-falcongrey-700">
                    <div className="flex flex-col items-center h-[75%] justify-center">
                      <IconVideoOff size={"50%"} />
                      <p className="">No video stream available</p>
                    </div>
                  </div>
                )}
                {/* {streamLoaded && !pictureInPicture && !invalidStream && (
                  <button
                    className="absolute top-2 right-2 bg-falcongrey-900/60 p-1 rounded-[0.2em]"
                    onClick={() => toggleWebcamPopout()}
                  >
                    <IconExternalLink
                      stroke={2}
                      className="stroke-slate-200 size-5"
                    />
                  </button>
                )} */}
              </div>
            ) : (
              <div className="flex justify-center items-center">
                <IconVideoOff size={"10%"} />
                <p className="text-falcongrey-1 pl-2">Stream disabled.</p>
              </div>
            )}

          </div>
        </ResizableBox>
      </div>
    </Layout>
  )
}