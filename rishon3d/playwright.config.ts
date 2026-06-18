import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./test",
  testMatch: /.*\.spec\.ts/,
  webServer: {
    command: "npm run dev -- --port 5191",
    url: "http://localhost:5191",
    reuseExistingServer: false,
    timeout: 60000,
  },
  use: {
    baseURL: "http://localhost:5191",
    launchOptions: {
      args: [
        "--use-gl=angle",
        "--use-angle=swiftshader",
        "--enable-unsafe-swiftshader",
      ],
    },
  },
});
