import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type PluginOption } from 'vite';
import react from '@vitejs/plugin-react';
import visualizer from 'rollup-plugin-visualizer';
import { isBeautifulMermaidBundle, patchBeautifulMermaidElkSource } from './src/utils/local/patch-beautiful-mermaid-elk.ts';

// https://vite.dev/config/
export default defineConfig({
    base: "",
    server: {
        port: 3000,
    },
    plugins: [react(), tailwindcss(), patchBeautifulMermaidElk(), bundleVisualizer()],
    optimizeDeps: {
        rolldownOptions: {
            plugins: [patchBeautifulMermaidElk()],
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(import.meta.dirname, './src'),
        },
    },
    build: {
        rolldownOptions: {
            output: {
                codeSplitting: {
                    // Only the matched modules go into a group chunk. With the default (true), a group also
                    // captures its dependencies (e.g. `react` via @monaco-editor/react), which would force the
                    // main bundle to statically import the lazy monaco chunk.
                    includeDependenciesRecursively: false,
                    groups: [
                        // Lazy chunks: loaded only when the editor page mounts (see src/utils/lazy-modules.ts)
                        {
                            name: 'monaco',
                            test: /[\\/]node_modules[\\/](monaco-editor|monaco-mermaid|@monaco-editor[\\/][^\\/]+|state-local)[\\/]/,
                            priority: 30,
                        },
                        {
                            name: 'beautiful-mermaid', // includes the ~1.6 MB ELK layout engine
                            test: /[\\/]node_modules[\\/](beautiful-mermaid|elkjs|entities)[\\/]/,
                            priority: 30,
                        },
                        {
                            name: vendorChunkName,
                            test: /[\\/]node_modules[\\/]/,
                            priority: 10,
                        },
                    ],
                },
            },
        },
    },
});

function vendorChunkName(id: string): string | null {
    const pkg = npmPackageName(id);
    if (!pkg) {
        return null;
    }

    if (pkg === 'react' || pkg === 'react-dom' || pkg === 'scheduler') {
        return 'react';
    }
    if (pkg === 'motion' || pkg === 'framer-motion') {
        return 'motion';
    }
    if (pkg === 'gsap' || pkg === '@gsap/react') {
        return 'gsap';
    }
    if (pkg === '@react-spring/web' || pkg.startsWith('@react-spring/')) {
        return 'react-spring';
    }

    return 'vendor';
}

/** Last `node_modules/<pkg>` segment. Works with pnpm's `.pnpm/<id>/node_modules/<pkg>` layout. */
function npmPackageName(id: string): string | undefined {
    const normalized = id.replaceAll('\\', '/');
    const idx = normalized.lastIndexOf(NODE_MODULES);
    if (idx === -1) {
        return undefined;
    }

    const rest = normalized.slice(idx + NODE_MODULES.length);
    const [scopeOrName, maybeName] = rest.split('/');
    if (!scopeOrName || scopeOrName.startsWith('.')) {
        return undefined;
    }

    return scopeOrName.startsWith('@') && maybeName
        ? `${scopeOrName}/${maybeName}`
        : scopeOrName;
}

const NODE_MODULES = '/node_modules/';

function patchBeautifulMermaidElk(): PluginOption {
    return {
        name: 'patch-beautiful-mermaid-elk',
        enforce: 'pre',
        transform(code, id) {
            if (!isBeautifulMermaidBundle(id)) {
                return;
            }
            return patchBeautifulMermaidElkSource(code);
        },
    };
}

//---------------------------------------------------------------------------
// Bundle Visualizer

function bundleVisualizer(): PluginOption {
    return visualizer({
        filename: 'visualization.html',
        //template: 'sunburst', 
        template: 'flamegraph', // flamegraph - as flamegraph; sunburst - as d3 style (good as default as well); treemap - as table (default); network - as graph (slow to open).
        gzipSize: true,
        brotliSize: true,
    });
}
