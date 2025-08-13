/*
  Video Settings Screen.

  Allows the user to connect to video source or change video settings.
*/

// Base imports
import React, { useCallback , useEffect, useState , useRef } from 'react'

// 3rd Party Imports
// import { useLocalStorage, useSessionStorage } from "@mantine/hooks"
import { ResizableBox } from "react-resizable";

// Custom component and helpers
import Layout from "./components/layout"

export default function Video() {
  const [cameraType, setCameraType] = useState("none");
  const canvasRef = useRef(null);

  const handleStart = ({ type, url }) => {
    if (type === "rtsp") {
      // Start RTSP stream
      console.log(`Starting RTSP stream with URL: ${url}`);
    }
  } 
  
  const handleStop = () => {
    // Stop any current streams
  }

  const handleChange = (e) => {
    // Stop RTSP stream if switching to another type
    if (cameraType === "rtsp" && e.target.value !== "rtsp") {
      handleStop();
    }
    setCameraType(e.target.value);
  }

  return (
    <Layout currentPage="video">
      {/* Banner */}
      <div className="bg-falconred-700 text-white text-center"> Under Development. </div>

      <div className="flex justify-center">
        <ResizableBox
          width={350}
          height={400} // edit height for expand handle position
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
            <select
              id="video-source"
              className="border px-3 py-2 rounded"
              onChange={handleChange}
            >
              <option value="none">Disable Video Stream</option>
              <option value="rtsp">RTSP</option>
            </select>

            {/* conditionally render based off of selection */}
            {cameraType === "none" && (
              <p><b>Video stream is disabled.</b></p>
            )}
            {cameraType === "rtsp" && (
              <input 
              type="text"
              placeholder="Enter RTSP URL"
              className="border px-3 py-2 rounded"
              onChange={(e) => handleStart({ type: "rtsp", url: e.target.value })}
              />
            )}

            {/* Webcam feed */}
            <p>video preview :</p>
            <canvas ref={canvasRef} alt="Webcam Feed" className="bg-white max-w-[350px] w-[100%] @xl:max-w-[640px]" />
            {/* if no video, show "no video" */}

          </div>
        </ResizableBox>
      </div>
    </Layout>
  )
}