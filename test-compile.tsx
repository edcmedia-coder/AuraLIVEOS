import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
function App() {
  const points = new Float32Array(9);
  return (
    <bufferAttribute
      attach="attributes-position"
      args={[points, 3]}
    />
  );
}
