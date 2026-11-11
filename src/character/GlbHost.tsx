import { useGLTF } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useMemo } from "react";
import { staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { KTX2Loader } from "three-stdlib";

export type GlbHostProps = {
  /** Path in public/, e.g. "host/host-avatar.glb" */
  src: string;
  /** 0..1 jaw/mouth opening, e.g. from mouthOpenAt() */
  mouthOpen?: number;
  talking?: boolean;
  /** 0..1 resting smile */
  smile?: number;
  /** -1 (left) .. 1 (right) */
  lookX?: number;
  /** Name of an animation clip in the file to play (e.g. an idle/talk body animation) */
  animation?: string;
  /** The model is auto-scaled to this height (world units) and centred on `position` */
  height?: number;
  position?: [number, number, number];
  rotationY?: number;
};

let ktx2: KTX2Loader | null = null;

/**
 * Plays a realistic rigged avatar (.glb) as the host. Works with avatars that have
 * ARKit-style face blendshapes (jawOpen, eyeBlinkLeft / eyeBlink_L, ...) and/or
 * viseme blendshapes (viseme_aa, viseme_O, ...). Everything is driven from the frame number.
 */
export const GlbHost: React.FC<GlbHostProps> = ({
  src,
  mouthOpen = 0,
  talking = false,
  smile = 0.15,
  lookX = 0,
  animation,
  height = 3,
  position = [0, 0, 0],
  rotationY = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const gl = useThree((s) => s.gl);
  const t = frame / fps;

  const gltf = useGLTF(staticFile(src), false, true, (loader) => {
    if (!ktx2) {
      ktx2 = new KTX2Loader().setTranscoderPath(staticFile("basis/")).detectSupport(gl);
    }
    loader.setKTX2Loader(ktx2);
  });

  // Fit the model to `height` and centre it.
  const fit = useMemo(() => {
    const box = new THREE.Box3().setFromObject(gltf.scene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const s = height / Math.max(size.y, 1e-6);
    return { scale: s, offset: center.multiplyScalar(-s) };
  }, [gltf.scene, height]);

  // Meshes with blendshapes, with names normalised (eyeBlink_L -> eyeblinkleft).
  const faces = useMemo(() => {
    const list: { mesh: THREE.Mesh; idx: Map<string, number> }[] = [];
    gltf.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && m.morphTargetDictionary && m.morphTargetInfluences) {
        const idx = new Map<string, number>();
        for (const [name, i] of Object.entries(m.morphTargetDictionary)) idx.set(normalise(name), i);
        list.push({ mesh: m, idx });
      }
    });
    return list;
  }, [gltf.scene]);

  const headBone = useMemo(() => {
    let found: THREE.Object3D | null = null;
    gltf.scene.traverse((o) => {
      if (!found && (o as THREE.Bone).isBone && /(^|:)head$/i.test(o.name)) found = o;
    });
    return found as THREE.Object3D | null;
  }, [gltf.scene]);
  const headRest = useMemo(() => headBone?.rotation.clone(), [headBone]);

  const mixer = useMemo(() => {
    if (!animation) return null;
    const clip = gltf.animations.find((a) => a.name === animation);
    if (!clip) return null;
    const mx = new THREE.AnimationMixer(gltf.scene);
    mx.clipAction(clip).play();
    return mx;
  }, [animation, gltf]);

  // No body clip: lower the arms from the T/A-pose into a relaxed pose, once.
  useMemo(() => {
    if (mixer) return;
    relaxArms(gltf.scene);
  }, [mixer, gltf.scene]);

  // ---- Drive the face for this frame ----
  if (mixer) mixer.setTime(t);

  const blinkPhase = (frame + 11) % 110;
  const blink = blinkPhase < 5 ? Math.sin((blinkPhase / 5) * Math.PI) : 0;
  const talk = talking ? 1 : 0;
  const v = (k: number) => Math.abs(Math.sin(t * k)); // syllable variation
  const look = Math.max(-1, Math.min(1, lookX));

  const targets: Record<string, number> = {
    jawopen: mouthOpen * 0.55,
    mouthfunnel: mouthOpen * 0.25 * v(5.3),
    mouthpucker: mouthOpen * 0.15 * v(3.1),
    mouthlowerdownleft: mouthOpen * 0.4,
    mouthlowerdownright: mouthOpen * 0.4,
    mouthupperupleft: mouthOpen * 0.2,
    mouthupperupright: mouthOpen * 0.2,
    mouthsmileleft: smile + talk * 0.05,
    mouthsmileright: smile + talk * 0.05,
    eyeblinkleft: blink,
    eyeblinkright: blink,
    eyesquintleft: smile * 0.5,
    eyesquintright: smile * 0.5,
    browinnerup: talk * 0.25 * v(1.7),
    browouterupleft: talk * 0.15 * v(1.3),
    browouterupright: talk * 0.15 * v(1.3),
    eyelookoutleft: Math.max(0, -look),
    eyelookinright: Math.max(0, -look),
    eyelookinleft: Math.max(0, look),
    eyelookoutright: Math.max(0, look),
    // Viseme-style avatars
    viseme_aa: mouthOpen * 0.8,
    viseme_o: mouthOpen * 0.4 * v(4.1),
    viseme_e: mouthOpen * 0.3 * v(6.7),
    viseme_sil: 1 - mouthOpen,
  };
  // Applied after the body clip, so lip-sync and blinks work with or without an animation.
  for (const { mesh, idx } of faces) {
    for (const [name, value] of Object.entries(targets)) {
      const i = idx.get(name);
      if (i !== undefined) mesh.morphTargetInfluences![i] = Math.max(0, Math.min(1, value));
    }
  }

  // Head motion: rotate the head bone if there is one, otherwise the whole model.
  const nod = talking ? Math.sin(t * 6.5) * 0.04 : 0;
  const headRot = new THREE.Euler(
    Math.sin(t * 0.9) * 0.03 + nod,
    Math.sin(t * 0.6) * 0.08 + look * 0.25,
    Math.sin(t * 0.45) * 0.03,
  );
  if (headBone && headRest) {
    headBone.rotation.set(headRest.x + headRot.x, headRest.y + headRot.y, headRest.z + headRot.z);
  }

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <group rotation={headBone ? [0, 0, 0] : [headRot.x, headRot.y, headRot.z]}>
        <primitive object={gltf.scene} scale={fit.scale} position={fit.offset} />
      </group>
    </group>
  );
};

