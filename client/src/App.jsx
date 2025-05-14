import { OrbitControls, Stars } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useRef, useState, useEffect } from "react";
import SunCalc from "suncalc";
import { useLoader } from "@react-three/fiber";
import { TextureLoader } from "three";

const solarFrameData = {
  panels: Array(25)
    .fill({})
    .map((_, i) => ({ hasError: i === 16 }))
};

// Replace the Panel component with this improved version
const Panel = ({ position, dimensions, hasError = false }) => {
  const texture = useLoader(TextureLoader, "/solarTexture.jpg");
  const [hovered, setHovered] = useState(false);
  
  // Pulse effect for error state
  const [errorIntensity, setErrorIntensity] = useState(1);
  
  useEffect(() => {
    if (hasError) {
      const interval = setInterval(() => {
        setErrorIntensity(prev => Math.sin(Date.now() * 0.005) * 0.4 + 0.6);
      }, 100);
      return () => clearInterval(interval);
    }
  }, [hasError]);
  
  return (
    <mesh 
      position={position} 
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <boxGeometry args={dimensions} />
      <meshStandardMaterial
        map={hasError ? null : texture}
        color={hasError ? `rgb(${255 * errorIntensity}, 100, 100)` : (hovered ? "#e0e0ff" : "white")}
        emissive={hasError ? "red" : (hovered ? "#333366" : "#000000")}
        emissiveIntensity={hasError ? 0.5 * errorIntensity : (hovered ? 0.2 : 0)}
        roughness={0.65}
        metalness={0.25}
      />
    </mesh>
  );
};

const GlassSurface = ({ width, height, depth }) => (
  <mesh position={[0, depth, 0]} rotation={[-Math.PI / 2, 0, 0]}>
    <planeGeometry args={[width, height]} />
    <meshStandardMaterial transparent opacity={0.3} color="skyblue" />
  </mesh>
);

const Sun = ({ sunPosition, intensity }) => {
  const lightRef = useRef();
  const sphereRef = useRef();
  const texture = useLoader(TextureLoader, "/sunTexture.jpg");

  useEffect(() => {
    if (lightRef.current && sphereRef.current) {
      lightRef.current.position.set(...sunPosition);
      sphereRef.current.position.set(...sunPosition);
    }
  }, [sunPosition]);

  return (
    <>
      <mesh ref={sphereRef}>
        <sphereGeometry args={[20, 20, 20]} />
        <meshStandardMaterial
          emissiveMap={texture}
          emissive="yellow"
          emissiveIntensity={1.5}
          toneMapped={false}
        />
      </mesh>
      <directionalLight
        ref={lightRef}
        color="white"
        intensity={intensity}
        castShadow
      />
    </>
  );
};

const SolarFrame = ({
  frameDimensions,
  panelDimensions,
  panelCount,
  heightFromGround
}) => {
  const [length, depth, height] = frameDimensions;
  const [panelLength, panelDepth, panelHeight] = panelDimensions;

  const columns = Math.floor(length / panelLength);
  const rows = Math.floor(depth / panelDepth);

  const totalPanels = Math.min(columns * rows, panelCount);

  const panels = [];
  let panelIndex = 0;
  const gap = 1;

  const totalAvailableLength = length - (columns - 1) * gap;
  const totalAvailableDepth = depth - (rows - 1) * gap;

  const adjustedPanelLength = totalAvailableLength / columns;
  const adjustedPanelDepth = totalAvailableDepth / rows;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      if (panelIndex >= totalPanels) break;

      const x = col * (adjustedPanelLength + gap) - length / 2 + adjustedPanelLength / 2;
      const z = row * (adjustedPanelDepth + gap) - depth / 2 + adjustedPanelDepth / 2;
      const y = panelHeight / 2;

      panels.push(
        <Panel
          key={panelIndex}
          position={[x, y, z]}
          dimensions={[adjustedPanelLength, panelHeight, adjustedPanelDepth]}
          hasError={solarFrameData.panels[panelIndex].hasError}
        />
      );

      panelIndex++;
    }
  }

  return (
    <group position={[0, heightFromGround, 0]}>
      <mesh>
        <boxGeometry args={[length, height, depth]} />
        <meshBasicMaterial wireframe color="black" />
      </mesh>
      {panels}
      <GlassSurface width={length} height={depth} depth={height / 2 + 0.1} />
    </group>
  );
};

