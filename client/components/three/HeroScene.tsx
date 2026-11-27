'use client';

/* three.js objects are mutated imperatively every frame (the standard react-three-fiber pattern),
   which the React Compiler immutability rule cannot model. */
/* eslint-disable react-hooks/immutability */

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

interface Props {
  /** Renders frames only while true (off-screen / hidden tab pauses the GPU work). */
  active: boolean;
  onReady: () => void;
}

interface Spec {
  x: number;
  z: number;
  w: number;
  h: number;
  d: number;
  hero?: boolean;
}

// Scene units. The tall gold-edged tower echoes the tower in the client's logo.
const TOWERS: Spec[] = [
  { x: -3.5, z: 0.7, w: 1.0, h: 1.6, d: 1.0 },
  { x: -2.3, z: -0.5, w: 1.2, h: 2.7, d: 1.2 },
  { x: -1.0, z: 0.7, w: 1.2, h: 3.5, d: 1.2 },
  { x: 0.5, z: -0.3, w: 1.5, h: 4.9, d: 1.4, hero: true },
  { x: 2.0, z: 0.7, w: 1.2, h: 3.1, d: 1.2 },
  { x: 3.2, z: -0.5, w: 1.0, h: 2.1, d: 1.0 },
  { x: 4.3, z: 0.8, w: 0.8, h: 1.3, d: 0.8 },
];

const GOLD = '#e0b030';
const WINDOW_LIT = ['#f0c64e', '#ffe9b0', '#e0b030', '#8a6d1f'];
const IDLE_GLOW = 0.9;
const HOVER_GLOW = 2.1;

/** Tiny seeded random so the skyline is identical on every visit. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

/** A lit-window facade painted on a canvas (dark glass, a few warm windows). */
function windowTexture(seed: number, cols: number, rows: number) {
  const cell = 24;
  const c = document.createElement('canvas');
  c.width = cols * cell;
  c.height = rows * cell;
  const g = c.getContext('2d')!;
  g.fillStyle = '#0d0b07';
  g.fillRect(0, 0, c.width, c.height);
  const rand = rng(seed);
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      if (rand() < 0.28) continue; // dark window
      g.fillStyle = WINDOW_LIT[Math.floor(rand() * WINDOW_LIT.length)]!;
      g.fillRect(col * cell + 5, r * cell + 5, cell - 10, cell - 9);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function Tower({ spec, index }: { spec: Spec; index: number }) {
  const group = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const { x, z, w, h, d, hero } = spec;

  const { materials, side, textures } = useMemo(() => {
    const tex = windowTexture(index * 977 + 13, Math.round(w * 4), Math.round(h * 3));
    const sideMat = new THREE.MeshStandardMaterial({
      color: '#1a150c',
      map: tex,
      emissive: '#ffffff',
      emissiveMap: tex,
      emissiveIntensity: IDLE_GLOW,
      roughness: 0.55,
      metalness: 0.25,
    });
    const cap = new THREE.MeshStandardMaterial({ color: '#17130b', roughness: 0.6 });
    // BoxGeometry face order: +x, -x, +y, -y, +z, -z
    return {
      materials: [sideMat, sideMat, cap, cap, sideMat, sideMat],
      side: sideMat,
      textures: [tex],
    };
  }, [index, w, h]);
  const edges = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d)), [w, h, d]);

  useEffect(
    () => () => {
      textures.forEach((t) => t.dispose());
      side.dispose();
      edges.dispose();
    },
    [textures, side, edges],
  );

  useFrame(({ clock }, delta) => {
    const g = group.current;
    if (!g) return;
    // Rise in turn, easing out, then settle.
    const t = Math.min(Math.max((clock.elapsedTime - index * 0.16) / 1.3, 0), 1);
    const e = 1 - Math.pow(1 - t, 3);
    g.scale.y = Math.max(e, 0.001);
    g.position.y = (h / 2) * e;
    // Hover: the windows glow brighter.
    const target = hovered ? HOVER_GLOW : IDLE_GLOW;
    side.emissiveIntensity += (target - side.emissiveIntensity) * Math.min(1, delta * 8);
  });

  return (
    <group position={[x, 0, z]}>
      <group
        ref={group}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
      >
        <mesh material={materials}>
          <boxGeometry args={[w, h, d]} />
        </mesh>
        {hero && (
          <>
            <lineSegments geometry={edges}>
              <lineBasicMaterial color={GOLD} />
            </lineSegments>
            <mesh position={[0, h / 2 + 0.25, 0]}>
              <boxGeometry args={[w * 0.5, 0.5, d * 0.5]} />
              <meshStandardMaterial color={GOLD} metalness={0.7} roughness={0.3} />
            </mesh>
            <mesh position={[0, h / 2 + 0.9, 0]}>
              <cylinderGeometry args={[0.025, 0.025, 0.9, 8]} />
              <meshStandardMaterial color={GOLD} emissive={GOLD} emissiveIntensity={0.8} />
            </mesh>
          </>
        )}
      </group>
    </group>
  );
}

