"use client"

import Webcam from "react-webcam"
import { useSearchParams } from "react-router-dom"
import { IconX } from "@tabler/icons-react"
import { useRef, useEffect } from "react"
import { socket } from "../../../helpers/socket"

export default function CameraWindow() {
  const [searchParams] = useSearchParams()
  const videoRef = useRef(null)
  const imgRef = useRef(null)

  const type = searchParams.get("type")
  const deviceId = searchParams.get("deviceId")
  const rtspUrl = searchParams.get("url")
  const deviceName = searchParams.get("deviceName")

  useEffect(() => {
    if (type === "rtsp" && rtspUrl) {
      socket.emit("start_rtsp", { url: rtspUrl })

      const handleFrame = (data) => {
        if (imgRef.current) {
          imgRef.current.src = `data:image/jpeg;base64,${data.frame}`
        }
      }

      socket.on("video_frame", handleFrame)

      return () => {
        socket.emit("stop_rtsp")
        socket.off("video_frame", handleFrame)
      }
    }
  }, [type, rtspUrl])

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

      <div className="w-full h-full flex justify-center items-center bg-black">
        {type === "usb" && deviceId && (
          <Webcam
            audio={false}
            ref={videoRef}
            videoConstraints={{ deviceId }}
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        )}
        {type === "rtsp" && <img ref={imgRef} className="max-w-full max-h-full" />}
      </div>
    </div>
  )
}