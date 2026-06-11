/*
  This table displays all the mission items.
*/

// import { Table } from "@mantine/core"
import React, { useEffect, useState } from "react"
import { isGlobalFrameHomeCommand } from "../../helpers/filterMissions"
import MissionItemsTableRow from "./missionItemsTableRow"

// Redux
import { useSelector } from "react-redux"
import { selectDrawingMissionItems } from "../../redux/slices/missionSlice"

function MissionItemsTableNonMemo({
  updateMissionItem,
  deleteMissionItem,
  updateMissionItemOrder,
}) {
  const missionItems = useSelector(selectDrawingMissionItems)

  const [openItemId, setOpenItemId] = useState(null);

  // Open information box of the last added or clicked item.
  useEffect(() => {
    setOpenItemId(missionItems.length - 1)
  }, [missionItems])

  const handleItemClick = (id) => {
    setOpenItemId(id);
  };

  return (<>
    <div>
      {missionItems.map((missionItem, idx) => {
        // Skip home location
        if (idx === 0 && isGlobalFrameHomeCommand(missionItem)) {
          return null
        }

        return (
          <MissionItemsTableRow
            key={missionItem.id}
            missionItem={missionItem}
            updateMissionItem={updateMissionItem}
            deleteMissionItem={deleteMissionItem}
            updateMissionItemOrder={updateMissionItemOrder}
            openItemId={openItemId}
            handleItemClick={handleItemClick}
          />
        )
      })}
    </div>
  </>
  )
}

function propsAreEqual(prev, next) {
  return JSON.stringify(prev) === JSON.stringify(next)
}
const MissionItemsTable = React.memo(MissionItemsTableNonMemo, propsAreEqual)

export default MissionItemsTable
