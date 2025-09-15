/*
  This component displays the row for a mission item in a table.
*/

import {
  ActionIcon,
  NumberInput,
  Select,
  TableTd,
  TableTr,
  Modal,
} from "@mantine/core"
import { IconArrowDown, IconArrowUp, IconTrash, IconChevronDown } from "@tabler/icons-react"
import { useEffect, useState, useRef } from "react"
import {
  coordToInt,
  getPositionFrameName,
  intToCoord,
} from "../../helpers/dataFormatters"
import {
  COPTER_MISSION_ITEM_COMMANDS_LIST,
  PLANE_MISSION_ITEM_COMMANDS_LIST,
} from "../../helpers/mavlinkConstants"

// Redux
import { useSelector } from "react-redux"
import { selectAircraftType } from "../../redux/slices/droneInfoSlice"

const coordsFractionDigits = 9

// for Information box - we will have to define which commands require which options in Information box
const commandsHavingAltitude = ['TAKEOFF', 'RETURN_TO_LAUNCH', 'LAND', 'WAYPOINT'];
const commandsHavingCoordinates = ['TAKEOFF', 'RETURN_TO_LAUNCH', 'LAND', 'WAYPOINT'];

export default function MissionItemsTableRow({
  missionItem,
  updateMissionItem,
  deleteMissionItem,
  updateMissionItemOrder,
  openItemId,
  handleItemClick,
}) {
  const aircraftType = useSelector(selectAircraftType);
  const [missionItemData, setMissionItemData] = useState(missionItem);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Update parent when internal state changes
  useEffect(() => {
    if (JSON.stringify(missionItem) !== JSON.stringify(missionItemData)) {
      updateMissionItem(missionItemData);
    }
  }, [missionItemData]);
  // Sync with parent changes (e.g., marker drag updates)
  useEffect(() => {
    if (JSON.stringify(missionItem) !== JSON.stringify(missionItemData)) {
      setMissionItemData(missionItem);
    }
  }, [missionItem]);

  function getDisplayCommandName(commandName) {
    if (commandName.startsWith("MAV_CMD_NAV_")) {
      commandName = commandName.replace("MAV_CMD_NAV_", "")
    } else if (commandName.startsWith("MAV_CMD_")) {
      commandName = commandName.replace("MAV_CMD_", "")
    }
    return commandName
  }

  function getAvailableCommands() {
    var commandsList = COPTER_MISSION_ITEM_COMMANDS_LIST
    if (aircraftType === 1) {
      commandsList = PLANE_MISSION_ITEM_COMMANDS_LIST
    }

    return Object.entries(commandsList).map(([key, value]) => ({
      value: key,
      label: getDisplayCommandName(value),
    }))
  }

  function updateMissionItemData(key, newVal) {
    setMissionItemData({
      ...missionItemData,
      [key]: newVal,
    })
  }

  function getCommandLabelById(commandId) {
    const commandsList =
      aircraftType === 1
        ? PLANE_MISSION_ITEM_COMMANDS_LIST
        : COPTER_MISSION_ITEM_COMMANDS_LIST;

    const commandName = commandsList[commandId];
    if (!commandName) return `Unknown (${commandId})`;

    return getDisplayCommandName(commandName);
  }

  function InformationBox({ command }) {
    const altitude = commandsHavingAltitude.includes(command);
    const coordinates = commandsHavingCoordinates.includes(command);

    const [tempAltitude, setTempAltitude] = useState(missionItemData.z ?? 0);
    const [tempLat, setTempLat] = useState(intToCoord(missionItemData.x));
    const [latError, setLatError] = useState(null);
    const [tempLng, setTempLng] = useState(intToCoord(missionItemData.y));
    const [lngError, setLngError] = useState(null);

    // Keep local input values in sync with latest missionItemData (from marker drag)
    useEffect(() => {
      setTempAltitude(missionItemData.z ?? 0);
      setTempLat(intToCoord(missionItemData.x));
      setTempLng(intToCoord(missionItemData.y));
    }, [missionItemData.z, missionItemData.x, missionItemData.y]);

    return (
      <div className="bg-falcongrey rounded p-1 flex flex-col gap-1">
        
        {altitude && (
          <div className="flex items-center gap-2">
            <span>Altitude:</span>
            <NumberInput
              value={tempAltitude}
              onChange={setTempAltitude}
              onBlur={() => {
                if (typeof tempAltitude === "number" && !isNaN(tempAltitude)) {
                  updateMissionItemData("z", tempAltitude);
                }
              }}
              hideControls
              size="s"
              rightSection={<p className="text-black pr-1">m</p>}
              classNames={{
                input: "!bg-white !text-black !pl-1",
              }}
              className="ml-auto w-[150px]"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.target.blur(); // triggers onBlur and closes editing
                }
              }}
            />
          </div>
        )}

        {coordinates && (
          <>
            <div className="flex items-center gap-2">
              <span>Lat:</span>
              <NumberInput
                value={tempLat}
                onChange={(val) => {
                  setTempLat(val);
                  setLatError(val < -90 || val > 90 ? "Limit: -90 to 90" : null);
                }}
                onBlur={() => {
                  if (!latError && typeof tempLat === "number" && !isNaN(tempLat)) {
                    updateMissionItemData("x", coordToInt(tempLat));
                  }
                }}
                min={-90}
                max={90}
                error={latError}
                hideControls
                size="s"
                rightSection={<p className="text-black pr-1">°</p>}
                classNames={{
                  input: "!bg-white !text-black !pl-1",
                }}
                className="ml-auto w-[150px]"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.target.blur(); // triggers onBlur and closes editing
                  }
                }}
              />
            </div>

            <div className="flex items-center gap-2">
              <span>Lng:</span>
              <NumberInput
                value={tempLng}
                onChange={(val) => {
                  setTempLng(val);
                  setLngError(val < -180 || val > 180 ? "Limit: -180 to 180" : null);
                }}
                onBlur={() => {
                  if (!lngError && typeof tempLng === "number" && !isNaN(tempLng)) {
                    updateMissionItemData("y", coordToInt(tempLng));
                  }
                }}
                min={-180}
                max={180}
                error={lngError}
                hideControls
                size="s"
                rightSection={<p className="text-black pr-1">°</p>}
                classNames={{
                  input: "!bg-white !text-black !pl-1",
                }}
                className="ml-auto w-[150px]"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.target.blur(); // triggers onBlur and closes editing
                  }
                }}
              />
            </div>
          </>
        )}
      </div>
    );
  }

  function SettingsHamberger() {
    return (
      <>
        <div className="ml-auto cursor-pointer" onClick={() => setIsSettingsModalOpen(true)}>
          ☰
        </div>

        <Modal
          opened={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          title="Settings"
          centered
          overlayProps={{
            background: 'transparent',
            opacity: 0.4,
            blur: 0,
          }}
        >
          <div className="flex flex-col gap-2">
            {/* <div className="flex gap-2">
              <ActionIcon
                onClick={() => updateMissionItemOrder(missionItemData.id, -1)}
              >
                <IconArrowUp size={20} />
              </ActionIcon>
              <ActionIcon
                onClick={() => updateMissionItemOrder(missionItemData.id, 1)}
              >
                <IconArrowDown size={20} />
              </ActionIcon>
            </div> */}

            <div className="flex justify-between items-center">
              <span>Param 1:</span>
              <NumberInput
                value={missionItemData.param1}
                onChange={(val) => updateMissionItemData("param1", val)}
                hideControls
                className="w-[150px]"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.target.blur(); // triggers onBlur and closes editing
                  }
                }}
              />
            </div>

            <div className="flex justify-between items-center">
              <span>Param 2:</span>
              <NumberInput
                value={missionItemData.param2}
                onChange={(val) => updateMissionItemData("param2", val)}
                hideControls
                className="w-[150px]"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.target.blur(); // triggers onBlur and closes editing
                  }
                }}
              />
            </div>

            <div className="flex justify-between items-center">
              <span>Param 3:</span>
              <NumberInput
                value={missionItemData.param3}
                onChange={(val) => updateMissionItemData("param3", val)}
                hideControls
                className="w-[150px]"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.target.blur(); // triggers onBlur and closes editing
                  }
                }}
              />
            </div>

            <div className="flex justify-between items-center">
              <span>Param 4:</span>
              <NumberInput
                value={missionItemData.param4}
                onChange={(val) => updateMissionItemData("param4", val)}
                hideControls
                className="w-[150px]"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.target.blur(); // triggers onBlur and closes editing
                  }
                }}
              />
            </div>

            <div className="flex justify-between items-center">
              <span>Lat:</span>
              <NumberInput
                value={intToCoord(missionItemData.x).toFixed(coordsFractionDigits)}
                onChange={(val) => updateMissionItemData("x", coordToInt(val))}
                hideControls
                className="w-[150px]"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.target.blur(); // triggers onBlur and closes editing
                  }
                }}
              />
            </div>

            <div className="flex justify-between items-center">
              <span>Lng:</span>
              <NumberInput
                value={intToCoord(missionItemData.y).toFixed(coordsFractionDigits)}
                onChange={(val) => updateMissionItemData("y", coordToInt(val))}
                hideControls
                className="w-[150px]"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.target.blur(); // triggers onBlur and closes editing
                  }
                }}
              />
            </div>

            <div className="flex justify-between items-center">
              <span>Alt:</span>
              <NumberInput
                value={missionItemData.z}
                onChange={(val) => updateMissionItemData("z", val)}
                hideControls
                className="w-[150px]"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.target.blur(); // triggers onBlur and closes editing
                  }
                }}
              />
            </div>

            {/* <div className="flex justify-between items-center">
              <span>Frame:</span>
              <Select
                data={getAvailableCommands()}
                value={missionItemData.command.toString()}
                onChange={(value) =>
                  updateMissionItemData("command", parseInt(value))
                }
                allowDeselect={false}
                variant="unstyled"
                rightSection={<IconChevronDown size={25} />}
                size='s'
                style={{ width: 160, marginTop: '0px' }}
                styles={{
                  input: {
                    fontSize: 16,
                  }
                }}
                classNames={{
                  dropdown: 'min-w-[250px] text-xl',
                  // item: 'ml-4 hover:bg-falconred-700',
                }}
              />{getPositionFrameName(missionItemData.frame)}
            </div> */}
          </div>
        </Modal>
      </>
    );
  }

  return (<>
    <div
      className="m-[5px] p-[8px] rounded bg-falcongrey-TRANSLUCENT"
      onClick={() => handleItemClick(missionItemData.seq)}
    >
      {openItemId === missionItemData.seq ? (
        <>
          <div className="flex">
            {/* Delete button */}
            <ActionIcon
              onClick={() => deleteMissionItem(missionItemData.id)}
              color="red"
              style={{ marginRight: '5px' }}
            >
              <IconTrash size={20} />
            </ActionIcon>

            <Select
              data={getAvailableCommands()}
              value={missionItemData.command.toString()}
              onChange={(value) =>
                updateMissionItemData("command", parseInt(value))
              }
              allowDeselect={false}
              variant="unstyled"
              rightSection={<IconChevronDown size={25} />}
              size='s'
              style={{ width: 170, marginTop: '0px' }}
              styles={{
                input: {
                  fontSize: 16,
                }
              }}
              classNames={{
                dropdown: 'min-w-[250px] text-xl',
                // item: 'ml-4 hover:bg-falconred-700',
              }}
            />

            {/* <SettingsHamberger /> */}

          </div>

          <InformationBox command={getCommandLabelById(missionItemData.command)} />

        </>
      ) : (
        <div className="flex">
          <div className="pr-2 mr-2 pl-2 bg-blue-600 text-white rounded-sm">{missionItemData.seq}</div> {/*  bg-blue-700 rounded-sm */}
          <div>{getCommandLabelById(missionItemData.command)}</div>
        </div>
      )}
    </div>
  </>
  )
}