/** Three gold stars, a nod to the stars in the logo, slowly turning beside the hero tower. */
function Stars() {
  const group = useRef<THREE.Group>(null);
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 0.28 : 0.12;
      const a = Math.PI / 2 + (i * Math.PI) / 5;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) s.moveTo(px, py);
      else s.lineTo(px, py);
    }
    s.closePath();
    return s;
  }, []);
  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    g.children.forEach((c, i) => {
      c.rotation.y = clock.elapsedTime * 0.8 + i;
      c.position.y = 1.6 + i * 0.75 + Math.sin(clock.elapsedTime * 1.2 + i) * 0.04;
    });
  });
  return (
    <group ref={group} position={[-1.35, 0, 1.4]}>
      {[0, 1, 2].map((i) => (
        <mesh key={i}>
          <extrudeGeometry args={[shape, { depth: 0.06, bevelEnabled: false }]} />
          <meshStandardMaterial
            color={GOLD}
            emissive={GOLD}
            emissiveIntensity={0.7}
            metalness={0.6}
            roughness={0.35}
          />
        </mesh>
      ))}
    </group>
  );
}

function City() {
  const root = useRef<THREE.Group>(null);
  const gl = useThree((s) => s.gl);
  // Drag to turn the city; it keeps a little momentum and a slow idle sway.
  const drag = useRef({ down: false, lastX: 0, vel: 0, offset: 0 });

  useEffect(() => {
    const el = gl.domElement;
    const d = drag.current;
    const down = (e: PointerEvent) => {
      d.down = true;
      d.lastX = e.clientX;
      el.setPointerCapture(e.pointerId);
      el.style.cursor = 'grabbing';
    };
    const move = (e: PointerEvent) => {
      if (!d.down) return;
      const dx = e.clientX - d.lastX;
      d.lastX = e.clientX;
      d.vel = dx * 0.006;
      d.offset = THREE.MathUtils.clamp(d.offset + dx * 0.006, -1.8, 1.8);
    };
    const up = (e: PointerEvent) => {
      d.down = false;
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
      el.style.cursor = 'grab';
    };
    el.style.cursor = 'grab';
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
    };
  }, [gl]);

  useFrame(({ clock, pointer }) => {
    const g = root.current;
    const d = drag.current;
    if (!g) return;
    if (!d.down) {
      d.offset = THREE.MathUtils.clamp(d.offset + d.vel, -1.8, 1.8);
      d.vel *= 0.93;
    }
    const yaw = -0.5 + Math.sin(clock.elapsedTime * 0.22) * 0.28 + d.offset + pointer.x * 0.12;
    const pitch = 0.1 - pointer.y * 0.06;
    g.rotation.y += (yaw - g.rotation.y) * 0.08;
    g.rotation.x += (pitch - g.rotation.x) * 0.08;
  });

  return (
    <group ref={root} position={[0, -1.7, 0]}>
      {TOWERS.map((s, i) => (
        <Tower key={i} spec={s} index={i} />
      ))}
      <Stars />
      {/* Ground: dark disc, a gold rim and a faint grid. */}
      <mesh rotation-x={-Math.PI / 2} position-y={-0.01}>
        <circleGeometry args={[9, 72]} />
        <meshStandardMaterial color="#0f0c07" roughness={0.9} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.005}>
        <ringGeometry args={[8.9, 9, 96]} />
        <meshBasicMaterial color={GOLD} transparent opacity={0.55} />
      </mesh>
      <gridHelper
        args={[18, 36, GOLD, GOLD]}
        position-y={0.004}
        material-transparent
        material-opacity={0.1}
      />
    </group>
  );
}

export default function HeroScene({ active, onReady }: Props) {
  return (
    <Canvas
      frameloop={active ? 'always' : 'never'}
      dpr={[1, 1.75]}
      camera={{ position: [0, 2.4, 11.5], fov: 32 }}
      gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
      style={{ touchAction: 'pan-y' }}
      onCreated={({ camera }) => {
        camera.lookAt(0, 2.1, 0);
        onReady();
      }}
      aria-hidden
    >
      <fog attach="fog" args={['#0b0a07', 11, 24]} />
      <ambientLight intensity={0.55} color="#fff1d0" />
      <directionalLight position={[5, 8, 6]} intensity={1.7} color="#ffe2a0" />
      <pointLight position={[0.5, 6.5, 2.5]} intensity={30} distance={16} color={GOLD} />
      <City />
    </Canvas>
  );
}
