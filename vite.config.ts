import { defineConfig } from "vite";
import { resolve } from "path";

// https://vite.dev/config/
export default defineConfig({
  // Remove React plugin
  // plugins: [react()],

  // Ensure the public dir (manifest.json) is copied
  publicDir: resolve(__dirname, "public"),

  build: {
    // Output directory
    outDir: resolve(__dirname, "dist"),
    // Clean output directory before build
    emptyOutDir: true,

    rollupOptions: {
      input: {
        // Define entry points
        // Vite will process the HTML and associated scripts/styles
        sidepanel: resolve(__dirname, "sidepanel.html"),
        // Content script entry
        content: resolve(__dirname, "src/content.ts"),
        // Background script entry
        background: resolve(__dirname, "src/background.ts"),
      },
      output: {
        // Configure output file names
        entryFileNames: (chunkInfo) => {
          // Keep original names for background/content scripts
          if (chunkInfo.name === "content" || chunkInfo.name === "background") {
            return `src/${chunkInfo.name}.js`;
          }
          // sidepanel.js comes from sidepanel.html entry
          if (chunkInfo.name === "sidepanel") {
            return `src/sidepanel.js`;
          }
          // Default entry naming (shouldn't be hit with current inputs)
          return `src/[name].js`;
        },
        // Chunks if needed
        chunkFileNames: `src/chunks/[name]-[hash].js`,
        // Asset file names (CSS, images, etc.)
        assetFileNames: (assetInfo) => {
          // Put sidepanel.css in the root
          if (assetInfo.name === "sidepanel.css") {
            return "sidepanel.css";
          }
          // Default asset placement
          return `assets/[name]-[hash][extname]`;
        },
      },
    },
    // Optional: Disable minification for easier debugging during development
    // minify: false,
  },
});
