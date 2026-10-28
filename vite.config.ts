
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  define: {
    global: "globalThis",
  },
  optimizeDeps: {
    include: ["buffer"],
  },
  server: {
    host: "0.0.0.0",
  },
});
