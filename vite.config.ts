import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// https://vitejs.dev/config/
export default defineConfig({
    base: '',
    build: {
        chunkSizeWarningLimit: 500,
    },
    server: {
        port: 3000,
    },
    worker: {
        plugins: () => [
            nodePolyfills({
                include: ['path', 'stream', 'util', 'process', 'buffer', 'assert', 'os', 'constants'],
                globals: {
                    Buffer: true,
                    global: true,
                    process: true,
                },
            }),
        ],
    },
    plugins: [
        react(),
        tailwindcss(),
        nodePolyfills({
            include: ['path', 'stream', 'util', 'process', 'buffer', 'assert', 'os', 'constants'],
            globals: {
                Buffer: true,
                global: true,
                process: true,
            },
        }),
    ],
    resolve: {
        alias: {
            '@': path.join(__dirname, 'src'),
            '@ui': path.join(__dirname, 'src/components/ui/'),
        }
    }
});
