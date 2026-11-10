import { Composition } from "remotion";
import { HelloThree, helloThreeSchema } from "./HelloThree";

export const FPS = 30;

export const RemotionRoot: React.FC = () => {
  return (
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
  );
};
