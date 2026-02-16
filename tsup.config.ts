import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/transports/http.ts',
  ],
  outDir: 'dist',
  format: ['cjs', 'esm'],
  splitting: false,
  sourcemap: true,
  clean: true,
  dts: true, // Generate declaration files
  minify: false,
  platform: 'node',
  target: 'node18',
});