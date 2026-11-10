import { useThree } from "@react-three/fiber";

/** Points the default camera at a target (R3F's default camera looks at the origin). */
export const CameraRig: React.FC<{
  position: [number, number, number];
  target: [number, number, number];
}> = ({ position, target }) => {
  const camera = useThree((s) => s.camera);
  camera.position.set(...position);
  camera.lookAt(...target);
  return null;
};
