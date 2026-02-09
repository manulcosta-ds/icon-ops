import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { resolve } from 'path';

export default defineConfig({
  plugins: [viteSingleFile()],
  build: {
    target: 'es2020',
    minify: false,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/main.ts'),
        ui: resolve(__dirname, 'src/ui.html')
      },
      output: {
        entryFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
      }
    },
    outDir: 'dist',
    emptyOutDir: true
  }
});