const normalise = (name: string) =>
  name
    .replace(/[_.]L$/i, "Left")
    .replace(/[_.]R$/i, "Right")
    .toLowerCase();

/** Find a bone by common rig names (Mixamo "mixamorig:LeftArm", Avaturn/RPM "LeftArm", "upperarm_l"...). */
const findBone = (root: THREE.Object3D, patterns: RegExp[]) => {
  let found: THREE.Bone | null = null;
  root.traverse((o) => {
    if (!found && (o as THREE.Bone).isBone && patterns.some((p) => p.test(o.name))) found = o as THREE.Bone;
  });
  return found as THREE.Bone | null;
};

/**
 * Rotates each upper arm so it points down along the body (slightly out and forward),
 * and bends the elbows a little. Works for any rig orientation: the rotation is solved
 * in world space from where the elbow currently is.
 */
const relaxArms = (root: THREE.Object3D) => {
  root.updateMatrixWorld(true);
  for (const side of ["Left", "Right"] as const) {
    const l = side === "Left";
    const arm = findBone(root, [new RegExp(`(^|:)${side}Arm$`, "i"), new RegExp(`upper_?arm[_.]?${l ? "l" : "r"}$`, "i")]);
    const fore = findBone(root, [new RegExp(`(^|:)${side}ForeArm$`, "i"), new RegExp(`(fore|lower)_?arm[_.]?${l ? "l" : "r"}$`, "i")]);
    if (!arm || !fore || !arm.parent) continue;
    const shoulder = arm.getWorldPosition(new THREE.Vector3());
    const elbow = fore.getWorldPosition(new THREE.Vector3());
    const current = elbow.clone().sub(shoulder).normalize();
    // Outward = the side the elbow is on now (T-pose arms point sideways).
    const out = Math.sign(current.x) || (l ? 1 : -1);
    const wanted = new THREE.Vector3(0.18 * out, -1, 0.08).normalize();
    const delta = new THREE.Quaternion().setFromUnitVectors(current, wanted);
    // Apply the world-space delta to the bone's world rotation, then convert back to local.
    const parentWorld = arm.parent.getWorldQuaternion(new THREE.Quaternion());
    const armWorld = arm.getWorldQuaternion(new THREE.Quaternion());
    arm.quaternion.copy(parentWorld.clone().invert().multiply(delta.multiply(armWorld)));
    root.updateMatrixWorld(true);
    // Slight elbow bend toward the front.
    const hand = fore.children.find((c) => (c as THREE.Bone).isBone);
    if (hand) {
      const e = fore.getWorldPosition(new THREE.Vector3());
      const h = hand.getWorldPosition(new THREE.Vector3());
      const cur = h.sub(e).normalize();
      const bent = new THREE.Vector3(0.1 * out, -0.85, 0.5).normalize();
      const d = new THREE.Quaternion().setFromUnitVectors(cur, bent);
      const pw = fore.parent!.getWorldQuaternion(new THREE.Quaternion());
      const fw = fore.getWorldQuaternion(new THREE.Quaternion());
      fore.quaternion.copy(pw.invert().multiply(d.multiply(fw)));
      root.updateMatrixWorld(true);
    }
  }
};
