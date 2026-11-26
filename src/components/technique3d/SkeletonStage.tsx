'use client';

import { useEffect, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as THREE from 'three';
import type { PoseFrame } from '@/lib/technique3d/types';

// three.js and @react-three/fiber are MIT. The skeleton is an estimate, not a body scan.

const BONES: Array<[number, number]> = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24],
  [23, 25], [25, 27], [27, 31], [24, 26], [26, 28], [28, 32],
  [0, 11], [0, 12],
];

function Controls() {
  const { camera, gl } = useThree();
  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement);
    controls.enablePan = false;
    controls.target.set(0, 0.4, 0);
    controls.update();
    return () => controls.dispose();
  }, [camera, gl]);
  return null;
}

function Bones({ frame, color, position }: { frame: PoseFrame | null; color: string; position: [number, number, number] }) {
  const geometry = useMemo(() => new THREE.BufferGeometry(), []);
  useEffect(() => {
    const positions: number[] = [];
    if (frame) {
      for (const [a, b] of BONES) {
        const start = frame[a];
        const end = frame[b];
        if (!start || !end) continue;
        positions.push(start[0], start[1], start[2], end[0], end[1], end[2]);
      }
    }
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.computeBoundingSphere();
  }, [frame, geometry]);
  return (
    <lineSegments geometry={geometry} position={position}>
      <lineBasicMaterial color={color} />
    </lineSegments>
  );
}

export function SkeletonStage({
  player,
  reference,
  layout,
}: {
  player: PoseFrame | null;
  reference: PoseFrame | null;
  layout: 'player' | 'reference' | 'side' | 'overlay';
}) {
  const side = layout === 'side';
  return (
    <Canvas camera={{ position: [1.8, 1.3, 2.6], fov: 40 }} style={{ width: '100%', height: 360, background: '#07111f', borderRadius: 12 }}>
      <color attach="background" args={['#07111f']} />
      <Controls />
      {player && layout !== 'reference' && <Bones frame={player} color="#7dd3fc" position={side ? [-0.8, 0, 0] : [0, 0, 0]} />}
      {reference && layout !== 'player' && <Bones frame={reference} color="#fbbf24" position={side ? [0.8, 0, 0] : [0, 0, 0]} />}
    </Canvas>
  );
}
