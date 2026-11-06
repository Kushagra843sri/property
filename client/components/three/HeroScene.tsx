'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

interface Props {
  /** Renders frames only while true (off-screen / hidden tab pauses the GPU work). */
  active: boolean;
  /** Mobile / low-power: fewer buildings, no pointer reaction, DPR 1. */
  light: boolean;
  onReady: () => void;
}

// [x, z, width, height, depth] in scene units; deterministic so the poster matches the scene.
const FULL: [number, number, number, number, number][] = [
  [-2.4, -0.6, 1.1, 2.2, 1.1],
  [-1.0, 0.4, 1.2, 3.4, 1.2],
  [0.5, -0.4, 1.4, 4.4, 1.3],
  [2.0, 0.5, 1.1, 2.6, 1.1],
  [3.1, -0.7, 0.9, 1.7, 0.9],
  [-3.3, 0.7, 0.8, 1.4, 0.8],
];
const LIGHT = FULL.slice(0, 4);

const cssVar = (name: string) =>
  typeof document === 'undefined'
    ? ''
    : getComputedStyle(document.documentElement).getPropertyValue(name).trim();

function Tower({
  spec,
  index,
  color,
}: {
  spec: (typeof FULL)[number];
  index: number;
  color: string;
}) {
  const ref = useRef<THREE.Group>(null);
  const [x, z, w, h, d] = spec;
  const geometry = useMemo(
    () => new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d)),
    [w, h, d],
  );
  // Floor lines make it read as a building, not a box.
  const floors = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let y = -h / 2 + 0.55; y < h / 2 - 0.2; y += 0.55) {
      const hw = w / 2;
      const hd = d / 2;
      pts.push(
        new THREE.Vector3(-hw, y, hd),
        new THREE.Vector3(hw, y, hd),
        new THREE.Vector3(hw, y, hd),
        new THREE.Vector3(hw, y, -hd),
      );
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [w, h, d]);

  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g) return;
    // Assemble: each tower rises in turn, easing out.
    const t = Math.min(Math.max((clock.elapsedTime - index * 0.18) / 1.4, 0), 1);
    const e = 1 - Math.pow(1 - t, 3);
    g.scale.y = Math.max(e, 0.001);
    g.position.y = (h / 2) * e;
  });

  return (
    <group position={[x, 0, z]}>
      <group ref={ref}>
        <lineSegments geometry={geometry}>
          <lineBasicMaterial color={color} />
        </lineSegments>
        <lineSegments geometry={floors}>
          <lineBasicMaterial color={color} transparent opacity={0.45} />
        </lineSegments>
      </group>
    </group>
  );
}

function City({ light }: { light: boolean }) {
  const root = useRef<THREE.Group>(null);
  const ink = useMemo(() => cssVar('--forest') || cssVar('--ink'), []);
  const accent = useMemo(() => cssVar('--brass') || ink, [ink]);
  const specs = light ? LIGHT : FULL;

  useFrame(({ clock, pointer }) => {
    const g = root.current;
    if (!g) return;
    const px = light ? 0 : pointer.x;
    const py = light ? 0 : pointer.y;
    const targetY = -0.55 + clock.elapsedTime * 0.06 + px * 0.35;
    const targetX = 0.18 - py * 0.12;
    g.rotation.y += (targetY - g.rotation.y) * 0.05;
    g.rotation.x += (targetX - g.rotation.x) * 0.05;
  });

  return (
    <group ref={root} position={[0, -1.6, 0]}>
      {specs.map((s, i) => (
        <Tower key={i} spec={s} index={i} color={i === 2 ? accent : ink} />
      ))}
      <gridHelper args={[10, 20, ink, ink]} position={[0, 0, 0]}>
        <meshBasicMaterial transparent opacity={0.12} />
      </gridHelper>
    </group>
  );
}

export default function HeroScene({ active, light, onReady }: Props) {
  return (
    <Canvas
      frameloop={active ? 'always' : 'never'}
      dpr={light ? 1 : [1, 1.75]}
      camera={{ position: [0, 1.4, 9], fov: 34 }}
      gl={{ alpha: true, antialias: !light, powerPreference: 'low-power' }}
      onCreated={onReady}
      aria-hidden
    >
      <City light={light} />
    </Canvas>
  );
}
