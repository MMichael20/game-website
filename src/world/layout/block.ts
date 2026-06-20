// DEFERRED — designed, not built. See
// docs/superpowers/specs/2026-06-21-city-layout-foundations-design.md
//
// A `block` will place a group of lots over a w×h region of grid cells and add the
// roads bounding it, returning Placement[] exactly like lot(). It will call lot()
// per parcel and a future road helper for the perimeter. Intentionally unimplemented:
// build it when a second neighbourhood is actually needed, not before (YAGNI).
export {};
