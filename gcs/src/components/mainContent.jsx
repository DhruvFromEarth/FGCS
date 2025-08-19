import { Route, Routes, useLocation } from "react-router-dom"

import Toolbar from "./toolbar/toolbar"
import SettingsModal from "./settingsModal"
import { Commands } from "./spotlight/commandHandler"

// Wrappers
import SingleRunWrapper from "./SingleRunWrapper"
import { SettingsProvider } from "../helpers/settingsProvider"
import VideoStreamProvider from "../helpers/VideoStreamProvider"

// Routes
import FLA from "../fla"
import Graphs from "../graphs"
import Video from "../video"
import Missions from "../missions"
import Params from "../params"
import Config from "../config"
import CameraWindow from "./dashboard/popout/webcam"
import RtspCanvasPage from "./dashboard/popout/RtspCanvasPage"
import Dashboard from "../dashboard"

// Redux
import { store } from "../redux/store"
import { Provider } from "react-redux"
import { ErrorBoundary } from "react-error-boundary"
import ErrorBoundaryFallback from "./error/errorBoundary"

export default function AppContent() {
  // Conditionally render UI so the webcam route is literally just a webcam
    const popoutCondition = useLocation().pathname === "/webcam" || useLocation().pathname.toLowerCase().startsWith("/rtsp");

  return (
    <SettingsProvider>
      <VideoStreamProvider>
      <SingleRunWrapper>
        {!popoutCondition && <Toolbar />}
        <ErrorBoundary fallbackRender={ErrorBoundaryFallback}>
          <SettingsModal />
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/video" element={<Video />} />
            <Route path="/missions" element={<Missions />} />
            <Route path="/graphs" element={<Graphs />} />
            <Route path="/params" element={<Params />} />
            <Route path="/config" element={<Config />} />
            <Route path="/webcam" element={<CameraWindow />} />
            <Route path="/rtsp" element={<RtspCanvasPage />} />
            <Route
              path="/fla"
              element={
                <Provider store={store}>
                  <FLA />
                </Provider>
              }
            />
            <Route path="/missions" element={<Missions />} />
          </Routes>
          {!popoutCondition && <Commands />}
        </ErrorBoundary>
      </SingleRunWrapper>
      </VideoStreamProvider>
    </SettingsProvider>
  )
}
