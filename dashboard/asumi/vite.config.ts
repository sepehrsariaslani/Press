import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
	base: '/assets/press/asumi_site/',
	plugins: [react()],
	build: {
		outDir: '../../press/public/asumi_site',
		emptyOutDir: true,
		rollupOptions: {
			output: {
				entryFileNames: 'assets/main.js',
				chunkFileNames: 'assets/[name].js',
				assetFileNames: 'assets/[name][extname]',
			},
		},
	},
});
