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
  Modal,
  Progress,
  Tabs,
} from "@mantine/core"
import { IconInfoCircle, IconX } from "@tabler/icons-react"
import Layout from "./components/layout"
import FenceItemsTable from "./components/missions/fenceItemsTable"
import MissionItemsTable from "./components/missions/missionItemsTable"
import MissionStatistics from "./components/missions/missionStatistics"
import MissionsMapSection from "./components/missions/missionsMap"
import RallyItemsTable from "./components/missions/rallyItemsTable"
import Sidebar from "./components/missions/sideBar"
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
  selectTakeoffAdded,
  setTakeoffAdded,
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

// Tailwind styling
import resolveConfig from "tailwindcss/resolveConfig"
import tailwindConfig from "../tailwind.config"
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
  const takeoffAdded = useSelector(selectTakeoffAdded)

  // Need to keep a reference to the active tab to avoid stale closures
  const activeTabRef = useRef("mission")
  
  // File import handling
  const [importFile, setImportFile] = useState(null)
  const importFileResetRef = useRef(null)
  
  // Modal for mission progress
  const [missionProgressModalTitle, setMissionProgressModalTitle] = useState(
    "Mission progress update",
  )
  
  // Other states
  const [open, setOpen] = useState(false);  // TODO: set this up
  const [rtlAdded, setRtlAdded] = useState(false);
  const [zoomTarget, setZoomTarget] = useState(null);
  const [selectedOption, setSelectedOption] = useState('waypoint') // to check for which command to add marker.
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false)

  const [currentPage] = useSessionStorage({ key: "currentPage" })
  const [showWarningBanner, setShowWarningBanner] = useSessionStorage({
    key: "showWarningBanner",
    defaultValue: true,
  })
  const mapRef = useRef()
  const dropdownRef = useRef(null);
  const newMissionItemAltitude = 30 // TODO: Make this configurable

  // Send some messages when file is loaded
  useEffect(() => {
    dispatch(emitGetHomePosition())
    dispatch(emitGetTargetInfo())
  }, [currentPage])

  useEffect(() => {
    if (importFile)
      importMissionFromFile(importFile.path)
  }, [importFile])

  useEffect(() => {
    activeTabRef.current = activeTab
  }, [activeTab])

  useEffect(() => {
    const hasTakeoff = missionItems.some(item => item.command === 22);
    dispatch(setTakeoffAdded(hasTakeoff));
  }, [missionItems])

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

  // clearing previous zoom state for same zoom command again (as it uses useEffect).
  const handleZoomTarget = (target) => {
    setZoomTarget(null);
    setTimeout(() => setZoomTarget(target), 0);
  };

  function resetMissionProgressModalData() {
    dispatch(
      setMissionProgressData({
        message: "",
        progress: null,
      }),
    )
  }

  function addNewMissionItem(lat, lon, type = selectedOption) {
    // TODO: Turn isValidCoord to isValidLatLon
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

    // checking for valid coordinates
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

      if (!takeoffAdded && type === 'takeoff') {
        newItem.command = 22 // MAV_CMD_NAV_TAKEOFF
        newItem.x = (takeoffLat)
        newItem.y = (takeoffLon)
        newItem.z = newMissionItemAltitude
        dispatch(appendDrawingMissionItem(newItem))
        dispatch(setTakeoffAdded(true))
        setSelectedOption('waypoint')
      }
      else if (type === "waypoint") {
        newItem.command = 16 // MAV_CMD_NAV_WAYPOINT
        dispatch(appendDrawingMissionItem(newItem))
      }
      else if (type === "land") {
        const lastItem = missionItems[missionItems.length - 1];
        const lat = lastItem?.x ?? 0;
        const lon = lastItem?.y ?? 0;
        newItem.command = 21 // MAV_CMD_NAV_LAND
        newItem.x = lat
        newItem.y = lon
        newItem.z = 0
        dispatch(appendDrawingMissionItem(newItem))
      }
      else if (type === "return_to_launch") {
        const homeLat = homePosition?.lat ?? 0;
        const homeLon = homePosition?.lon ?? 0;

        if (!isFinite(homeLat) || !isFinite(homeLon)) {
          console.error("Invalid home position for RTL");
          return;
        }

        newItem.command = 20 // MAV_CMD_NAV_RETURN_TO_LAUNCH
        newItem.x = homeLat
        newItem.y = homeLon
        newItem.z = 0
        dispatch(appendDrawingMissionItem(newItem))
        setRtlAdded(true);
        if (!lockedMapInteractions) dispatch(toggleMapLock());
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
    setRtlAdded(false);
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
    // TODO: condition - if takeoff or rtl points are present in mission read, handle buttons accordingly.
  }

  function writeMissionToDrone() {
    console.log("Mission items:", missionItems)
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

    dispatch(setUnwrittenChanges({ ...unwrittenChanges, mission: true }))
  }

  function clearMissionItems() {
    if (activeTabRef.current === "mission") {
      dispatch(setTakeoffAdded(false))
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

      <div className="relative flex h-screen overflow-hidden">

        {/* Left Sidebar */}
        <Sidebar
          rtlAdded={rtlAdded}
          setRtlAdded={setRtlAdded}
          addNewMissionItem={addNewMissionItem}
          toggleMapLock={toggleMapLock}
          dispatch={dispatch}
          lockedMapInteractions={lockedMapInteractions}
          activeTab={activeTab}
          clearMissionItems={clearMissionItems}
          connected={connected}
          readMissionFromDrone={readMissionFromDrone}
          writeMissionToDrone={writeMissionToDrone}
          importFileResetRef={importFileResetRef}
          setImportFile={setImportFile}
          saveMissionToFile={saveMissionToFile}
          UnwrittenChangesWarning={UnwrittenChangesWarning}
          unwrittenChanges={unwrittenChanges}
          setZoomTarget={handleZoomTarget}
          setSelectedOption={setSelectedOption}
        />

        {/* Mission stats overlay */}
        <MissionStatistics/>

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
            zoomTarget={zoomTarget}
            setZoomTarget={setZoomTarget}
          />
        </div>

        {/* Right Sidebar */}
        {isRightSidebarOpen ? <div
          className="absolute bg-falcongrey/20 top-0 right-0 bottom-0 w-[250px] overflow-y-auto z-50" //bg-falconred-500
        >
          <Tabs
            value={activeTab}
            onChange={(value) => dispatch(setActiveTab(value))}
          >
            <Tabs.List grow
              className={'bg-falcongrey-TRANSLUCENT'}>
              <Tabs.Tab value="mission" color={tailwindColors.yellow[400]} onClick={() => setIsRightSidebarOpen(false)}>
                Mission &nbsp;▲
              </Tabs.Tab>
              {/* <Tabs.Tab value="fence" color={tailwindColors.blue[400]}>
                Fence &nbsp;▲
              </Tabs.Tab>
              <Tabs.Tab value="rally" color={tailwindColors.purple[400]}>
                Rally &nbsp;▲
              </Tabs.Tab> */}
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
        </div> : <div
          className="absolute w-[250px] bg-falcongrey-TRANSLUCENT top-0 right-0 text-center cursor-pointer py-2 text-sm hover:bg-falcongrey-700 rounded z-50"
          onClick={() => setIsRightSidebarOpen(true)}>
          Mission &nbsp;▼</div>
        }

      </div>

    </Layout>
  )
}
