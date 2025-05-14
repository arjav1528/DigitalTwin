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

const ErrorsPanel = ({ errors }) => {
  if (!errors || errors.length === 0) return null;
  
  return (
    <div className="absolute bottom-4 left-4 bg-black/70 p-4 rounded-lg text-white max-w-sm">
      <h3 className="text-red-400 font-bold mb-2 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        System Errors
      </h3>
      <ul className="space-y-1 text-sm">
        {errors.map((error, i) => (
          <li key={i} className="flex items-center">
            <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
            Panel {error.id} malfunction
          </li>
        ))}
      </ul>
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
    <div className="min-h-screen max-h-screen flex">
      {/* Sidebar */}
      <div className="w-1/5 bg-gray-900 text-white p-6 space-y-5 overflow-y-auto shadow-lg">
        <h1 className="text-xl font-bold text-blue-400 border-b pb-2 mb-4">Digital Twin - Solar Panel</h1>
        
        {/* Time Controls Section */}
        <div className="border-b border-gray-700 pb-4 mb-4">
          <h2 className="text-md font-medium text-gray-300 mb-3">Time Simulation</h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-300">Date & Time</label>
              <input
                type="datetime-local"
                value={date.toISOString().slice(0, 16)}
                onChange={(e) => setDate(new Date(e.target.value))}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-white mt-1"
              />
            </div>
            
            <div className="flex flex-col">
              <div className="flex justify-between">
                <label className="text-sm font-medium text-gray-300">Simulation Speed</label>
                <span className="text-xs text-blue-400">{simulationSpeed} min/sec</span>
              </div>
              <input
                type="range"
                min="1"
                max="1440"
                value={simulationSpeed}
                onChange={(e) => setSimulationSpeed(parseInt(e.target.value))}
                className="w-full mt-1"
              />
            </div>
            
            <button
              className={`w-full py-2 ${isSimulating ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} rounded-md font-medium transition duration-300 ease-in-out`}
              onClick={() => setIsSimulating(!isSimulating)}
            >
              {isSimulating ? 'Stop Simulation' : 'Start Simulation'}
            </button>
          </div>
        </div>
        
        {/* Parameters section */}
        <h2 className="text-md font-medium text-gray-300 mb-3">Panel Parameters</h2>
        <div className="grid gap-6">
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
            <div className="space-y-1" key={label}>
              <div className="flex justify-between">
                <label className="text-sm font-medium text-gray-300">{label}</label>
                <span className="text-xs text-blue-400">{unit}</span>
              </div>
              <input
                type="number"
                value={value}
                onChange={(e) => setter(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
              />
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-gray-700">
          <button className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded-md font-medium transition duration-300 ease-in-out">
            Reset to Default
          </button>
        </div>
      </div>

      {/* 3D View */}
      <div className="flex-1 h-screen bg-gradient-to-b from-gray-900 to-indigo-950 relative">
        {/* Top info bar */}
        <div className="flex justify-between items-center bg-black/30 px-4 py-2 text-white text-sm">
          <div>Panel Status: <span className="text-green-400">Operational</span></div>
          <div>Sun Position: ({sunPosition[0].toFixed(1)}, {sunPosition[1].toFixed(1)}, {sunPosition[2].toFixed(1)})</div>
          <div>Time: {new Date().toLocaleTimeString()}</div>
        </div>
        <Canvas camera={{ position: [0, 0, 150] }}>
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
        
        <ErrorsPanel errors={getErrors()} />
        
        {/* Controls hint */}
        <div className="absolute bottom-4 right-4 bg-black/40 text-white p-2 rounded text-xs">
          Mouse: Drag to rotate | Scroll to zoom
        </div>
      </div>
    </div>
  );
}

export default App;
