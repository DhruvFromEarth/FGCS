import { useState } from 'react';
import { ResizableBox } from 'react-resizable';

const FloatingMenu = ({ items }) => {
  return (
    <div style={{
      position: 'absolute',
      left: '100%',
      top: 0,
      background: '#333',
      padding: '10px',
      borderRadius: '4px',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 10,
      marginLeft: '10px',
      minWidth: '150px'
    }}>
      {items.map((item, index) => {
        const isDisabled = item.toLowerCase().includes('(disabled)');
        return (
          <button
            key={index}
            disabled={isDisabled}
            style={{
              background: isDisabled ? '#555' : '#666',
              color: '#fff',
              border: 'none',
              marginBottom: '5px',
              padding: '8px',
              cursor: isDisabled ? 'not-allowed' : 'pointer',
              opacity: isDisabled ? 0.6 : 1,
              textAlign: 'left'
            }}
          >
            {item}
          </button>
        );
      })}
    </div>
  );
};

const SidebarButton = ({ label, icon, menuItems, isOpen, onClick }) => {
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <button
        onClick={onClick}
        style={{
          width: '100%',
          background: isOpen ? '#fdd835' : '#2c2c2c',
          color: 'white',
          border: 'none',
          padding: '12px 0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          cursor: 'pointer'
        }}
      >
        <span>{icon}</span>
        <small>{label}</small>
      </button>
      {isOpen && menuItems && (
        <FloatingMenu items={menuItems} />
      )}
    </div>
  );
};

function Sidebar() {
  // const [openMenu, setOpenMenu] = useState(null);

  // const handleMenuToggle = (menu) => {
  //   setOpenMenu(openMenu === menu ? null : menu);
  // };

  // return (
  //   <div style={{ display: 'flex', height: '100vh' }}>
  //     {/* Sidebar */}
  //     <div style={{
  //       width: '60px',
  //       background: '#1e1e1e',
  //       display: 'flex',
  //       flexDirection: 'column',
  //       alignItems: 'center',
  //       padding: '10px 0'
  //     }}>
  //       <SidebarButton
  //         label="File"
  //         icon="🔥"
  //         menuItems={['New', 'Open', 'Save']}
  //         isOpen={openMenu === 'file'}
  //         onClick={() => handleMenuToggle('file')}
  //       />
  //       <SidebarButton label="Takeoff" icon="⬆️" />
  //       <SidebarButton label="Waypoint" icon="➕" />
  //       <SidebarButton label="ROI" icon="🎯" />
  //       <SidebarButton label="Pattern" icon="🔁" />
  //       <SidebarButton label="Return" icon="↩️" />
  //       <SidebarButton
  //         label="Center"
  //         icon="📍"
  //         menuItems={[
  //           'Mission',
  //           'All items',
  //           'Launch',
  //           'Vehicle (disabled)',
  //           'Current Location (disabled)',
  //           'Specified Location'
  //         ]}
  //         isOpen={openMenu === 'center'}
  //         onClick={() => handleMenuToggle('center')}
  //       />
  //     </div>
  //   </div>
  // );
  return (
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
            <Button onClick={() => sendTakeoffCommand(15)}>
              Takeoff to 15m
            </Button>
            {/* toggle */}
            <Button onClick={() => dispatch(toggleMapLock())}>
              Map: {lockedMapInteractions ? 'Locked' : 'Unlocked'}
            </Button>
            {/* return to launch */}
            <Button onClick={addReturnToLaunch} disabled={true}>
              Return to Launch
            </Button>
            {/* clear mission */}
            <Button onClick={clearMissionItems}>
              Clear Mission
            </Button>

            <select>
              <option disabled selected>Settings</option>
              <option value="option1">Option 1</option>
              <option value="option2">Option 2</option>
              <option value="option3">Option 3</option>
            </select>

            {/* settings dropdown/menu */}
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
  );
}

export default Sidebar;
