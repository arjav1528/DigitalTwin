import { OrbitControls } from "@react-three/drei";
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

const Panel = ({ position, dimensions, hasError = false }) => {
  const texture = useLoader(TextureLoader, "/solarTexture.jpg");

  return (
    <mesh position={position}>
      <boxGeometry args={dimensions} />
      <meshStandardMaterial
        map={hasError ? null : texture}
        color={hasError ? "#ff6666" : "white"}
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

  useEffect(() => {
    const now = new Date();
    const sun = SunCalc.getPosition(now, latitude, longitude);
    const distance = 300;

    // Convert azimuth/altitude to cartesian coordinates
    const x = distance * Math.cos(sun.altitude) * Math.sin(sun.azimuth);
    const y = distance * Math.sin(sun.altitude);
    const z = distance * Math.cos(sun.altitude) * Math.cos(sun.azimuth);

    setSunPosition([x, y, z]);
  }, [latitude, longitude]);

  return (
    <div className="min-h-screen max-h-screen flex">
      {/* Sidebar */}
      <div className="w-1/6 bg-zinc-800 border-r border-gray-300 p-6 space-y-4 overflow-y-scroll">
        <h1 className="text-gray-300 font-bold">Digital Twin - Solar Panel</h1>

        {[
          ["Frame Length", frameLength, setFrameLength],
          ["Frame Width", frameWidth, setFrameWidth],
          ["Frame Height", frameHeight, setFrameHeight],
          ["Panel Length", panelLength, setPanelLength],
          ["Panel Width", panelWidth, setPanelWidth],
          ["Panel Height", panelHeight, setPanelHeight],
          ["Height From Ground", heightFromGround, setHeightFromGround],
          ["Sun Intensity", sunIntensity, setSunIntensity],
          ["Latitude", latitude, setLatitude],
          ["Longitude", longitude, setLongitude]
        ].map(([label, value, setter]) => (
          <div className="flex flex-col" key={label}>
            <label className="text-sm font-medium text-gray-100">{label}</label>
            <input
              type="number"
              value={value}
              onChange={(e) => setter(parseFloat(e.target.value))}
              className="px-4 py-2 mt-1 border border-gray-300 rounded-md"
            />
          </div>
        ))}
      </div>

      {/* 3D View */}
      <div className="w-5/6 h-screen bg-indigo-950">
        <Canvas camera={{ position: [0, 0, 150] }}>
          <ambientLight intensity={0.2} />
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
      </div>
    </div>
  );
}

export default App;
