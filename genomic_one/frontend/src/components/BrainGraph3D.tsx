"use client";

import { useRef, useMemo, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

/* ---------- layer config ---------- */
const LAYER_CONFIG = [
  { id: "L1", color: "#00C9B1", y: -3.0, count: 7 },
  { id: "L2", color: "#3D8EFF", y: -2.0, count: 7 },
  { id: "L3", color: "#8B5CF6", y: -1.0, count: 6 },
  { id: "L4", color: "#F0B429", y:  0.0, count: 7 },
  { id: "L5", color: "#00C9B1", y:  1.0, count: 6 },
  { id: "L6", color: "#00E5A0", y:  2.0, count: 8 },
  { id: "MCP", color: "#3D8EFF", y: 3.0, count: 7 },
];

interface NodeData {
  position: THREE.Vector3;
  color: string;
  phase: number;
  layerIdx: number;
}

interface EdgeData {
  start: THREE.Vector3;
  end: THREE.Vector3;
  color: string;
}

function seededRandom(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

function buildGraph() {
  const nodes: NodeData[] = [];
  const edges: EdgeData[] = [];
  const layerNodes: number[][] = [];

  let nodeIndex = 0;
  LAYER_CONFIG.forEach((layer, li) => {
    const indices: number[] = [];
    for (let i = 0; i < layer.count; i++) {
      const angle = (i / layer.count) * Math.PI * 2;
      const r = 1.2 + seededRandom(nodeIndex * 7 + 3) * 0.6;
      const jitterY = (seededRandom(nodeIndex * 13 + 1) - 0.5) * 0.4;
      const position = new THREE.Vector3(
        Math.cos(angle) * r,
        layer.y + jitterY,
        Math.sin(angle) * r,
      );
      nodes.push({
        position,
        color: layer.color,
        phase: seededRandom(nodeIndex * 31) * Math.PI * 2,
        layerIdx: li,
      });
      indices.push(nodeIndex);
      nodeIndex++;
    }
    layerNodes.push(indices);
  });

  // Connect adjacent layers — 2-3 edges per node going upward
  for (let li = 0; li < layerNodes.length - 1; li++) {
    const current = layerNodes[li];
    const above = layerNodes[li + 1];
    current.forEach((ni, ci) => {
      const connectCount = 2 + (ci % 2); // 2 or 3
      for (let c = 0; c < connectCount; c++) {
        const ti = above[(ci + c) % above.length];
        edges.push({
          start: nodes[ni].position,
          end: nodes[ti].position,
          color: nodes[ni].color,
        });
      }
    });
  }

  return { nodes, edges };
}

/* ---------- Node mesh ---------- */
function BrainNode({ node }: { node: NodeData }) {
  const ref = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const s = 1.0 + 0.1 * Math.sin(clock.elapsedTime * 0.8 + node.phase);
    ref.current.scale.setScalar(hovered ? s * 1.4 : s);
  });

  return (
    <mesh
      ref={ref}
      position={node.position}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <sphereGeometry args={[0.08, 16, 16]} />
      <meshStandardMaterial
        color={node.color}
        emissive={node.color}
        emissiveIntensity={hovered ? 1.6 : 0.5}
        toneMapped={false}
      />
    </mesh>
  );
}

/* ---------- Edges ---------- */
function Edges({ edges }: { edges: EdgeData[] }) {
  const geometry = useMemo(() => {
    const positions: number[] = [];
    const colors: number[] = [];
    const tmpColor = new THREE.Color();

    edges.forEach((e) => {
      positions.push(e.start.x, e.start.y, e.start.z);
      positions.push(e.end.x, e.end.y, e.end.z);
      tmpColor.set(e.color);
      colors.push(tmpColor.r, tmpColor.g, tmpColor.b);
      colors.push(tmpColor.r, tmpColor.g, tmpColor.b);
    });

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    return geo;
  }, [edges]);

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial vertexColors transparent opacity={0.18} />
    </lineSegments>
  );
}

/* ---------- Scene ---------- */
function Scene() {
  const { nodes, edges } = useMemo(() => buildGraph(), []);

  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[5, 5, 5]} intensity={0.6} />
      <pointLight position={[-5, -3, -5]} intensity={0.3} />

      {nodes.map((n, i) => (
        <BrainNode key={i} node={n} />
      ))}
      <Edges edges={edges} />

      <OrbitControls
        autoRotate
        autoRotateSpeed={0.5}
        enablePan={false}
        minDistance={3}
        maxDistance={12}
      />
    </>
  );
}

/* ---------- Exported component ---------- */
export default function BrainGraph3D() {
  return (
    <Canvas
      style={{ height: "400px", width: "100%" }}
      camera={{ position: [4, 2, 5], fov: 50 }}
      gl={{ alpha: true }}
    >
      <Scene />
    </Canvas>
  );
}
