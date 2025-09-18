/*
 * Popout of Webcam.
 */

"use client"

import Webcam from "react-webcam"
import { useSearchParams } from "react-router-dom"
import { IconX } from "@tabler/icons-react"
import { useRef } from "react"

export default function CameraWindow() {
  const [searchParams] = useSearchParams()
  const deviceName = searchParams.get("deviceName")

  const videoRef = useRef(null);

  return (
    <div className="w-[100%] h-[100%] overflow-hidden">

      {/* Top bar for popout */}
      <div className="flex flex-row items-center justify-between bg-falcongrey-800 h-7 allow-drag">
        <div className="px-2 overflow-hidden text-ellipsis">
          {deviceName}
        </div>
        {/* Close button */}
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

      <Webcam
        audio={false}
        ref={videoRef}
        style={{ width: "100%", height: "100%", objectFit: "contain" }}
      />
    </div>
  )
}