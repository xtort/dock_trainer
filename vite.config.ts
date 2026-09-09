import { defineConfig } from 'vitest/config';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  base: './',
  // Inlines JS/CSS into one classic (non-module) script in dist/index.html.
  // A plain double-click open (file://) blocks `<script type="module">` via
  // CORS, which the default multi-file ESM build would hit; a single inlined
  // classic script has no cross-origin fetch to block, matching the
  // "open dist/index.html directly, no server" distribution requirement.
  plugins: [viteSingleFile()],
  build: {
    outDir: 'dist',
  },
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
