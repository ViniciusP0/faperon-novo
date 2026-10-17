import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.mjs"],
    css: false,
    // Node 25+ expõe um localStorage próprio (undefined sem --localstorage-file) que esconde o do jsdom.
    poolOptions: { forks: { execArgv: ["--no-experimental-webstorage"] }, threads: { execArgv: ["--no-experimental-webstorage"] } },
  },
});
