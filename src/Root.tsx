import { Composition } from "remotion";
import { HelloThree, helloThreeSchema } from "./HelloThree";
import { CharacterFaceTest, CharacterTurnaround } from "./CharacterTurnaround";
import { CharacterShort, characterShortSchema } from "./CharacterShort";
import { FacelessShort, calculateFacelessMetadata, facelessShortSchema } from "./FacelessShort";

export const FPS = 30;

export const RemotionRoot: React.FC = () => {
  return (
    <>
    <Composition
      id="HelloThree"
      component={HelloThree}
      durationInFrames={10 * FPS}
      fps={FPS}
      width={1920}
      height={1080}
      schema={helloThreeSchema}
      defaultProps={{
        title: "3D Videos",
        subtitle: "Three.js × Remotion",
        captionsFile: "captions.json",
        audioFile: "music.mp3",
        accent: "#7c5cff",
      }}
    />
    <Composition
      id="CharacterTurnaround"
      component={CharacterTurnaround}
      durationInFrames={6 * FPS}
      fps={FPS}
      width={1080}
      height={1080}
    />
    <Composition
      id="FacelessShort"
      component={FacelessShort}
      durationInFrames={20 * FPS}
      fps={FPS}
      width={1080}
      height={1920}
      schema={facelessShortSchema}
      calculateMetadata={calculateFacelessMetadata}
      defaultProps={{
        voice: "demo",
        hook: "*Faceless* channels just got easy",
        beats: [
          { at: 0, layout: "host" as const, gesture: "wave" as const },
          { at: 2.9, layout: "split" as const, gesture: "explain" as const, title: "Meet the *host*" },
          { at: 5.2, layout: "host" as const, gesture: "explain" as const },
          { at: 8.8, layout: "card" as const, title: "How it *works*", items: ["I write the script", "AI does the voice", "The video edits itself"] },
          { at: 13.1, layout: "split" as const, gesture: "explain" as const, title: "All *automatic*", items: ["Captions", "Graphics", "Music"], flash: true },
          { at: 15.9, layout: "host" as const, gesture: "point" as const },
        ],
        keywords: ["face", "3D", "AI", "script", "captions", "camera"],
        musicFile: "music.mp3",
        musicVolume: 0.125,
      }}
    />
    <Composition
      id="CharacterFaceTest"
      component={CharacterFaceTest}
      durationInFrames={6 * FPS}
      fps={FPS}
      width={1080}
      height={1350}
    />
    <Composition
      id="CharacterShort"
      component={CharacterShort}
      durationInFrames={10 * FPS}
      fps={FPS}
      width={1080}
      height={1920}
      schema={characterShortSchema}
      defaultProps={{
        headline: "Meet your new host",
        footer: "Follow for more",
        captionsFile: "short-captions.json",
        voiceFile: "",
        musicFile: "music.mp3",
        musicVolume: 0.5,
        gestures: [
          { at: 0.3, gesture: "wave" as const },
          { at: 2.6, gesture: "idle" as const },
          { at: 4.2, gesture: "explain" as const },
          { at: 7.2, gesture: "point" as const },
        ],
        accent: "#3d6bff",
        host: "3d" as const,
        hostImage: "host/host-portrait.png",
        hostVideo: "host/host-talking.mp4",
        hostFocusY: 25,
        hostModel: "host/host-avatar.glb",
        hostAnimation: "",
        hostModelHeight: 3.2,
      }}
    />
    </>
  );
};
