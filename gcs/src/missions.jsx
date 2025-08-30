/*
  The missions screen.
*/

// Base imports
import { useEffect, useRef, useState } from "react"

// 3rd Party Imports
import { useSessionStorage } from "@mantine/hooks"
import { ResizableBox } from "react-resizable"
import { v4 as uuidv4 } from "uuid"

// Custom component and helpers
import {
  ActionIcon,
  Button,
  Divider,
  FileButton,
  Modal,
  Progress,
  Tabs,
  Tooltip,
} from "@mantine/core"
import { IconInfoCircle, IconX } from "@tabler/icons-react"
import Layout from "./components/layout"
import FenceItemsTable from "./components/missions/fenceItemsTable"
import MissionItemsTable from "./components/missions/missionItemsTable"
import MissionStatistics from "./components/missions/missionStatistics"
import MissionsMapSection from "./components/missions/missionsMap"
import RallyItemsTable from "./components/missions/rallyItemsTable"
// import NoDroneConnected from "./components/noDroneConnected"
// import Sidebar from "./components/missions/sideBar"
import { coordToInt, intToCoord } from "./helpers/dataFormatters"
import { isGlobalFrameHomeCommand } from "./helpers/filterMissions"
import { MAV_FRAME_LIST } from "./helpers/mavlinkConstants"

// Redux
import { store } from "./redux/store"
import { useDispatch, useSelector } from "react-redux"
import {
  emitGetHomePosition,
  selectConnectedToDrone,
} from "./redux/slices/droneConnectionSlice"

// Tailwind styling
import resolveConfig from "tailwindcss/resolveConfig"
import tailwindConfig from "../tailwind.config"
import {
  appendDrawingFenceItem,
  appendDrawingMissionItem,
  appendDrawingRallyItem,
  deleteDrawingFenceItem,
  deleteDrawingMissionItem,
  deleteDrawingRallyItem,
  emitExportMissionToFile,
  emitGetCurrentMission,
  emitGetTargetInfo,
  emitImportMissionFromFile,
  emitWriteCurrentMission,
  selectActiveTab,
  selectLockedMapInteractions,
  toggleMapLock,
  selectDrawingFenceItems,
  selectDrawingMissionItems,
  selectDrawingRallyItems,
  selectHomePosition,
  selectMissionProgressData,
  selectMissionProgressModal,
  selectTargetInfo,
  selectUnwrittenChanges,
  setActiveTab,
  setDrawingFenceItems,
  setDrawingMissionItems,
  setDrawingRallyItems,
  setHomePosition,
  setMissionProgressData,
  setMissionProgressModal,
  setUnwrittenChanges,
  updateDrawingFenceItem,
  updateDrawingMissionItem,
  updateDrawingRallyItem,
} from "./redux/slices/missionSlice"
import { queueErrorNotification } from "./redux/slices/notificationSlice"
const tailwindColors = resolveConfig(tailwindConfig).theme.colors

const coordsFractionDigits = 7

function UnwrittenChangesWarning({ unwrittenChanges }) {
  const firstUnwrittenTab = Object.entries(unwrittenChanges).find(
    ([, changed]) => changed,
  )

  return (
    <>
      {firstUnwrittenTab && (
        <p className="text-red-400 text-center">
          You have unwritten {firstUnwrittenTab[0]} changes.
        </p>
      )}
    </>
  )
}

