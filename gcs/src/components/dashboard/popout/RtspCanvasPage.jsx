/*
 * Popout of RTSP camera.
 */

import { IconX } from "@tabler/icons-react";
import CanvasRenderer from "../../CanvasRenderer";

export default function RtspCanvasPage() {

  const width = 640;
  const height = 350;

  return (
    <div className="w-[100%] h-[100%] overflow-hidden">
      
      {/* Top bar for popout*/}
      <div className="flex flex-row items-center justify-between bg-falcongrey-800 h-7 allow-drag">
        <div className="text-slate-400 px-2 overflow-hidden text-ellipsis">
          RTSP
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

      <CanvasRenderer
        width={width}
        height={height}
        style={{ display: "block", height: "100%", width: "100%", objectFit: "contain" }}
      />
    </div>
  );
}
