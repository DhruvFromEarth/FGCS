# app/video_stream.py
#put this file in the endpoints folder

import cv2
import base64
import time
from flask_socketio import emit
from . import socketio


def register_stream_handlers(socketio):
    streamPlayer = False # NOT getting used
    cap = None
    @socketio.on('start-stream')
    def start_stream(url : str):
        print("video stream Starting...")
        nonlocal streamPlayer, cap
        streamPlayer = True
        cap = cv2.VideoCapture(url)

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
            success, frame = cap.read()
            if not success:
                break

            # cv2.imshow('Video Stream', frame) # to see window of video being sent.
            # Encode frame as JPEG and then base64
            _, buffer = cv2.imencode('.jpg', frame)
            # jpg_as_text = base64.b64encode(buffer).decode('utf-8')

            # Emit frame over socket
            socketio.emit('video-frame', buffer.tobytes())
            # time.sleep(0.001)  # ~30 fps
            cv2.waitKey(1)

        cap.release()

    @socketio.on('stop-stream')
    def stop_stream():
        nonlocal streamPlayer, cap
        streamPlayer = False
        if cap and cap.isOpened():
            cap.release()
        socketio.emit('video-frame', None)
        print("video stream stopped.")
