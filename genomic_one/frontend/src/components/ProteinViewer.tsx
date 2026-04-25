"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { getProtein } from "@/lib/api";

interface Contact {
  residue1: number;
  residue2: number;
  score: number;
}

interface ProteinResult {
  length: number;
  first_20_aa: string;
  contact_edges: number;
  top_contacts: Contact[];
}

function residuePosition(index: number, total: number): [number, number, number] {
  // Arrange residues in a helix
  const t = index / total;
  const angle = t * Math.PI * 8; // 4 full turns
  const radius = 3;
  const rise = t * 10 - 5; // spread vertically
  return [
    Math.cos(angle) * radius,
    rise,
    Math.sin(angle) * radius,
  ];
}

function ProteinMesh({ data }: { data: ProteinResult }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.15;
    }
  });

  const positions = useMemo(() => {
    return Array.from({ length: data.length }, (_, i) =>
      residuePosition(i, data.length)
    );
  }, [data.length]);

  // Backbone line
  const backbonePoints = useMemo(() => {
    return positions.map(([x, y, z]) => new THREE.Vector3(x, y, z));
  }, [positions]);

  const backboneGeometry = useMemo(() => {
    return new THREE.BufferGeometry().setFromPoints(backbonePoints);
  }, [backbonePoints]);

  // Backbone line object
  const backboneLine = useMemo(() => {
    const mat = new THREE.LineBasicMaterial({ color: "#3f3f46" });
    return new THREE.Line(backboneGeometry, mat);
  }, [backboneGeometry]);

  // Contact line objects
  const contactLineObjects = useMemo(() => {
    return data.top_contacts
      .map((c) => {
        const p1 = positions[c.residue1];
        const p2 = positions[c.residue2];
        if (!p1 || !p2) return null;
        const geo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(...p1),
          new THREE.Vector3(...p2),
        ]);
        const mat = new THREE.LineBasicMaterial({
          color: "#8b5cf6",
          opacity: c.score * 0.8,
          transparent: true,
        });
        return new THREE.Line(geo, mat);
      })
      .filter(Boolean) as THREE.Line[];
  }, [data.top_contacts, positions]);

  return (
    <group ref={groupRef}>
      {/* Backbone */}
      <primitive object={backboneLine} />

      {/* Residue spheres */}
      {positions.map(([x, y, z], i) => {
        const t = i / data.length;
        const color = new THREE.Color().setHSL(0.5 - t * 0.2, 0.8, 0.6);
        return (
          <mesh key={i} position={[x, y, z]}>
            <sphereGeometry args={[0.12, 8, 8]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} />
          </mesh>
        );
      })}

      {/* Contact edges */}
      {contactLineObjects.map((lineObj, i) => (
        <primitive key={`contact-${i}`} object={lineObj} />
      ))}
    </group>
  );
}

export default function ProteinViewer() {
  const [data, setData] = useState<ProteinResult | null>(null);

  useEffect(() => {
    getProtein().then(setData);
  }, []);

  if (!data) return <div className="h-72 animate-pulse bg-surface-2 rounded" />;

  return (
    <div className="space-y-3">
      <div className="h-72 rounded-lg overflow-hidden bg-black/30">
        <Canvas camera={{ position: [0, 0, 10], fov: 50 }}>
          <ambientLight intensity={0.4} />
          <pointLight position={[10, 10, 10]} intensity={0.8} />
          <pointLight position={[-10, -10, -10]} intensity={0.3} />
          <ProteinMesh data={data} />
          <OrbitControls enableZoom enablePan={false} autoRotate={false} />
        </Canvas>
      </div>
      <div className="flex flex-wrap gap-3 text-sm">
        <div>
          <span className="text-zinc-400">Length: </span>
          <span className="font-mono">{data.length} aa</span>
        </div>
        <div>
          <span className="text-zinc-400">Contacts: </span>
          <span className="font-mono">{data.contact_edges} edges</span>
        </div>
        <div>
          <span className="text-zinc-400">N-term: </span>
          <span className="font-mono text-xs">{data.first_20_aa}</span>
        </div>
      </div>
    </div>
  );
}
