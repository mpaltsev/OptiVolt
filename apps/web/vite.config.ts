import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  // Catalog sits outside apps/web — allow JSON imports from packages/
  server: {
    fs: {
      allow: ["..", "../.."],
    },
  },
});
