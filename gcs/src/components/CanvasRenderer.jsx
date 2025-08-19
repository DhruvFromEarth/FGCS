import { useRef, useEffect, forwardRef } from "react";
import { useFrameStream } from "../helpers/VideoStreamProvider";

const CanvasRenderer = forwardRef(
  ({ width = 640, height = 350, className = "", ...rest }, forwardedRef) => {
    const internalRef = useRef(null);
    const canvasRef = forwardedRef || internalRef;

    const { latestFrameRef } = useFrameStream();
    const secondLastFrameRef = useRef(null);
    const isRenderingRef = useRef(false);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas || !latestFrameRef) return;

      const ctx = canvas.getContext("2d");

      const renderLoop = () => {
        if (
          !isRenderingRef.current &&
          latestFrameRef.current &&
          latestFrameRef.current !== secondLastFrameRef.current
        ) {
          isRenderingRef.current = true;

          createImageBitmap(new Blob([latestFrameRef.current]))
            .then((bitmap) => {
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
              bitmap.close();
            })
            .catch(console.error)
            .finally(() => {
              isRenderingRef.current = false;
              secondLastFrameRef.current = latestFrameRef.current;
            });
        }
        requestAnimationFrame(renderLoop);
      };

      requestAnimationFrame(renderLoop);
    }, [latestFrameRef]);

    return (
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className={`bg-black ${className}`}
        {...rest}
      />
    );
  }
);

export default CanvasRenderer;
