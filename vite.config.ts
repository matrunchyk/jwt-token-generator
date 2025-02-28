import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
    plugins     : [
        tailwindcss(),
        react(),
        nodePolyfills({
            include: ['crypto', 'process', 'stream', 'util', 'buffer'],
            globals: {global: true, process: true},
        }),
    ],
    optimizeDeps: {
        exclude: ['lucide-react'],
    },
});
