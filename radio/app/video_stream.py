import cv2
from flask_socketio import emit
from . import socketio

def register_stream_handlers(socketio):
    cap = None

    @socketio.on('start-stream')
    def start_stream(url: str):
        print("video stream Starting...")
        nonlocal cap
        cap = cv2.VideoCapture(url)

        try:
            # check camera resolution
            success, frame = cap.read()
            if not success:
                print("Failed to read frame.")
                return

            height, width = frame.shape[:2]
            print(f"Camera Resolution: {width} x {height}")
            socketio.emit('camera-resolution', {'width': width, 'height': height})

            # stream
            while cap.isOpened():
                try:
                    success, frame = cap.read()
                    if not success:
                        break

                    # cv2.imshow('Video Stream', frame) # To see window of video being sent.
                    # Encode frame as JPEG
                    _, buffer = cv2.imencode('.jpg', frame)

                    # Emit frame over socket
                    socketio.emit('video-frame', buffer.tobytes())
                    cv2.waitKey(1)

                except cv2.error as e:
                    print(f"OpenCV error during stream: {e}")
                    break

        except cv2.error as e:
            print(f"OpenCV error: {e}")

        finally:
            if cap:
                cap.release()

    @socketio.on('stop-stream')
    def stop_stream():
        nonlocal cap
        if cap and cap.isOpened():
            cap.release()
        socketio.emit('video-frame', None)
        print("video stream stopped.")
