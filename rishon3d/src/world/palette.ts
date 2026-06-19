// rishon3d/src/world/palette.ts
// Central saturated color palette for the voxel-daytime look. One source of
// truth so the whole city can be retuned here. Values are THREE hex numbers.

export function isHexColor(n: number): boolean {
  return Number.isInteger(n) && n >= 0 && n <= 0xffffff;
}

export const PALETTE = {
  // sky / ambient
  skyBlue: 0x6fb7ff,
  hemiSky: 0xbfe3ff,
  hemiGround: 0x7fa45a,
  sunWarm: 0xfff4e0,
  ambient: 0xcfe2f7,
  cloud: 0xffffff,
  // ground / streets
  grass: 0x6db24a,
  parkGrass: 0x5fa83f,
  asphalt: 0x3a3a42,
  sidewalk: 0xc8c6c0,
  curb: 0xd8d6cf,
  laneLine: 0xf3ecd0,
  parkPath: 0xcdbb95,
  // props
  trunk: 0x8a5a2b,
  leaf: 0x5cc24a,
  leafDeep: 0x49ab3c,
  bush: 0x57b04a,
  benchWood: 0xa9692f,
  lampPole: 0x2b2b30,
  lantern: 0xffd98a,
  lanternGlow: 0xffb84d,
  // house
  houseBody: 0xf3d29a,
  houseRoof: 0xc0392b,
  // awnings
  awningRed: 0xc0392b,
  awningBlue: 0x2980b9,
  awningStripe: 0xf5f3ee,
  // rail
  railConcrete: 0xb9b6ae,
  railDeck: 0x9aa0a6,
  // building facades (window grid + storefront + trim)
  glass: 0x8fb8d8,        // cool window glass
  glassDark: 0x5e88a8,    // shaded glass panel
  frame: 0xe8e6df,        // light mullion / window frame
  storefront: 0x9fd0e8,   // bright ground-floor glass
  cornice: 0xb9b4a8,      // top trim band
  roofCap: 0x9a958c,      // flat roof top
  // facade purpose (typed ground-floor identities)
  facadeDoor: 0x4a3b2e,   // dark entrance door
  officeGlass: 0x6f97b8,  // cooler uniform office curtain-wall glass
  signWarm: 0xd9533b,     // restaurant sign band (warm)
  signCool: 0x2f7fb0,     // shop/office sign band (cool)
  signLit: 0xffd98a,      // lit sign text/glow
  balconyRail: 0x8c8780,  // apartment balcony box/rail
  entryPad: 0xb4afa4,     // concrete entry pad at the door
  // streets
  crosswalk: 0xf3ecd0,    // crosswalk stripe (warm white)
  yellowLine: 0xf2c14e,   // double-yellow center line
  sidewalkGrout: 0xa9a79f, // tile grout lines on sidewalks
  // street furniture
  flowerStem: 0x4f9a3a,   // flower-bed base green
  flowerYellow: 0xf2c14e,
  flowerRed: 0xe0524a,
  flowerWhite: 0xf3efe6,
  trashCan: 0x2f6b4a,     // dark-green bin
  hedge: 0x4f9a3a,        // clipped planter hedge
  planterStone: 0xbdb7a8, // planter rim
} as const;

// Saturated building bodies for the hand-authored core buildings.
export const BUILDING_COLORS: number[] = [
  0xf2c14e, // warm yellow
  0xe07a5f, // terracotta
  0xe9c46a, // sand
  0x6aa9c9, // blue glass
  0xd96c5f, // brick red
  0x84b06a, // mint
  0xc98ab0, // mauve
  0xe6b89c, // peach
];

// Per-district body palettes (saturated, with a slight regional bias).
export const DISTRICT_PALETTES: Record<string, number[]> = {
  north: [0x6aa9c9, 0x7fb5d6, 0x9ac6e0], // blue-glass downtown
  east: [0xf2c14e, 0xe9c46a, 0xe6b89c],  // warm market
  south: [0xe07a5f, 0xd96c5f, 0xc98ab0], // brick + accents
  west: [0x84b06a, 0x9ac06a, 0x6aa9c9],  // green + glass
};
