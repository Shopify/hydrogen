import {Suspense, useEffect, useMemo, useState} from 'react';
import {Canvas} from '@react-three/fiber';
import {Environment, OrbitControls, useTexture} from '@react-three/drei';
import * as THREE from 'three';

function ShirtMesh({designUrl}: {designUrl?: string}) {
  const colorMap = useTexture(
    designUrl ||
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAA' +
        'AAC0lEQVR42mP8/58HAAMBAQAYjtJQAAAAAElFTkSuQmCC',
  );

  const material = useMemo(() => new THREE.MeshStandardMaterial({color: 'white'}), []);
  material.map = colorMap as any;
  material.needsUpdate = true;

  return (
    <mesh castShadow receiveShadow position={[0, 0, 0]}>
      <cylinderGeometry args={[0.7, 0.7, 1.0, 36, 1, true]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

export function ThreeTShirtViewer({designUrl}: {designUrl?: string}) {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <div style={{width: '100%', height: 420}} />;
  }

  return (
    <div style={{width: '100%', height: 420}}>
      <Canvas camera={{position: [1.6, 1.2, 1.6], fov: 40}} shadows>
        <ambientLight intensity={0.5} />
        <directionalLight position={[2, 3, 2]} intensity={0.8} castShadow />
        <Suspense fallback={null}>
          <ShirtMesh designUrl={designUrl} />
          <Environment preset="city" />
        </Suspense>
        <OrbitControls enablePan enableZoom enableRotate />
      </Canvas>
    </div>
  );
}