// Replace the existing ErrorsPanel component with this enhanced version:

const ErrorsPanel = ({ errors }) => {
  if (!errors || errors.length === 0) return null;
  
  return (
    <div className="absolute bottom-6 left-6 bg-black/80 backdrop-blur-md p-4 rounded-xl text-white max-w-sm border border-red-900/50 shadow-lg shadow-red-900/20 overflow-hidden">
      <div className="absolute -top-8 -left-8 w-16 h-16 bg-red-500 opacity-20 rounded-full animate-pulse"></div>
      <div className="absolute -bottom-8 -right-8 w-16 h-16 bg-red-500 opacity-10 rounded-full animate-pulse" style={{ animationDelay: "1s" }}></div>
      
      <h3 className="text-red-400 font-bold mb-3 flex items-center text-sm">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        SYSTEM ALERTS
      </h3>
      <ul className="space-y-2">
        {errors.map((error, i) => (
          <li key={i} className="flex items-start p-2 bg-red-950/40 rounded-lg border border-red-900/30">
            <div className="w-2 h-2 bg-red-500 rounded-full mt-1.5 mr-3 animate-pulse"></div>
            <div>
              <div className="font-medium text-red-300">Panel #{error.id} Malfunction</div>
              <div className="text-xs text-gray-400 mt-1">Critical error detected. Maintenance required.</div>
            </div>
          </li>
        ))}
      </ul>
      <button className="mt-3 w-full py-2 bg-red-700/50 hover:bg-red-700/80 rounded-lg text-xs font-medium flex items-center justify-center gap-2 border border-red-800/50 transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        TROUBLESHOOT ISSUES
      </button>
    </div>
  );
};

// Add this component
const SkyBox = ({ sunPosition }) => {
  // Calculate sky color based on sun position
  const sunHeight = sunPosition[1];
  const maxHeight = 300;
  const normalizedHeight = Math.min(Math.max(sunHeight / maxHeight, -0.2), 0.6);
  
  // Sky colors for different times of day
  const nightColor = [0.05, 0.05, 0.12];
  const sunriseColor = [0.8, 0.6, 0.5];
  const dayColor = [0.5, 0.7, 1.0];
  
  // Calculate current color
  let skyColor;
  if (normalizedHeight < 0) {
    // Night
    skyColor = nightColor;
  } else if (normalizedHeight < 0.2) {
    // Sunrise/sunset
    const t = normalizedHeight / 0.2;
    skyColor = nightColor.map((night, i) => night * (1-t) + sunriseColor[i] * t);
  } else {
    // Day
    const t = (normalizedHeight - 0.2) / 0.4;
    skyColor = sunriseColor.map((sunrise, i) => sunrise * (1-t) + dayColor[i] * t);
  }
  
  return (
    <>
      <color attach="background" args={skyColor} />
      {normalizedHeight > 0 && (
        <Stars 
          radius={300} 
          depth={50} 
          count={normalizedHeight < 0.2 ? 2000 : 500} 
          factor={4} 
          saturation={0} 
          fade 
          speed={0.5} 
        />
      )}
      {normalizedHeight <= 0 && (
        <Stars 
          radius={300} 
          depth={50} 
          count={5000} 
          factor={4} 
          saturation={0} 
          fade 
          speed={0.5} 
        />
      )}
    </>
  );
};

