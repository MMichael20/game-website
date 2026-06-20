import { defineConfig } from "vitest/config";

// Tests are PAUSED during bootstrap (see CLAUDE.md PITFALL 2). The old suite is
// parked in `_archive-tests/` (not run, not deleted). `passWithNoTests` keeps
// `vitest run` green while there are no active tests.
export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    passWithNoTests: true,
  },
});
