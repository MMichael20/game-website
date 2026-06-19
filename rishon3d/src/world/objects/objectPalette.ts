// rishon3d/src/world/objects/objectPalette.ts
//
// Color sets for the object library (food flavors, glazes, petals, drinks). Kept
// separate from the city palette.ts so object/food colors don't bloat the world
// palette. Every object's config defaults pull from here, and callers can pass
// any of these (or their own hex) to recolor an object.

// Cake / bakery
export const SPONGE = {
  vanilla: 0xf3deb0,
  chocolate: 0x6b3f24,
  redVelvet: 0xb23b3b,
  matcha: 0x9bc46a,
} as const;

export const FROSTING = {
  cream: 0xfbf3e4,
  pink: 0xf3a6c0,
  chocolate: 0x7a4a30,
  mint: 0xa7e0c6,
  lemon: 0xf6e07a,
} as const;

// Ice-cream flavors (scoops)
export const FLAVOR = {
  vanilla: 0xf6ecd0,
  strawberry: 0xf3a0b4,
  chocolate: 0x6b432a,
  mint: 0x9fe0bf,
  pistachio: 0xb6d18a,
  mango: 0xf6c14e,
  blueberry: 0x8497d6,
} as const;

export const CONE = 0xd9a05a;          // waffle cone
export const CONE_DARK = 0xbf8540;     // waffle cross-hatch shade

// Donut
export const DOUGH = 0xd8a463;
export const GLAZE = {
  pink: 0xf3a6c0,
  chocolate: 0x6b432a,
  white: 0xf3efe6,
  caramel: 0xd9a05a,
} as const;

// Sprinkles / cherries / berries
export const SPRINKLES = [0xe0524a, 0xf2c14e, 0x4f7fd9, 0x6db24a, 0xf3a6c0, 0xf3efe6] as const;
export const CHERRY = 0xc62b34;
export const CHERRY_STEM = 0x6b4a2a;

// Drinks
export const DRINK = {
  cola: 0x3a241a,
  orange: 0xf3902c,
  lemon: 0xf6e07a,
  berry: 0xb24b8a,
  water: 0xbfe3ff,
} as const;
export const CUP_PLASTIC = 0xf3efe6;
export const CUP_LID = 0xdfe6ec;
export const STRAW = 0xe0524a;

// Flowers
export const PETAL = [0xe0524a, 0xf2c14e, 0xf3a6c0, 0xf3efe6, 0x9a7bd0, 0xf08a3c] as const;
export const PETAL_CENTER = 0xf2c14e;
export const STEM = 0x4f9a3a;
export const LEAF = 0x57b04a;

// Plant pots
export const POT_TERRACOTTA = 0xc5703a;
export const POT_SOIL = 0x3a2a1c;

// Glass panels (storefront windows, office facades, doors)
export const GLASS = {
  pane:        0xc8e0f0,  // light sky-blue tint for glass
  frame:       0x6a8a9e,  // grey-blue aluminium frame
  highlight:   0xe8f4fc,  // bright reflective strip baked near top of frame
  silhouette:  0x1a2a38,  // dim interior shadow plane
  handleColor: 0x8aabcc,  // door handle bar
  paneOffice:  0xb8d4e8,  // cooler blue tint for office glazing
  frameOffice: 0x9aabb8,  // lighter grey frame for office facades
} as const;
