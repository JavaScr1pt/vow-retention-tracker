import { defineConfig } from 'vite';

// Relative base so the same build works on a web host, from `vite preview`,
// and inside the Capacitor WebView (which serves dist/ from the app bundle).
export default defineConfig({
  base: './',
  // 5180 rather than Vite's default 5173, which is often taken by another
  // project. If 5180 is busy too, Vite picks the next free port and prints it.
  server: { port: 5180, strictPort: false, open: false },
  preview: { port: 4180 },
  build: { outDir: 'dist', emptyOutDir: true, sourcemap: true, target: 'es2020' },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
  },
});
