/* 
  Tabs section. This will be a part of the resizable info box located in the bottom half. This
  contains tabs like data, action, missions, and camera.
*/

// 3rd Party Imports
import { Tabs } from "@mantine/core"

// Tab Components
import ActionTabsSection from "./tabsSectionTabs/actionTabsSection"
import MissionTabsSection from "./tabsSectionTabs/missionTabsSection"
import DataTabsSection from "./tabsSectionTabs/dataTabsSection"
import PreFlightChecklistTab from "./tabsSectionTabs/preFlightChecklistSection"

// Redux
import { useSelector } from "react-redux"
import {
  selectAircraftType,
  selectNavController,
} from "../../redux/slices/droneInfoSlice"
import { selectConnectedToDrone } from "../../redux/slices/droneConnectionSlice"

export default function TabsSection({ currentFlightModeNumber }) {
  const connected = useSelector(selectConnectedToDrone)
  const aircraftType = useSelector(selectAircraftType)
  const navControllerOutputData = useSelector(selectNavController)

  return (
    <Tabs defaultValue="data">
      <Tabs.List className="!overflow-x-scroll !flex-nowrap">
        <Tabs.Tab value="data">Data</Tabs.Tab>
        <Tabs.Tab value="actions">Actions</Tabs.Tab>
        <Tabs.Tab value="mission">Mission</Tabs.Tab>
        {/* <Tabs.Tab value="camera">Camera</Tabs.Tab> */}
        <Tabs.Tab value="preFlightChecklist">Pre-Flight Checklist</Tabs.Tab>
      </Tabs.List>

      {/* Tab Panels */}
      <DataTabsSection tabPadding="pt-6 pb-4" />

      <ActionTabsSection
        connected={connected}
        tabPadding="pt-6 pb-4"
        currentFlightModeNumber={currentFlightModeNumber}
        aircraftType={aircraftType}
      />

      <MissionTabsSection
        connected={connected}
        tabPadding="pt-6 pb-4"
        navControllerOutputData={navControllerOutputData}
        currentFlightModeNumber={currentFlightModeNumber}
        aircraftType={aircraftType}
      />

      {/* <CameraTabsSection tabPadding="pt-6 pb-4" /> */}

      <PreFlightChecklistTab tabPadding="pt-6 pb-4" />
    </Tabs>
  )
}

export const NoConnectionMsg = ({ message }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <p className="text-white-800 px-6 text-center">{message}</p>
    </div>
  )
}
