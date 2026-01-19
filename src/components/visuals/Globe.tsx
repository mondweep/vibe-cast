"use client";

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Html } from '@react-three/drei';
import * as THREE from 'three';
import { SimCard } from '@/lib/mock-data';

function SimMarkers({ sims }: { sims: SimCard[] }) {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const tempObject = new THREE.Object3D();
    const earthRadius = 2.5;

    useEffect(() => {
        if (!meshRef.current) return;

        sims.forEach((sim, i) => {
            // Convert lat/long to 3D vector
            const phi = (90 - sim.lat) * (Math.PI / 180);
            const theta = (sim.lng + 180) * (Math.PI / 180);

            const x = -(earthRadius * Math.sin(phi) * Math.cos(theta));
            const z = (earthRadius * Math.sin(phi) * Math.sin(theta));
            const y = (earthRadius * Math.cos(phi));

            tempObject.position.set(x, y, z);

            // Ensure marker points away from center
            tempObject.lookAt(0, 0, 0);

            // Scale based on usage (just for visual variety)
            const scale = 0.05 + (sim.dataUsage / 5000) * 0.05;
            tempObject.scale.set(scale, scale, scale * 5); // Elongate cylinders

            tempObject.updateMatrix();
            meshRef.current!.setMatrixAt(i, tempObject.matrix);

            // Basic color coding
            const color = new THREE.Color();
            if (sim.status === 'active') color.setHex(0x22d3ee); // Cyan
            else if (sim.status === 'warning') color.setHex(0xfacc15); // Yellow
            else color.setHex(0xef4444); // Red

            meshRef.current!.setColorAt(i, color);
        });

        meshRef.current.instanceMatrix.needsUpdate = true;
        if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
    }, [sims]);

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, sims.length]}>
            <cylinderGeometry args={[0.5, 0.5, 1, 8]} />
            <meshBasicMaterial />
        </instancedMesh>
    );
}

function Earth({ children }: { children?: React.ReactNode }) {
    const meshRef = useRef<THREE.Mesh>(null);

    useFrame((state, delta) => {
        if (meshRef.current) {
            meshRef.current.rotation.y += delta * 0.05; // Slower rotation
        }
    });

    return (
        <group ref={meshRef as any}>
            {/* Globe Mesh */}
            <mesh>
                <sphereGeometry args={[2.5, 64, 64]} />
                <meshStandardMaterial
                    color="#0f172a"
                    wireframe={true}
                    emissive="#0ea5e9"
                    emissiveIntensity={0.1}
                    transparent
                    opacity={0.2}
                />
            </mesh>
            {/* Data Markers */}
            {children}
        </group>
    );
}

function Atmosphere() {
    return (
        <mesh scale={[1.1, 1.1, 1.1]}>
            <sphereGeometry args={[2.5, 64, 64]} />
            <meshStandardMaterial
                color="#22d3ee" // Cyan-400
                transparent
                opacity={0.03}
                side={THREE.BackSide}
            />
        </mesh>
    )
}

export function Globe() {
    const [sims, setSims] = useState<SimCard[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                const res = await fetch('/api/move/sims');
                const data = await res.json();
                setSims(data);
            } catch (err) {
                console.error("Failed to load SIM data", err);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    return (
        <div className="w-full h-full min-h-[500px] relative">
            <Canvas camera={{ position: [0, 0, 7], fov: 45 }}>
                <OrbitControls enableZoom={true} enablePan={true} minDistance={4} maxDistance={10} />
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1.5} color="#22d3ee" />

                <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

                <Earth>
                    {!loading && <SimMarkers sims={sims} />}
                </Earth>
                <Atmosphere />
            </Canvas>

            {/* Stats Overlay */}
            <div className="absolute bottom-10 left-10 p-4 bg-black/40 backdrop-blur-md rounded-xl border border-cyan-500/30 text-cyan-400">
                <h3 className="text-xs font-bold uppercase tracking-widest mb-1">System Status</h3>
                <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${loading ? 'bg-yellow-500' : 'bg-green-500'} animate-pulse`} />
                    <span className="text-sm font-mono">{loading ? 'SYNCING DATA...' : `ONLINE - ${sims.length} NODES`}</span>
                </div>
            </div>
        </div>
    );
}
