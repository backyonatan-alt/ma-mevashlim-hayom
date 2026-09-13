// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://ma-mevashlim-hayom.vercel.app',
  output: 'static',
  build: {
    // Every page's CSS is small; inlining it removes a render-blocking request (Lighthouse).
    inlineStylesheets: 'always',
  },
});