export default function Missions() {
  // Redux
  const dispatch = useDispatch()
  const connected = useSelector(selectConnectedToDrone)
  const targetInfo = useSelector(selectTargetInfo)
  const homePosition = useSelector(selectHomePosition)
  const activeTab = useSelector(selectActiveTab)
  const lockedMapInteractions = useSelector(selectLockedMapInteractions)

  // Mission items
  const missionItems = useSelector(selectDrawingMissionItems)
  const fenceItems = useSelector(selectDrawingFenceItems)
  const rallyItems = useSelector(selectDrawingRallyItems)
  const unwrittenChanges = useSelector(selectUnwrittenChanges)
  const missionProgressModalOpened = useSelector(selectMissionProgressModal)
  const missionProgressModalData = useSelector(selectMissionProgressData)
  const [takeoffAdded, setTakeoffAdded] = useState(false);
  const [rtlAdded, setRtlAdded] = useState(false);

  // Other states
  const [showWarningBanner, setShowWarningBanner] = useSessionStorage({
    key: "showWarningBanner",
    defaultValue: true,
  })

  // Need to keep a reference to the active tab to avoid stale closures
  const activeTabRef = useRef(activeTab)

  // File import handling
  const [importFile, setImportFile] = useState(null)
  const importFileResetRef = useRef(null)

  // Modal for mission progress
  const [missionProgressModalTitle, setMissionProgressModalTitle] = useState(
    "Mission progress update",
  )
  const [currentPage] = useSessionStorage({ key: "currentPage" })
  const mapRef = useRef()
  const newMissionItemAltitude = 30 // TODO: Make this configurable

  // Send some messages when file is loaded
  useEffect(() => {
    dispatch(emitGetHomePosition())
    dispatch(emitGetTargetInfo())
  }, [currentPage])

  useEffect(() => {
    if (importFile) {
      importMissionFromFile(importFile.path)
    }
  }, [importFile])

  useEffect(() => {
    activeTabRef.current = activeTab
  }, [activeTab])

  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close menu if clicked outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Update missionItems when home position changes - is used to move TAKEOFF and RTL points with home position.
  useEffect(() => {
    if (!homePosition || !Array.isArray(missionItems)) return;

    let shouldUpdate = false;

    const updatedItems = missionItems.map((item) => {
      if (item.command === 22 || item.command === 20) {
        const newX = homePosition.lat;
        const newY = homePosition.lon;

        if (item.x !== newX || item.y !== newY) {
          shouldUpdate = true;
          return { ...item, x: newX, y: newY };
        }
      }
      return item;
    });

    if (shouldUpdate) {
      updatedItems.forEach((item) => {
        if (item.command === 22 || item.command === 20) {
          dispatch(updateDrawingMissionItem(item));
        }
      });
    }
  }, [homePosition, missionItems]);

  function resetMissionProgressModalData() {
    dispatch(
      setMissionProgressData({
        message: "",
        progress: null,
      }),
    )
  }

  function addNewMissionItem(lat, lon, type = "waypoint") {
    const isValidCoord = (val) =>
      typeof val === "number" && !isNaN(val)

    const isValidLatLon = (lat, lon) =>
      typeof lat === "number" &&
      typeof lon === "number" &&
      isFinite(lat) &&
      isFinite(lon) &&
      lat >= -90 && lat <= 90 &&
      lon >= -180 && lon <= 180;

    let takeoffLat = intToCoord(homePosition.lat);
    let takeoffLon = intToCoord(homePosition.lon);

    if (isValidLatLon(targetInfo.lat, targetInfo.lon)) {
      takeoffLat = targetInfo.lat;
      takeoffLon = targetInfo.lon;
    }

    if (!isValidLatLon(takeoffLat, takeoffLon)) {
      console.error("Invalid TAKEOFF lat/lon", takeoffLat, takeoffLon);
      return;
    }

    if (
      !Number.isFinite(homePosition?.lat) ||
      !Number.isFinite(homePosition?.lon)
    ) {
      console.error("Invalid home position", homePosition);
      return;
    }

    const newItem = {
      id: uuidv4(),
      seq: null,
      x: coordToInt(lat),
      y: coordToInt(lon),
      z: newMissionItemAltitude,
      frame: parseInt(
        Object.keys(MAV_FRAME_LIST).find(
          (key) =>
            MAV_FRAME_LIST[key] ===
            (activeTabRef.current === "fence"
              ? "MAV_FRAME_GLOBAL"
              : "MAV_FRAME_GLOBAL_RELATIVE_ALT"),
        ),
      ),
      param1: 0,
      param2: 0,
      param3: 0,
      param4: 0,
      current: 0,
      autocontinue: 1,
      target_component: targetInfo.target_component,
      target_system: targetInfo.target_system,
      mission_type: 0,
      mavpackettype: "MISSION_ITEM_INT",
    }

    // checking for valid coordinates - also can be used for return_to_launch
    if (activeTabRef.current === "mission") {
      const takeoffLat = isValidCoord(targetInfo.lat)
        ? targetInfo.lat
        : homePosition.lat
      const takeoffLon = isValidCoord(targetInfo.lon)
        ? targetInfo.lon
        : homePosition.lon

      if (!isValidCoord(takeoffLat) || !isValidCoord(takeoffLon)) {
        console.error(`Cannot add ${type} command: invalid lat/lon`)
        return
      }

      if (!takeoffAdded) {
        newItem.command = 22 // MAV_CMD_NAV_TAKEOFF
        newItem.x = (takeoffLat)
        newItem.y = (takeoffLon)
        newItem.z = newMissionItemAltitude
        dispatch(appendDrawingMissionItem(newItem))
        setTakeoffAdded(true)
      } else if (type === "waypoint") {
        newItem.command = 16 // MAV_CMD_NAV_WAYPOINT
        dispatch(appendDrawingMissionItem(newItem))
      } else if (type === "return_to_launch") {
        newItem.command = 20 // MAV_CMD_NAV_RETURN_TO_LAUNCH
        newItem.x = (homePosition.lat)
        newItem.y = (homePosition.lon)
        newItem.z = 0
        dispatch(appendDrawingMissionItem(newItem))
        setRtlAdded(true);
        lockedMapInteractions ? null : dispatch(toggleMapLock());
      }
      dispatch(setUnwrittenChanges({ ...unwrittenChanges, mission: true }))
    }
    else if (activeTabRef.current === "fence") {
      newItem.command = 5004
      newItem.mission_type = 1
      dispatch(appendDrawingFenceItem(newItem))
      dispatch(setUnwrittenChanges({ ...unwrittenChanges, fence: true }))
    } else if (activeTabRef.current === "rally") {
      newItem.command = 5100
      newItem.mission_type = 2
      dispatch(appendDrawingRallyItem(newItem))
      dispatch(setUnwrittenChanges({ ...unwrittenChanges, rally: true }))
    }
  }

  // function sendTakeoffCommand(altitude) {
  //   // // if (!targetInfo?.target_system || !targetInfo?.target_component) {
  //   // //   console.error("Missing target info for takeoff.",altitude);
  //   // //   dispatch(emitGetTargetInfo());
  //   // //   return;
  //   // // }
  //   // if (
  //   //   !Number.isFinite(homePosition?.lat) ||
  //   //   !Number.isFinite(homePosition?.lon)
  //   // ) {
  //   //   console.error("Invalid home position", homePosition);
  //   //   return;
  //   // }

  //   // console.log('Sending takeoff with lat/lng:', homePosition.lat, homePosition.lon, typeof homePosition.lat, typeof homePosition.lon);

  //   // const takeoffCommand = {
  //   //   command: 22, // MAV_CMD_NAV_TAKEOFF
  //   //   confirmation: 0,
  //   //   param1: 0,      // Minimum pitch (leave as 0)
  //   //   param2: 0,      // Empty
  //   //   param3: 0,      // Empty
  //   //   param4: 0,      // Yaw angle (0 = use current)
  //   //   param5: homePosition.lat ?? 0,      // Latitude
  //   //   param6: homePosition.lon ?? 0,      // Longitude
  //   //   param7: altitude, // Altitude (relative or global depending on frame)
  //   //   // target_system: targetInfo.target_system,
  //   //   // target_component: targetInfo.target_component,
  //   //   mavpackettype: "COMMAND_LONG",
  //   // };
  //   // dispatch(appendDrawingMissionItem(takeoffCommand));

  //   const isValidCoord = (val) =>
  //     typeof val === "number" && !isNaN(val)

  //   if (!takeoffAdded) {
  //     const takeoffLat = isValidCoord(targetInfo.lat)
  //       ? targetInfo.lat
  //       : homePosition.lat
  //     const takeoffLon = isValidCoord(targetInfo.lon)
  //       ? targetInfo.lon
  //       : homePosition.lon

  //     if (!isValidCoord(takeoffLat) || !isValidCoord(takeoffLon)) {
  //       console.error("Cannot add TAKEOFF command: invalid lat/lon")
  //       return
  //     }

  //     const takeoffCommand = {
  //       command: 22, // MAV_CMD_NAV_TAKEOFF
  //       x: coordToInt(takeoffLat), // param 5, 6, 7 isn't working here use x, y, z.
  //       y: coordToInt(takeoffLon),
  //       z: newMissionItemAltitude,
  //       confirmation: 0,
  //       param1: 0,      // Minimum pitch
  //       param2: 0,      // Empty
  //       param3: 0,      // Empty
  //       param4: 0,      // Yaw angle
  //       frame: parseInt(
  //         Object.keys(MAV_FRAME_LIST).find(
  //           (key) =>
  //             MAV_FRAME_LIST[key] ===
  //             (activeTabRef.current === "fence"
  //               ? "MAV_FRAME_GLOBAL"
  //               : "MAV_FRAME_GLOBAL_RELATIVE_ALT"),
  //         ),
  //       ),
  //       mavpackettype: "COMMAND_LONG",
  //     };
  //     dispatch(appendDrawingMissionItem(takeoffCommand))
  //     setTakeoffAdded(true)

  //     console.log("Sending Takeoff Command:", takeoffCommand);
  //   }
  // }

  // function addReturnToLaunch() {
  //   const rtlCommand = {
  //     command: 20, // MAV_CMD_NAV_RETURN_TO_LAUNCH
  //     confirmation: 0,
  //     param1: 0,
  //     param2: 0,
  //     param3: 0,
  //     param4: 0,
  //     target_component: targetInfo.target_component ?? 0,
  //     target_system: targetInfo.target_system ?? 0,
  //     mavpackettype: "COMMAND_LONG",
  //   };

  //   console.log("Sending RTL command:", rtlCommand);
  //   dispatch(appendDrawingMissionItem(rtlCommand));
  //   dispatch(setUnwrittenChanges({
  //     ...unwrittenChanges,
  //     mission: true,
  //   }));
  // }

  function createHomePositionItem() {
    if (!homePosition) {
      dispatch(queueErrorNotification("Home position is not set"))
      return
    }

    const newHomeItem = {
      id: uuidv4(),
      seq: 0, // Home position is always the first item
      x: homePosition.lat,
      y: homePosition.lon,
      z: homePosition.alt || 0,
      frame: parseInt(
        Object.keys(MAV_FRAME_LIST).find(
          (key) => MAV_FRAME_LIST[key] === "MAV_FRAME_GLOBAL",
        ),
      ),
      command: 16, // MAV_CMD_NAV_WAYPOINT
      param1: 0,
      param2: 0,
      param3: 0,
      param4: 0,
      current: 1, // Set as current waypoint
      autocontinue: 1,
      target_component: targetInfo.target_component,
      target_system: targetInfo.target_system,
      mission_type:
        activeTabRef.current === "mission"
          ? 0
          : activeTabRef.current === "fence"
            ? 1
            : activeTabRef.current === "rally"
              ? 2
              : 0, // Default to 0 (Mission type) if activeTab is unrecognized,
      mavpackettype: "MISSION_ITEM_INT",
    }

    return newHomeItem
  }

  function updateMissionItem(updatedMissionItem) {
    if (activeTabRef.current === "mission") {
      dispatch(updateDrawingMissionItem(updatedMissionItem))
    } else if (activeTabRef.current === "fence") {
      dispatch(updateDrawingFenceItem(updatedMissionItem))
    } else if (activeTabRef.current === "rally") {
      dispatch(updateDrawingRallyItem(updatedMissionItem))
    } else {
      return
    }

    dispatch(
      setUnwrittenChanges({
        ...unwrittenChanges,
        [activeTabRef.current]: true,
      }),
    )
  }

  function deleteMissionItem(missionItemId) {
    if (activeTabRef.current === "mission") {
      dispatch(deleteDrawingMissionItem(missionItemId))
    } else if (activeTabRef.current === "fence") {
      dispatch(deleteDrawingFenceItem(missionItemId))
    } else if (activeTabRef.current === "rally") {
      dispatch(deleteDrawingRallyItem(missionItemId))
    }

    dispatch(
      setUnwrittenChanges({
        ...unwrittenChanges,
        [activeTabRef.current]: true,
      }),
    )
  }

  function updateMissionItemOrder(missionItemId, indexIncrement) {
    function updateItemOrder(prevItems) {
      const currentIndex = prevItems.findIndex(
        (item) => item.id === missionItemId,
      )

      // Ensure the item exists and the swap is within bounds
      if (
        currentIndex === -1 ||
        (indexIncrement === -1 && currentIndex === 0) ||
        (indexIncrement === 1 && currentIndex === prevItems.length - 1)
      ) {
        return prevItems // No changes if out of bounds
      }

      // Calculate the new index
      const newIndex = currentIndex + indexIncrement

      // Create a copy of the items array
      const updatedItems = [...prevItems]

      // Swap the items
      const temp = updatedItems[currentIndex]
      updatedItems[currentIndex] = updatedItems[newIndex]
      updatedItems[newIndex] = temp

      // Update the seq values
      updatedItems[currentIndex] = {
        ...updatedItems[currentIndex],
        seq: currentIndex,
      }
      updatedItems[newIndex] = { ...updatedItems[newIndex], seq: newIndex }

      return updatedItems
    }

    if (activeTabRef.current === "mission") {
      dispatch(setDrawingMissionItems(updateItemOrder(missionItems)))
      dispatch(setUnwrittenChanges({ ...unwrittenChanges, mission: true }))
    } else if (activeTabRef.current === "fence") {
      dispatch(setDrawingFenceItems(updateItemOrder(fenceItems)))
      dispatch(setUnwrittenChanges({ ...unwrittenChanges, fence: true }))
    }
  }

  function readMissionFromDrone() {
    dispatch(emitGetCurrentMission())
    setMissionProgressModalTitle(`Reading ${activeTabRef.current} from drone`)
    resetMissionProgressModalData()
    dispatch(setMissionProgressModal(true))
    // condition - if takeoff or rtl points are present in mission read, handle buttons accordingly.
  }

  function writeMissionToDrone() {
    if (activeTabRef.current === "mission") {
      dispatch(emitWriteCurrentMission({ type: "mission", items: missionItems }))
    } else if (activeTabRef.current === "fence") {
      dispatch(emitWriteCurrentMission({ type: "fence", items: fenceItems }))
    } else if (activeTabRef.current === "rally") {
      dispatch(emitWriteCurrentMission({ type: "rally", items: rallyItems }))
    }
    setMissionProgressModalTitle(`Writing ${activeTabRef.current} to drone`)
    resetMissionProgressModalData()
    dispatch(setMissionProgressModal(true))
  }

  function importMissionFromFile(filePath) {
    dispatch(
      emitImportMissionFromFile({
        type: activeTabRef.current,
        file_path: filePath,
      }),
    )

    // Reset the import file after sending
    setImportFile(null)
    importFileResetRef.current?.()
  }

  async function saveMissionToFile() {
    // The options for the save dialog
    const options = {
      title: "Save the mission to a file",
      filters: [
        { name: "Waypoint Files", extensions: ["waypoints"] },
        { name: "All Files", extensions: ["*"] },
      ],
    }

    const result = await window.ipcRenderer.getSaveMissionFilePath(options)

    if (!result.canceled) {
      let items = []
      if (activeTabRef.current === "mission") {
        items = [...missionItems]
      } else if (activeTabRef.current === "fence") {
        items = [...fenceItems]

        const newHomeItem = createHomePositionItem()
        if (newHomeItem) {
          items.unshift(newHomeItem) // Add home item at the beginning
        }

        // Ensure all sequence values are updated
        items = items.map((item, index) => ({
          ...item,
          seq: index,
        }))
      } else if (activeTabRef.current === "rally") {
        items = [...rallyItems]

        const newHomeItem = createHomePositionItem()
        if (newHomeItem) {
          items.unshift(newHomeItem) // Add home item at the beginning
        }

        // Ensure all sequence values are updated
        items = items.map((item, index) => ({
          ...item,
          seq: index,
        }))
      }

      dispatch(
        emitExportMissionToFile({
          type: activeTabRef.current,
          file_path: result.filePath,
          items: items,
        }),
      )
    }
  }

  function updateMissionHomePosition(lat, lon) {
    const newHomePosition = {
      lat: Number.isInteger(lat) ? lat : coordToInt(lat),
      lon: Number.isInteger(lon) ? lon : coordToInt(lon),
      alt: 0.1,
    };

    // Update Redux state for home position
    dispatch(setHomePosition(newHomePosition));

    // Update TAKEOFF and RETURN_TO_LAUNCH mission items if present
    const updatedItems = missionItems.map((item) => {
      if (item.command === 22 || item.command === 20) {
        return {
          ...item,
          x: newHomePosition.lat,
          y: newHomePosition.lon,
        };
      }
      return item;
    });

    // Dispatch updates for modified items only
    updatedItems.forEach((item, index) => {
      if (
        (item.command === 22 || item.command === 20) &&
        (item.x !== missionItems[index]?.x || item.y !== missionItems[index]?.y)
      ) {
        dispatch(updateDrawingMissionItem(item));
      }
    });

    // Also update the first waypoint if it is a home position waypoint
    // if (missionItems.length > 0 && isGlobalFrameHomeCommand(missionItems[0])) {
    // Check if the first item is a home position command
    // const updatedMissionItems = [...missionItems]
    // updatedMissionItems[0] = {
    //   ...updatedMissionItems[0],
    //   x: newHomePosition.lat,
    //   y: newHomePosition.lon,
    // }
    // dispatch(setDrawingMissionItems(updatedMissionItems))
    // } else {
    // If the first item is not a home position command, add a new home position item
    // const newHomeMissionItem = {
    //   id: uuidv4(),
    //   seq: 0,
    //   x: newHomePosition.lat,
    //   y: newHomePosition.lon,
    //   z: 0.1,
    //   frame: parseInt(
    //     Object.keys(MAV_FRAME_LIST).find(
    //       (key) => MAV_FRAME_LIST[key] === "MAV_FRAME_GLOBAL",
    //     ),
    //   ),
    //   command: 16, // MAV_CMD_NAV_WAYPOINT
    //   param1: 0,
    //   param2: 0,
    //   param3: 0,
    //   param4: 0,
    //   current: 0,
    //   autocontinue: 1,
    //   target_component: targetInfo.target_component,
    //   target_system: targetInfo.target_system,
    //   mission_type: 0,
    //   mavpackettype: "MISSION_ITEM_INT",
    // }
    // dispatch(setDrawingMissionItems([newHomeMissionItem, ...missionItems]))

    dispatch(setUnwrittenChanges({ ...unwrittenChanges, mission: true }))
  }

  function clearMissionItems() {
    if (activeTabRef.current === "mission") {
      // Clear all mission items except the first if the first is a home position
      // dispatch(setDrawingMissionItems([]))
      setTakeoffAdded(false)
      setRtlAdded(false);
      if (
        missionItems.length > 0 &&
        isGlobalFrameHomeCommand(missionItems[0])
      ) {
        dispatch(setDrawingMissionItems([missionItems[0]]))
      } else {
        dispatch(setDrawingMissionItems([]))
      }
    } else if (activeTabRef.current === "fence") {
      dispatch(setDrawingFenceItems([]))
    } else if (activeTabRef.current === "rally") {
      dispatch(setDrawingRallyItems([]))
    }

    dispatch(
      setUnwrittenChanges({
        ...unwrittenChanges,
        [activeTabRef.current]: true,
      }),
    )
  }

  function addFencePolygon(newFenceItems) {
    let seqNumber =
      fenceItems.length > 0 ? fenceItems[fenceItems.length - 1].seq + 1 : 0

    const newFenceMissionItems = newFenceItems.map((item) => {
      const newFenceMissionItem = {
        id: item.id,
        seq: seqNumber,
        x: item.x,
        y: item.y,
        z: item.z,
        frame: parseInt(
          Object.keys(MAV_FRAME_LIST).find(
            (key) => MAV_FRAME_LIST[key] === "MAV_FRAME_GLOBAL_RELATIVE_ALT",
          ),
        ),
        command: item.command,
        param1: item.param1,
        param2: item.param2,
        param3: item.param3,
        param4: item.param4,
        current: 0,
        autocontinue: 1,
        target_component: targetInfo.target_component,
        target_system: targetInfo.target_system,
        mission_type: 1, // Fence type
        mavpackettype: "MISSION_ITEM_INT",
      }

      seqNumber++

      return newFenceMissionItem
    })

    dispatch(setDrawingFenceItems([...fenceItems, ...newFenceMissionItems]))
    dispatch(setUnwrittenChanges({ ...unwrittenChanges, fence: true }))
  }

  return (
    <Layout currentPage="missions">
      <Modal
        opened={missionProgressModalOpened}
        onClose={() => dispatch(setMissionProgressModal(false))}
        title={missionProgressModalTitle}
        closeOnClickOutside={true}
        closeOnEscape={false}
        withCloseButton={true}
        centered
        overlayProps={{
          backgroundOpacity: 0.55,
          blur: 3,
        }}
      >
        <div className="flex flex-col items-center justify-center mt-4">
          {missionProgressModalData.message && (
            <p className="text-center mb-2">
              {missionProgressModalData.message}
            </p>
          )}

          {missionProgressModalData.progress !== null &&
            missionProgressModalData.progress !== undefined && (
              <Progress
                color="lime"
                animated
                size="lg"
                transitionDuration={300}
                value={missionProgressModalData.progress * 100}
                className="w-full mx-auto my-auto"
              />
            )}
        </div>
      </Modal>

      {/* Banner to let people know that things are still under development */}
      {showWarningBanner && (
        <div className="bg-falconred-700 flex flex-row items-center justify-between w-full">
          <p className="text-white text-center flex-1">
            Missions is still under development so some features are still
            missing. If you find any bugs please report them to us.
          </p>
          <ActionIcon
            onClick={() => setShowWarningBanner(false)}
            variant="transparent"
            className="mr-2"
          >
            <IconX color="white" />
          </ActionIcon>
        </div>
      )}

      {/* banner - not connected to drone */}
      {!connected && (
        <div className="bg-white flex flex-row items-center justify-between w-full">
          <b className="text-falconred-700 text-center flex-1">
            You are not connected to the drone.
          </b>
        </div>
      )}

      {/* {connected ? ( */}
      <div className="flex flex-col h-screen overflow-hidden">
        <div className="flex flex-1 overflow-hidden">
          {/* Resizable Sidebar */}
          <ResizableBox
            width={200}
            height={Infinity}
            minConstraints={[200, Infinity]}
            maxConstraints={[600, Infinity]}
            resizeHandles={["e"]}
            axis="x"
            handle={
              <div className="w-2 h-full bg-falcongrey-900 hover:bg-falconred-500 cursor-col-resize absolute right-0 top-0 z-10"></div>
            }
            className="relative bg-falcongrey-800 overflow-y-auto"
          >
            <div className="flex flex-col gap-8 p-4">
              <div className="flex flex-col gap-4">
                <UnwrittenChangesWarning
                  unwrittenChanges={unwrittenChanges}
                />

                <Button
                  onClick={() => {
                    readMissionFromDrone()
                  }}
                  disabled={!connected}
                  className="grow"
                >
                  Read {activeTab}
                </Button>
                <Button
                  onClick={() => {
                    writeMissionToDrone()
                  }}
                  disabled={!connected}
                  className="grow"
                >
                  Write {activeTab}
                </Button>

                {/* custom buttons */}
                <div>
                  {/* file */}
                  <Button onClick={() => { }}>
                    File
                  </Button>
                  {/* takeoff */}
                  <Button
                    onClick={() => addNewMissionItem(0, 0, "takeoff")}
                    disabled={takeoffAdded}
                  >
                    Takeoff
                  </Button>
                  {/* toggle */}
                  <Button
                    onClick={() => dispatch(toggleMapLock())}
                    disabled={!takeoffAdded || rtlAdded}
                  >
                    {/* Map: {lockedMapInteractions ? 'Locked' : 'Unlocked'} */}
                    add waypoint: {lockedMapInteractions ? 'Locked' : 'Unlocked'}
                  </Button>
                  {/* return to launch */}
                  <Button
                    onClick={() => addNewMissionItem(0, 0, "return_to_launch")}
                    disabled={!takeoffAdded || rtlAdded}
                  >
                    Return to Launch
                  </Button>
                  {/* clear mission */}
                  <Button onClick={clearMissionItems}>
                    Clear {activeTab}
                  </Button>

                  {/* settings dropdown/menu */}
                  <select defaultValue="">
                    <option disabled value="">Settings</option>
                    <option value="option1">Option 1</option>
                    <option value="option2">Option 2</option>
                    <option value="option3">Option 3</option>
                  </select>

                  <div className="relative inline-block" ref={dropdownRef}>
                    <button
                      onClick={() => setOpen(!open)}
                      className="px-3 py-2 bg-falcongrey-700 rounded-md text-white"
                    >
                      Settings
                    </button>

                    {open && (
                      <div className="absolute left-0 mt-2 w-40 bg-falcongrey-700 rounded-md shadow-lg z-50 p-1">
                        <button
                          className="w-full text-left px-4 py-2 hover:bg-falcongrey-600 rounded"
                          onClick={() => {
                            console.log("Option 1 clicked");
                            setOpen(false);
                          }}
                        >
                          Option 1
                        </button>
                        <button
                          className="w-full text-left px-4 py-2 hover:bg-falcongrey-600 rounded"
                          onClick={() => {
                            console.log("Option 2 clicked");
                            setOpen(false);
                          }}
                        >
                          Option 2
                        </button>
                        <button
                          className="w-full text-left px-4 py-2 hover:bg-falcongrey-600 rounded"
                          onClick={() => {
                            console.log("Option 3 clicked");
                            setOpen(false);
                          }}
                        >
                          Option 3
                        </button>
                      </div>
                    )}
                  </div>
                </div>

              </div>
              <Divider className="my-1" />

              <div className="flex flex-col gap-4">
                <FileButton
                  resetRef={importFileResetRef}
                  onChange={setImportFile}
                  accept=".waypoints,.txt"
                  className="grow"
                >
                  {(props) => <Button {...props}>Import from file</Button>}
                </FileButton>
                <Button
                  onClick={() => {
                    saveMissionToFile()
                  }}
                  className="grow"
                >
                  Save to file
                </Button>
              </div>
              <Divider className="my-1" />

              <div className="flex flex-col gap-2">
                <p className="font-bold">
                  Home location{" "}
                  <span>
                    <Tooltip
                      className="inline"
                      label="The home location is written to a mission save file."
                    >
                      <IconInfoCircle size={20} />
                    </Tooltip>
                  </span>
                </p>
                <p>
                  Lat:{" "}
                  {intToCoord(homePosition?.lat).toFixed(
                    coordsFractionDigits,
                  )}
                </p>
                <p>
                  Lon:{" "}
                  {intToCoord(homePosition?.lon).toFixed(
                    coordsFractionDigits,
                  )}
                </p>
              </div>

              <Divider className="my-1" />

              <div className="flex flex-col gap-2">
                <MissionStatistics />
              </div>
            </div>
          </ResizableBox>

          {/* Main content area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Map area */}
            <div className="flex-1 relative">
              <MissionsMapSection
                passedRef={mapRef}
                missionItems={missionItems}
                fenceItems={fenceItems}
                rallyItems={rallyItems}
                markerDragEndCallback={updateMissionItem}
                addNewMissionItem={addNewMissionItem}
                updateMissionHomePosition={updateMissionHomePosition}
                clearMissionItems={clearMissionItems}
                addFencePolygon={addFencePolygon}
                activeTab={activeTab}
              />
            </div>

            {/* Resizable Bottom Bar */}
            <ResizableBox
              width={Infinity}
              height={300}
              minConstraints={[Infinity, 100]}
              maxConstraints={[Infinity, 400]}
              resizeHandles={["n"]}
              axis="y"
              handle={
                <div className="w-full h-2 bg-falcongrey-900 hover:bg-falconred-500 cursor-row-resize absolute top-0 left-0 z-10"></div>
              }
              className="relative bg-falcongrey-800 overflow-y-auto"
            >
              <Tabs
                value={activeTab}
                onChange={(value) => dispatch(setActiveTab(value))}
                className="mt-2"
              >
                <Tabs.List grow>
                  <Tabs.Tab
                    value="mission"
                    color={tailwindColors.yellow[400]}
                  >
                    Mission
                  </Tabs.Tab>
                  <Tabs.Tab value="fence" color={tailwindColors.blue[400]}>
                    Fence
                  </Tabs.Tab>
                  <Tabs.Tab value="rally" color={tailwindColors.purple[400]}>
                    Rally
                  </Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="mission">
                  <MissionItemsTable
                    updateMissionItem={updateMissionItem}
                    deleteMissionItem={deleteMissionItem}
                    updateMissionItemOrder={updateMissionItemOrder}
                  />
                </Tabs.Panel>
                <Tabs.Panel value="fence">
                  <FenceItemsTable
                    updateMissionItem={updateMissionItem}
                    deleteMissionItem={deleteMissionItem}
                    updateMissionItemOrder={updateMissionItemOrder}
                  />
                </Tabs.Panel>
                <Tabs.Panel value="rally">
                  <RallyItemsTable
                    updateRallyItem={updateMissionItem}
                    deleteRallyItem={deleteMissionItem}
                  />
                </Tabs.Panel>
              </Tabs>
            </ResizableBox>
          </div>
        </div>
      </div>
      {/* ) : (
        <NoDroneConnected />
      )} */}
    </Layout>
  )
}
