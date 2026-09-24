import { defineConfig, devices } from "@playwright/test";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3100";

export default defineConfig({
  testDir: "./e2e",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: { baseURL: BASE, trace: "retain-on-failure", screenshot: "only-on-failure", locale: "pt-BR" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, testIgnore: /responsivo\.spec\.ts/ },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /responsivo\.spec\.ts/ },
  ],
  // Com E2E_BASE_URL definido (ex.: contra o Docker Compose) nenhum servidor é iniciado.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : [
        {
          command: "node scripts/mock-api.mjs",
          url: "http://localhost:8001/api/v1/saude",
          reuseExistingServer: false,
          timeout: 30_000,
          env: { MOCK_PORT: "8001" },
        },
        {
          command: "npm run build && npx next start -p 3100",
          url: BASE,
          reuseExistingServer: false,
          timeout: 300_000,
          env: { API_INTERNAL_URL: "http://localhost:8001" },
        },
      ],
});
