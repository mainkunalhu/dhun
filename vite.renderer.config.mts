import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config
export default defineConfig({
  // The packaged app loads from file://, so asset URLs must stay relative.
  base: './',
  plugins: [react(), tailwindcss()],
});
