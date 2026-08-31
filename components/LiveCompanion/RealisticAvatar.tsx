"use client";

import React, { useRef, useMemo, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Sphere, MeshDistortMaterial, Float, MeshWobbleMaterial, OrbitControls, Environment, ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import { SessionState } from "@/services/realtimeVoice/RealtimeVoiceSessionManager";

interface RealisticAvatarProps {
  sessionState: SessionState;
  userVolume: number;
  aiVolume: number;
}

function AvatarCore({ sessionState, userVolume, aiVolume }: RealisticAvatarProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const outerRef = useRef<THREE.Mesh>(null);
  const shellRef = useRef<THREE.Mesh>(null);

  // Colors based on state
  const colors = useMemo(() => {
    switch (sessionState) {
      case "AI_SPEAKING": return { core: "#818cf8", glow: "#c084fc", ambient: "#4f46e5" };
      case "USER_SPEAKING": return { core: "#22d3ee", glow: "#06b6d4", ambient: "#0891b2" };
      case "PROCESSING": return { core: "#a855f7", glow: "#ec4899", ambient: "#d946ef" };
      case "INTERRUPTED": return { core: "#f87171", glow: "#ef4444", ambient: "#b91c1c" };
      default: return { core: "#6366f1", glow: "#4f46e5", ambient: "#3730a3" };
    }
  }, [sessionState]);

  useFrame((state) => {
    if (!meshRef.current || !outerRef.current || !shellRef.current) return;

    const t = state.clock.getElapsedTime();
    
    // Core Rotation
    meshRef.current.rotation.x = t * 0.2;
    meshRef.current.rotation.y = t * 0.3;

    // React to volume
    const aiIntensity = Math.min(1, aiVolume * 3);
    const userIntensity = Math.min(1, userVolume * 3);
    const combinedIntensity = Math.max(aiIntensity, userIntensity);

    // Scaling reaction
    const scaleBase = sessionState === "IDLE" ? 1 : 1.1;
    const s = scaleBase + combinedIntensity * 0.4;
    meshRef.current.scale.setScalar(THREE.MathUtils.lerp(meshRef.current.scale.x, s, 0.1));

    // Outer shell pulse
    shellRef.current.rotation.y = -t * 0.1;
    shellRef.current.rotation.z = t * 0.15;
    const shellS = 1.4 + Math.sin(t * 2) * 0.05 + combinedIntensity * 0.3;
    shellRef.current.scale.setScalar(THREE.MathUtils.lerp(shellRef.current.scale.x, shellS, 0.05));

    // Distort speed/factor based on activity
    if (meshRef.current.material instanceof THREE.ShaderMaterial || (meshRef.current.material as any).distort !== undefined) {
      const targetDistort = sessionState === "AI_SPEAKING" ? 0.6 + aiIntensity * 0.4 : 
                           sessionState === "USER_SPEAKING" ? 0.4 + userIntensity * 0.3 : 0.3;
      (meshRef.current.material as any).distort = THREE.MathUtils.lerp((meshRef.current.material as any).distort, targetDistort, 0.1);
      (meshRef.current.material as any).speed = sessionState === "PROCESSING" ? 4 : 2;
    }
  });

  return (
    <group>
      {/* Central Intelligent Core */}
      <Sphere ref={meshRef} args={[1, 64, 64]}>
        <MeshDistortMaterial
          color={colors.core}
          emissive={colors.core}
          emissiveIntensity={0.5}
          roughness={0.1}
          metalness={0.8}
          distort={0.4}
          speed={2}
        />
      </Sphere>

      {/* Atmospheric Inner Glow */}
      <Sphere ref={outerRef} args={[1.05, 32, 32]}>
        <meshStandardMaterial
          color={colors.glow}
          transparent
          opacity={0.3}
          wireframe
        />
      </Sphere>

      {/* Crystalline Outer Shell */}
      <Sphere ref={shellRef} args={[1, 32, 32]}>
        <meshPhysicalMaterial
          color={colors.ambient}
          transparent
          opacity={0.15}
          transmission={0.9}
          thickness={1}
          roughness={0}
          clearcoat={1}
          metalness={0.1}
        />
      </Sphere>

      {/* Orbiting Neural Nodes */}
      {sessionState !== "IDLE" && Array.from({ length: 3 }).map((_, i) => (
        <NeuralNode key={i} index={i} color={colors.glow} sessionState={sessionState} />
      ))}
    </group>
  );
}

function NeuralNode({ index, color, sessionState }: { index: number; color: string; sessionState: string }) {
  const ref = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.getElapsedTime();
    const speed = sessionState === "PROCESSING" ? 4 : 2;
    const angle = t * speed + (index * Math.PI * 2) / 3;
    const radius = 2.2 + Math.sin(t * 3 + index) * 0.2;
    
    ref.current.position.set(
      Math.cos(angle) * radius,
      Math.sin(angle * 0.5) * radius * 0.5,
      Math.sin(angle) * radius
    );
    
    ref.current.scale.setScalar(0.08 + Math.sin(t * 5 + index) * 0.02);
  });

  return (
    <Sphere ref={ref} args={[1, 16, 16]}>
      <meshBasicMaterial color={color} />
    </Sphere>
  );
}

import Image from "next/image";
import avatarImg from "../../src/assets/images/edc_live_avatar_bg_1787881388569.jpg";

export function RealisticAvatar({ sessionState, aiVolume, userVolume }: RealisticAvatarProps) {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      {/* Background Image with Neural Pulse */}
      <div className="absolute inset-0 scale-105">
        <Image
          src={avatarImg}
          alt="EDC Live AI Avatar"
          fill
          className={`object-cover transition-all duration-1000 ${
            sessionState === "AI_SPEAKING" ? "scale-110 saturate-125" : "scale-100 saturate-100"
          }`}
          priority
          referrerPolicy="no-referrer"
        />
        {/* Dynamic Glow Overlay based on Volume */}
        <div 
          className="absolute inset-0 bg-primary/20 transition-opacity duration-300 pointer-events-none"
          style={{ opacity: Math.max(aiVolume, userVolume) * 0.5 }}
        />
      </div>

      {/* Atmospheric Overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40 pointer-events-none" />
      
      {/* 3D Particle Layer (Simplified) */}
      <div className="absolute inset-0 z-10 pointer-events-none opacity-40">
        <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
          <Suspense fallback={null}>
            <NeuralParticles sessionState={sessionState} volume={Math.max(aiVolume, userVolume)} />
          </Suspense>
        </Canvas>
      </div>

      {/* Vignette */}
      <div className="absolute inset-0 shadow-[inset_0_0_150px_rgba(0,0,0,0.8)] pointer-events-none" />
    </div>
  );
}

function NeuralParticles({ sessionState, volume }: { sessionState: string; volume: number }) {
  const points = useMemo(() => {
    const p = new Float32Array(300 * 3);
    for (let i = 0; i < 300; i++) {
      p[i * 3] = (Math.random() - 0.5) * 10;
      p[i * 3 + 1] = (Math.random() - 0.5) * 10;
      p[i * 3 + 2] = (Math.random() - 0.5) * 5;
    }
    return p;
  }, []);

  const ref = useRef<THREE.Points>(null);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.getElapsedTime();
    ref.current.rotation.y = t * 0.05;
    ref.current.position.y = Math.sin(t * 0.5) * 0.1;
    
    // Scale particles with volume
    const s = 1 + volume * 0.5;
    ref.current.scale.setScalar(s);
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[points, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.02}
        color="#00e5ff"
        transparent
        opacity={0.6}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
