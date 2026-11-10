import { z } from "zod";
import { AbsoluteFill, Audio, staticFile, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { Scene } from "./scenes/Scene";
import { Captions } from "./components/Captions";
import { Title } from "./components/Title";

export const helloThreeSchema = z.object({
  title: z.string(),
  subtitle: z.string(),
  captionsFile: z.string(),
  audioFile: z.string(),
  accent: z.string(),
});

type Props = z.infer<typeof helloThreeSchema>;

export const HelloThree: React.FC<Props> = ({
  title,
  subtitle,
  captionsFile,
  audioFile,
  accent,
}) => {
  const { width, height } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: "#07060f" }}>
      <ThreeCanvas
        width={width}
        height={height}
        camera={{ fov: 45, position: [0, 0, 8] }}
        gl={{ antialias: true }}
      >
        <Scene accent={accent} />
      </ThreeCanvas>
      <Title title={title} subtitle={subtitle} accent={accent} />
      <Captions file={captionsFile} accent={accent} />
      <Audio src={staticFile(audioFile)} />
    </AbsoluteFill>
  );
};
