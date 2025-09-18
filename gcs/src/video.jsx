/*
 * Video Settings Screen.
 *
 * Allows the user to connect to video source or change video settings.
 */

// Base imports
import React, { useCallback, useEffect, useState, useRef } from 'react'

// 3rd Party Imports
import { ResizableBox } from "react-resizable";

// Custom component
import Layout from "./components/layout"
import CanvasRenderer from "./components/CanvasRenderer"

// Mantine
import { useSessionStorage } from "@mantine/hooks"
import { Select } from "@mantine/core"

// Helper
import Webcam from "react-webcam"
import { IconVideoOff } from "@tabler/icons-react"
import { socket } from "./helpers/socket"
import { useFrameStream } from "./helpers/VideoStreamProvider"

export default function Video() {
  // Camera devices
  const [deviceId, setDeviceId] = useSessionStorage({
    key: "deviceId",
    defaultValue: null,
  })

  const { cameraType, setCameraType } = useFrameStream()
  const { rtspUrl, setRtspUrl } = useFrameStream();

  const videoRef = useRef(null)

  const [devices, setDevices] = useState([])
  const [invalidStream, setInvalidStream] = useState(false)
  const [pictureInPicture, setPictureInPicture] = useState(false)
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

  // "video stream stopped" will print after "starting video stream..." in console, async await has no effect here.
  const handleStart = () => {
    handleStop(); // Stop any existing stream before starting a new one
    socket.emit('start-stream', rtspUrl);
    setRerunUseEffect(rerunUseEffect + 1);
  };

  const handleStop = () => {
    socket.emit('stop-stream');
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
      {/* Banner for under development */}
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
              allowDeselect={false}
            />

            {/* //console.log all useStates */}
            {/* {console.log("deviceId :", deviceId, "cameraType :", cameraType, "rtspurl :", rtspUrl, "pictureInPicture :", pictureInPicture, "rerunUseEffect :", rerunUseEffect)} */}

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
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      setRtspUrl(event.currentTarget.value);
                      handleStart();
                      console.log("cameratype :", cameraType);
                    }
                  }}
                  className="w-full border border-gray-500 p-1 rounded mb-2"
                />
                <p>press Enter to start streaming.</p><br />

                {/* {console.log("frame render")} */}
                <p>preview : </p>
                <CanvasRenderer
                  width={640}
                  height={350}
                  className="max-w-[350px] w-[100%] @xl:max-w-[640px]"
                />

              </div>
            ) : (cameraType === "webcam") ? (
              <div className="relative">

                <p>preview : </p>
                <Webcam
                  onUserMedia={() => setInvalidStream(false)}
                  ref={videoRef}
                  audio={false}
                  videoConstraints={{ deviceId: deviceId }}
                  className="max-w-[350px] w-[100%] @xl:max-w-[640px]"
                  onUserMediaError={() => setInvalidStream(true)}
                />

                {/* Overlay invalid stream message if video stream failed to be created */}
                {invalidStream && (
                  <div className="flex justify-center items-center absolute top-10 right-0 w-[100%] h-[100%] bg-falcongrey-700">
                    <div className="flex flex-col items-center h-[75%] justify-center">
                      <IconVideoOff size={"50%"} />
                      <p className="">No video stream available</p>
                    </div>
                  </div>
                )}

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