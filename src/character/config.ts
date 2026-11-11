// Official host character: a stylized 3D take on the channel owner's selfie.
// Every video that uses a graphic character should render <HostCharacter />,
// so changes to the look here apply across all videos.

export const CHARACTER = {
  name: "Host",
  colors: {
    skin: "#7a5241", // sampled from cheek/nose in the reference photo
    skinShadow: "#5e3e32",
    skinSheen: "#d9a58c", // warm subsurface-like sheen on the skin
    lips: "#5c3a35",
    mouth: "#2a1210",
    teeth: "#efe6da",
    tongue: "#a5535a",
    eyeWhite: "#ece2d4",
    iris: "#2b1b13",
    hair: "#1c1411", // locs, brows, beard
    hairLight: "#2c201a", // a few lighter locs for depth
    durag: "#141419", // black durag / wave cap
    shirt: "#d08e88", // dusty-rose crewneck tee
    shirtShadow: "#b77571",
  },
  // How many locs hang from under the durag
  locCount: 26,
} as const;

export type CharacterColors = typeof CHARACTER.colors;
