# app/video_stream.py
#put this file in the endpoints folder

import cv2
import base64
from time import sleep
from threading import Thread, Lock
from app import socketio
from flask import request

# Track stream states
stream_threads = {}       # rtsp_url: Thread
stream_locks = {}         # rtsp_url: Lock
stream_running = {}       # rtsp_url: bool
stream_clients = {}       # rtsp_url: set(client_ids)


def stream_rtsp(rtsp_url):
    cap = cv2.VideoCapture(rtsp_url)

    if not cap.isOpened():
        print(f"[RTSP] Failed to open stream: {rtsp_url}")
        return

    print(f"[RTSP] Streaming started: {rtsp_url}")
    while stream_running.get(rtsp_url, False):
        success, frame = cap.read()
        if not success:
            continue

        _, buffer = cv2.imencode('.jpg', frame)
        jpg_as_text = base64.b64encode(buffer).decode('utf-8')

        # Send to all connected clients for this stream
        for sid in stream_clients.get(rtsp_url, []):
            socketio.emit('video_frame', {'frame': jpg_as_text}, to=sid)

        sleep(1 / 30)

    cap.release()
    print(f"[RTSP] Stream ended: {rtsp_url}")


@socketio.on('start_rtsp')
def handle_start_rtsp(data):
    url = data.get('url')
    if not url:
        print("[RTSP] No URL provided")
        return

    sid = request.sid

    # Add client to stream list
    stream_clients.setdefault(url, set()).add(sid)

    # Start stream thread if not already running
    with stream_locks.setdefault(url, Lock()):
        if not stream_running.get(url):
            stream_running[url] = True
            thread = Thread(target=stream_rtsp, args=(url,), daemon=True)
            stream_threads[url] = thread
            thread.start()
            print(f"[RTSP] Stream thread started for {url}")


@socketio.on('stop_rtsp')
def handle_stop_rtsp():
    sid = request.sid
    for url, clients in stream_clients.items():
        if sid in clients:
            clients.remove(sid)
            if not clients:
                # No clients left, stop the stream
                print(f"[RTSP] No clients left for {url}, stopping stream")
                stream_running[url] = False

