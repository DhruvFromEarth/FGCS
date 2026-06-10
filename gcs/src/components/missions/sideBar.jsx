/*
  This component displays the left sidebar for mission planning tools.
*/

import React, { useState, useEffect, useCallback } from 'react';
import { Button, FileButton, Tooltip } from '@mantine/core';

// Image imports
import map_add_mission from '../img/map_add_mission.svg';
import map_add_mission_black from '../img/map_add_mission_black.svg';
import map_center_black from '../img/map_center_black.svg';
import map_center from '../img/map_center.svg';
// import map_draw_shape from '../img/map_draw_shape.svg';
import map_sync_black from '../img/map_sync_black.svg';
// import map_sync_changed from '../img/map_sync_changed.svg';
import map_sync from '../img/map_sync.svg';
import rtl from '../img/rtl.svg';
import takeoff from '../img/takeoff.svg'
import land from '../img/land.svg'

// Redux
import { useSelector } from 'react-redux';
import { selectTakeoffAdded } from '../../redux/slices/missionSlice';

// Styles
const menuButtonBaseStyle = {
  // background: '#666',
  marginTop: '5px',
};

const SidebarButton = React.memo(function SidebarButton({
  label,
  icon,
  isOpen,
  onClick,
  disabled = false,
  isSelected = false,
  children
}) {
  const handleClick = (e) => {
    if (disabled) {
      e.preventDefault();
      return;
    }
    onClick?.(e);
  };

  let backgroundColor = '#2c2c2c';
  let color = 'white';
  if (isSelected) {
    backgroundColor = '#fdd835';
    color = 'black';
  } else if (isOpen) {     // TODO: isOpen -> isSelected
    backgroundColor = '#fdd835';
    color = 'black';
  }

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <button
        onClick={handleClick}
        disabled={disabled}
        style={{
          width: '100%',
          background: backgroundColor,
          color: color,
          border: 'none',
          borderRadius: '4px',
          padding: '8px 0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          // filter: disabled ? 'blur(0.5px)' : 'none',
          // transition: 'all 0.2s ease',
        }}
      >
        <img
          src={icon}
          width='30px'
        />
        <small>{label}</small>
      </button>

      {isOpen && !disabled && children && (
        <div style={{
          position: 'absolute',
          left: '100%',
          top: 0,
          background: '#333',
          padding: '10px',
          borderRadius: '4px',
          zIndex: 10,
          marginLeft: '10px',
          minWidth: '150px',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {children}
        </div>
      )}
    </div>
  );
});

const FileMenu = ({
  connected,
  activeTab,
  readMissionFromDrone,
  writeMissionToDrone,
  clearMissionItems,
  importFileResetRef,
  setImportFile,
  saveMissionToFile,
  unwrittenChanges,
  UnwrittenChangesWarning,
  closeMenu,
  setIsWaypointSelected,
  setIsROISelected,
}) => (
  <>
    {(unwrittenChanges !== null) && <UnwrittenChangesWarning unwrittenChanges={unwrittenChanges} />}

    <Tooltip label={!connected ? 'Not connected to drone.' : 'Read Mission from drone'}>
      <Button onClick={() => connected && (readMissionFromDrone(), closeMenu())} disabled={!connected}>
        Read {activeTab}
      </Button>
    </Tooltip>

    <Tooltip label={!connected ? 'Not connected to drone.' : 'Write mission to drone'}>
      <Button onClick={() => connected && (writeMissionToDrone(), closeMenu())} disabled={!connected} style={menuButtonBaseStyle}>
        Write {activeTab}
      </Button>
    </Tooltip>

    <Button onClick={() => (clearMissionItems(), closeMenu(), setIsWaypointSelected(false), setIsROISelected(false))} style={menuButtonBaseStyle}>
      Clear {activeTab}
    </Button>

    <FileButton resetRef={importFileResetRef} onChange={setImportFile} accept=".waypoints,.txt" style={menuButtonBaseStyle}>
      {(props) => <Button {...props}>Import from file</Button>}
    </FileButton>

    <Button onClick={saveMissionToFile} style={menuButtonBaseStyle}>Save to file</Button>
  </>
);

// const PatternMenu = ({ closeMenu }) => (
//   <>
//     <p>Create complex pattern:</p>
//     {["Survey", "Corridor Scan", "Structure Scan"].map((label) => (
//       <Button key={label} onClick={closeMenu} style={menuButtonBaseStyle}>{label}</Button>
//     ))}
//   </>
// );

const CenterMenu = ({ setZoomTarget, closeMenu }) => (
  <>
    {["Drone", "Mission", "Home"].map((target) => (
      <Button key={target} onClick={() => (setZoomTarget(target), closeMenu())} style={menuButtonBaseStyle}>
        {target}
      </Button>
    ))}
  </>
);


export default function Sidebar({
  // rtlAdded,
  // setRtlAdded,
  addNewMissionItem,
  toggleMapLock,
  dispatch,
  lockedMapInteractions,
  activeTab,
  clearMissionItems,
  connected,
  readMissionFromDrone,
  writeMissionToDrone,
  importFileResetRef,
  setImportFile,
  saveMissionToFile,
  UnwrittenChangesWarning,
  unwrittenChanges,
  setZoomTarget,
  setSelectedOption,
}) {
  const [openMenu, setOpenMenu] = useState(null);
  const [isWaypointSelected, setIsWaypointSelected] = useState(false);
  const [isROISelected, setIsROISelected] = useState(false);

  const takeoffAdded = useSelector(selectTakeoffAdded)

  // Deselect waypoint when delete takeoff from list
  useEffect(()=>{
    if(!takeoffAdded) setIsWaypointSelected(false);
  },[takeoffAdded])

  // to update the states so that options dont conflict the command.
  // Automatically lock/unlock map when either Waypoint or ROI mode is active
  useEffect(() => {
    (isWaypointSelected) ? (lockedMapInteractions ? dispatch(toggleMapLock()) : null) : (lockedMapInteractions ? null : dispatch(toggleMapLock()));
  }, [isWaypointSelected])

  // useEffect(() => {
  //   (isROISelected) ? (lockedMapInteractions ? dispatch(toggleMapLock()) : null) : (lockedMapInteractions ? null : dispatch(toggleMapLock()));
  // }, [isROISelected])

  const closeMenu = useCallback(() => setOpenMenu(null), []);

  const handleMenuToggle = useCallback((menu) => {
    setOpenMenu((prev) => (prev === menu ? null : menu));
  }, []);

  const handleTakeoffClick = useCallback(() => {
    addNewMissionItem(0, 0, "takeoff");
    handleWaypointClick();           // auto-enter Waypoint mode
    // setIsROISelected(false);         // ensure ROI is off
  }, [addNewMissionItem]);

  const handleLandClick = useCallback(() => {
    addNewMissionItem(0, 0, "land");
  }, [addNewMissionItem]);

  const handleWaypointClick = useCallback(() => {
    setIsWaypointSelected((prev) => {
      // if (!prev) setIsROISelected(false);  // disable ROI if enabling Waypoint
      return !prev;
    });
    setSelectedOption('waypoint');
  }, []);

  // const handleROIClick = useCallback(() => {
  //   setIsROISelected((prev) => {
  //     if (!prev) setIsWaypointSelected(false);  // disable Waypoint if enabling ROI
  //     return !prev;
  //   });
  //   setSelectedOption('roi');
  // }, []);

  const handleReturnClick = useCallback(() => {
    addNewMissionItem(0, 0, "return_to_launch");
    setIsWaypointSelected(false);
    // setIsROISelected(false);
  }, [addNewMissionItem]);

  const handleZoom = useCallback((target) => {
    setZoomTarget(target);
    closeMenu();
  }, [setZoomTarget, closeMenu]);

  return (
    <div style={{
      position: 'absolute',
      width: '60px',
      // backgroundColor: 'gray',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      zIndex: 100,
      gap: '5px',
      margin: '5px',
    }}>

      {/* map sync icon should change based off unwritten changes like in QGC */}
      <SidebarButton
        label="File"
        icon={openMenu === 'file' ? map_sync_black : map_sync} // map_sync_changed
        isOpen={openMenu === 'file'}
        onClick={() => handleMenuToggle('file')}
      >
        <FileMenu
          connected={connected}
          activeTab={activeTab}
          readMissionFromDrone={readMissionFromDrone}
          writeMissionToDrone={writeMissionToDrone}
          clearMissionItems={clearMissionItems}
          importFileResetRef={importFileResetRef}
          setImportFile={setImportFile}
          saveMissionToFile={saveMissionToFile}
          unwrittenChanges={unwrittenChanges}
          UnwrittenChangesWarning={UnwrittenChangesWarning}
          closeMenu={closeMenu}
          setIsWaypointSelected={setIsWaypointSelected}
          setIsROISelected={setIsROISelected}
        />
      </SidebarButton>

      <SidebarButton
        label="Takeoff"
        icon={takeoff}
        onClick={handleTakeoffClick}
        disabled={takeoffAdded}
      />

      <SidebarButton
        label="Waypoint"
        icon={(isWaypointSelected) ? map_add_mission_black : map_add_mission}
        onClick={handleWaypointClick}
        isSelected={isWaypointSelected}
        disabled={!takeoffAdded} // || rtlAdded
      />

      {/* <SidebarButton
        label="ROI"
        icon={(isROISelected) ? map_add_mission_black : map_add_mission}
        isSelected={isROISelected}
        // onClick={handleROIClick}
        disabled={true}
      /> */}

      {/* <SidebarButton
        label="Pattern"
        icon={map_draw_shape}
        isOpen={openMenu === 'pattern'}
        onClick={() => handleMenuToggle('pattern')}
      >
        <PatternMenu closeMenu={closeMenu} />
      </SidebarButton> */}

      <SidebarButton
        label="Return"
        icon={rtl}
        onClick={handleReturnClick}
        disabled={!takeoffAdded} // || rtlAdded
      />

      <SidebarButton
        label="Land"
        icon={land}
        onClick={handleLandClick}
        disabled={!takeoffAdded} // || rtlAdded
      />

      <SidebarButton
        label="Center"
        icon={(openMenu === 'center') ? map_center_black : map_center}
        isOpen={openMenu === 'center'}
        onClick={() => handleMenuToggle('center')}
      >
        <CenterMenu
          setZoomTarget={handleZoom}
          closeMenu={closeMenu}
        />
      </SidebarButton>
    </div>
  );
}
