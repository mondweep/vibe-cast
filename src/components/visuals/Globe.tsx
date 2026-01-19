"use client";

import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';

function Earth() {
    const meshRef = useRef<THREE.Mesh>(null);

    useFrame((state, delta) => {
        if (meshRef.current) {
            meshRef.current.rotation.y += delta * 0.1;
        }
    });

    return (
        <mesh ref={meshRef}>
            <sphereGeometry args={[2.5, 64, 64]} />
            <meshStandardMaterial
                color="#0ea5e9" // Cyan-500
                wireframe={true}
                emissive="#0ea5e9"
                emissiveIntensity={0.2}
                transparent
                opacity={0.3}
            />
        </mesh>
    );
}

function Atmosphere() {
    return (
        <mesh scale={[1.1, 1.1, 1.1]}>
            <sphereGeometry args={[2.5, 64, 64]} />
            <meshStandardMaterial
                color="#22d3ee" // Cyan-400
                transparent
                opacity={0.05}
                side={THREE.BackSide}
            />
        </mesh>
    )
}

export function Globe() {
    return (
        <div className="w-full h-full min-h-[500px]">
            <Canvas camera={{ position: [0, 0, 6], fov: 45 }}>
                <OrbitControls enableZoom={false} enablePan={false} minPolarAngle={Math.PI / 2.5} maxPolarAngle={Math.PI / 1.5} />
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1.5} color="#22d3ee" />

                <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
                <Earth />
                <Atmosphere />
            </Canvas>

            <div className="absolute bottom-10 left-10 p-4 bg-black/40 backdrop-blur-md rounded-xl border border-cyan-500/30 text-cyan-400">
                <h3 className="text-xs font-bold uppercase tracking-widest mb-1">System Status</h3>
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-sm font-mono">ONLINE - MONITORING</span>
                </div>
            </div>
        </div>
    );
}
