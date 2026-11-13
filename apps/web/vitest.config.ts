import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const webRoot = path.dirname(fileURLToPath(import.meta.url));

// Mirror tsconfig.json "paths" so tests resolve the same modules Next does:
// @hypernexus/ui from source (not its stale dist build) and @/* from src/.
export default defineConfig({
	root: webRoot,
	resolve: {
		alias: [
			{
				find: /^@hypernexus\/ui$/,
				replacement: path.resolve(webRoot, "../../packages/ui/src/index.tsx"),
			},
			{
				find: /^@hypernexus\/ui\/(.*)$/,
				replacement: path.resolve(webRoot, "../../packages/ui/src/$1"),
			},
			{ find: /^@\/(.*)$/, replacement: path.resolve(webRoot, "src/$1") },
			// Single React copy (the web app's) — packages/ui otherwise pulls
			// its own React 18 and hook calls fail with invalid-hook-call.
			{
				find: /^react$/,
				replacement: path.resolve(webRoot, "node_modules/react"),
			},
			{
				find: /^react-dom$/,
				replacement: path.resolve(webRoot, "node_modules/react-dom"),
			},
			{
				find: /^react\/(.*)$/,
				replacement: path.resolve(webRoot, "node_modules/react/$1"),
			},
			{
				find: /^react-dom\/(.*)$/,
				replacement: path.resolve(webRoot, "node_modules/react-dom/$1"),
			},
		],
		dedupe: ["react", "react-dom"],
	},
	test: {
		server: {
			deps: {
				// Inline so the react aliases above also apply inside these
				// packages; otherwise pnpm's react@18 copies stay external.
				inline: true,
			},
		},
		exclude: [
			"**/node_modules/**",
			"**/.next/**",
			"**/.next-build/**",
			"**/.next-build2/**",
			"**/.next-dev/**",
			"**/.turbo/**",
			"**/dist/**",
			"**/archive/**",
			"**/deploy-artifacts/**",
		],
	},
});
