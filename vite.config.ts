import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';

// vite.config.ts – must be TypeScript module
export default defineConfig({
  plugins: [react(), tailwind()],
});
