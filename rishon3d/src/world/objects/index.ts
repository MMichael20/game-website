// rishon3d/src/world/objects/index.ts
//
// Barrel + registry for the reusable object library. Import any factory from
// here, and use OBJECT_LIBRARY (name -> labelled, recolored variants) to drive
// the #objects dev preview and any future placement/authoring tooling.

import * as THREE from "three";
import { makeFlower, FLOWER_PRESETS } from "./flower";
import { makePottedPlant } from "./pottedPlant";
import { makeCake } from "./cake";
import { makeCupcake } from "./cupcake";
import { makeDonut } from "./donut";
import { makeIceCream, ICE_CREAM_PRESETS } from "./iceCream";
import { makeDrinkCup, DRINK_PRESETS } from "./drinkCup";
import { makeUmbrella } from "./umbrella";
import { makePhone, PHONE_SCREENS } from "./phone";
import { FROSTING, SPONGE, GLAZE, DRINK } from "./objectPalette";

export * from "./voxel";
export * from "./flower";
export * from "./pottedPlant";
export * from "./cake";
export * from "./cupcake";
export * from "./donut";
export * from "./iceCream";
export * from "./drinkCup";
export * from "./umbrella";
export * from "./phone";

export interface ObjectVariant { label: string; geo: () => THREE.BufferGeometry }
export interface ObjectEntry { name: string; variants: ObjectVariant[] }

const iceCreamPresets = Object.entries(ICE_CREAM_PRESETS).slice(0, 4);
const drinkPresets = Object.entries(DRINK_PRESETS).slice(0, 4);

// A catalog of every object plus a few recolored variants, proving the configs
// actually retune the objects (this is the whole point of the library).
export const OBJECT_LIBRARY: ObjectEntry[] = [
  { name: "flower", variants: FLOWER_PRESETS.map((c, i) => ({ label: `flower ${i}`, geo: () => makeFlower(c) })) },
  { name: "pottedPlant", variants: [
    { label: "bloom", geo: () => makePottedPlant() },
    { label: "leafy", geo: () => makePottedPlant({ bloom: false }) },
  ] },
  { name: "cake", variants: [
    { label: "vanilla", geo: () => makeCake() },
    { label: "chocolate", geo: () => makeCake({ spongeColor: SPONGE.chocolate, frostingColor: FROSTING.chocolate }) },
    { label: "pink 3-tier", geo: () => makeCake({ frostingColor: FROSTING.pink, tiers: 3 }) },
    { label: "sliced", geo: () => makeCake({ slice: true }) },
  ] },
  { name: "cupcake", variants: [
    { label: "pink", geo: () => makeCupcake() },
    { label: "mint", geo: () => makeCupcake({ frostingColor: FROSTING.mint }) },
    { label: "lemon", geo: () => makeCupcake({ frostingColor: FROSTING.lemon }) },
  ] },
  { name: "donut", variants: [
    { label: "pink", geo: () => makeDonut() },
    { label: "chocolate", geo: () => makeDonut({ glazeColor: GLAZE.chocolate }) },
    { label: "plain", geo: () => makeDonut({ glazed: false }) },
  ] },
  { name: "iceCream", variants: iceCreamPresets.map(([label, c]) => ({ label, geo: () => makeIceCream(c) })) },
  { name: "drinkCup", variants: drinkPresets.map(([label, c]) => ({ label, geo: () => makeDrinkCup({ ...c, drinkColor: (DRINK as Record<string, number>)[label] }) })) },
  { name: "umbrella", variants: [
    { label: "red", geo: () => makeUmbrella() },
    { label: "blue", geo: () => makeUmbrella({ colorA: 0x2980b9 }) },
  ] },
  { name: "phone", variants: PHONE_SCREENS.slice(0, 4).map((c, i) => ({ label: `phone ${i}`, geo: () => makePhone({ screenColor: c }) })) },
];