// Update the App function to include time controls
function App() {
  const [frameLength, setFrameLength] = useState(50);
  const [frameWidth, setFrameWidth] = useState(50);
  const [frameHeight, setFrameHeight] = useState(10);
  const [panelLength, setPanelLength] = useState(10);
  const [panelWidth, setPanelWidth] = useState(10);
  const [panelHeight, setPanelHeight] = useState(3);
  const [heightFromGround, setHeightFromGround] = useState(3);
  const [sunIntensity, setSunIntensity] = useState(1);

  const [latitude, setLatitude] = useState(15.23);
  const [longitude, setLongitude] = useState(73.52);

  const [sunPosition, setSunPosition] = useState([200, 200, 200]);

  // Add these new state variables
  const [date, setDate] = useState(new Date());
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationSpeed, setSimulationSpeed] = useState(60); // minutes per second

  // Update the sun position calculation to use the simulated date
  useEffect(() => {
    const updateSunPosition = () => {
      const sun = SunCalc.getPosition(date, latitude, longitude);
      const distance = 300;
      
      // Convert azimuth/altitude to cartesian coordinates
      const x = distance * Math.cos(sun.altitude) * Math.sin(sun.azimuth);
      const y = distance * Math.sin(sun.altitude);
      const z = distance * Math.cos(sun.altitude) * Math.cos(sun.azimuth);
      
      setSunPosition([x, y, z]);
    };
    
    updateSunPosition();
    
    // Set up simulation interval
    let interval;
    if (isSimulating) {
      interval = setInterval(() => {
        setDate(prevDate => {
          const newDate = new Date(prevDate);
          newDate.setMinutes(newDate.getMinutes() + simulationSpeed / 10);
          return newDate;
        });
      }, 100);
    }
    
    return () => clearInterval(interval);
  }, [latitude, longitude, date, isSimulating, simulationSpeed]);

  const getErrors = () => {
    return solarFrameData.panels
      .map((panel, index) => panel.hasError ? { id: index + 1 } : null)
      .filter(error => error !== null);
  };

  // Add the time controls to your UI
  return (
    <div className="min-h-screen max-h-screen flex bg-slate-950">
      {/* Enhanced Sidebar */}
      <div className="w-1/4 bg-gradient-to-b from-gray-900 to-gray-950 text-white p-6 space-y-5 overflow-y-auto shadow-lg border-r border-sky-900/30 relative">
        {/* Logo and Title */}
        <div className="flex items-center space-x-3 mb-8">
          <div className="p-2 bg-blue-600 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">Solar Panel Digital Twin</h1>
        </div>
        
        {/* Time Controls Section - Enhanced */}
        <div className="rounded-xl bg-gray-800/50 p-5 border border-gray-700/50 backdrop-blur-sm mb-6">
          <h2 className="text-md font-medium text-gray-300 mb-4 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Time Simulation
          </h2>
          <div className="space-y-4">
            <div className="relative">
              <label className="text-sm font-medium text-gray-300 mb-2 block">Date & Time</label>
              <input
                type="datetime-local"
                value={date.toISOString().slice(0, 16)}
                onChange={(e) => setDate(new Date(e.target.value))}
                className="w-full px-4 py-2.5 bg-gray-900/90 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-white"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-gray-300">Simulation Speed</label>
                <span className="text-xs px-2 py-1 bg-cyan-900/50 rounded-full text-cyan-300 font-medium">{simulationSpeed} min/sec</span>
              </div>
              <input
                type="range"
                min="1"
                max="1440"
                value={simulationSpeed}
                onChange={(e) => setSimulationSpeed(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
              <div className="flex justify-between text-xs text-gray-400">
                <span>Slow</span>
                <span>Fast</span>
              </div>
            </div>
            
            <button
              className={`w-full py-2.5 rounded-lg font-medium transition duration-300 ease-in-out flex justify-center items-center gap-2
                ${isSimulating 
                  ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white' 
                  : 'bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white'}`}
              onClick={() => setIsSimulating(!isSimulating)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isSimulating 
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                }
              </svg>
              {isSimulating ? 'Pause Simulation' : 'Start Simulation'}
            </button>
          </div>
        </div>
        
        {/* Parameters section - Enhanced */}
        <div className="rounded-xl bg-gray-800/50 p-5 border border-gray-700/50 backdrop-blur-sm">
          <h2 className="text-md font-medium text-gray-300 mb-4 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Panel Parameters
          </h2>
          
          <div className="grid gap-4">
            {[
              ["Frame Length", frameLength, setFrameLength, "m"],
              ["Frame Width", frameWidth, setFrameWidth, "m"],
              ["Frame Height", frameHeight, setFrameHeight, "m"],
              ["Panel Length", panelLength, setPanelLength, "m"],
              ["Panel Width", panelWidth, setPanelWidth, "m"],
              ["Panel Height", panelHeight, setPanelHeight, "m"],
              ["Height From Ground", heightFromGround, setHeightFromGround, "m"],
              ["Sun Intensity", sunIntensity, setSunIntensity, "lux"],
              ["Latitude", latitude, setLatitude, "°"],
              ["Longitude", longitude, setLongitude, "°"]
            ].map(([label, value, setter, unit]) => (
              <div className="group relative" key={label}>
                <div className="flex justify-between mb-1.5">
                  <label className="text-sm font-medium text-gray-300">{label}</label>
                  <span className="text-xs px-2 py-0.5 bg-gray-700/70 rounded-full text-cyan-300 font-mono">{value}{unit}</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    value={value}
                    onChange={(e) => setter(parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2 bg-gray-900/80 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-white pr-8"
                  />
                  <span className="absolute right-3 top-2 text-gray-400 pointer-events-none">{unit}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-6 mt-4 border-t border-gray-700/50">
            <button className="w-full py-2.5 rounded-lg font-medium bg-sky-600 hover:bg-sky-700 transition duration-300 ease-in-out flex justify-center items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reset to Default
            </button>
          </div>
        </div>
        
        {/* Footer info */}
        <div className="text-center text-xs text-gray-500 pt-4">
          Solar Panel Digital Twin v1.0
        </div>
      </div>

      {/* Enhanced 3D View */}
      <div className="flex-1 min-h-screen overflow-y-scroll bg-gradient-to-b from-gray-900 to-indigo-950 relative">
        {/* Enhanced Top info bar */}
        <div className="flex justify-between items-center bg-black/40 backdrop-blur-sm px-6 py-3 text-white border-b border-sky-900/20">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${getErrors().length > 0 ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></div>
            <div>Panel Status: 
              <span className={`ml-1 font-medium ${getErrors().length > 0 ? 'text-red-400' : 'text-green-400'}`}>
                {getErrors().length > 0 ? 'Issues Detected' : 'Operational'}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-1 bg-slate-800/50 px-3 py-1 rounded-full border border-slate-700/50">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <div className="text-xs font-mono text-slate-300">
              ({sunPosition[0].toFixed(1)}, {sunPosition[1].toFixed(1)}, {sunPosition[2].toFixed(1)})
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="font-mono text-sm">{date.toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            })}</div>
          </div>
        </div>
        
        {/* Canvas remains mostly the same */}
        <Canvas camera={{ position: [0, 0, 150] }} shadows>
          <SkyBox sunPosition={sunPosition} />
          <ambientLight intensity={0.2 + Math.max(0, sunPosition[1]/300) * 0.5} />
          <Sun sunPosition={sunPosition} intensity={sunIntensity} />
          <SolarFrame
            frameDimensions={[frameLength, frameWidth, frameHeight]}
            panelDimensions={[panelLength, panelWidth, panelHeight]}
            panelCount={solarFrameData.panels.length}
            heightFromGround={heightFromGround}
          />
          <OrbitControls
            makeDefault
            enableZoom
            zoomSpeed={1.0}
            maxDistance={200}
            minDistance={5}
            enablePan={false}
          />
        </Canvas>
        
        {/* Enhanced Error Panel */}
        <ErrorsPanel errors={getErrors()} />
        
        {/* Enhanced Controls hint */}
        <div className="absolute bottom-4 right-4 bg-black/60 text-white px-3 py-2 rounded-lg text-xs backdrop-blur-md flex items-center gap-2 border border-slate-700/30">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>
            <span className="font-medium text-blue-300">Mouse:</span> Drag to rotate | Scroll to zoom
          </span>
        </div>
      </div>
    </div>
  );
}

export default App;
