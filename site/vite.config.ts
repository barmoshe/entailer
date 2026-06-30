import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Project Pages live under /entailer/; dev serves from / for convenience.
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/entailer/" : "/",
  plugins: [react()],
}));
