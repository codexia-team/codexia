import { readDirectory, readTextFile } from '@/services';

export interface WebFrameworkInfo {
  framework:
    | 'nextjs'
    | 'react'
    | 'vite'
    | 'astro'
    | 'nuxt'
    | 'vue'
    | 'svelte'
    | 'angular'
    | 'unknown';
  devPort: number;
  devUrl: string;
  startCommand?: string;
}

export async function detectWebFramework(projectPath: string): Promise<WebFrameworkInfo | null> {
  try {
    // Check package.json existence first to avoid noisy read-file failures.
    const entries = await readDirectory(projectPath, { suppressToast: true });
    const hasPackageJson = entries.some((entry) => entry.name === 'package.json' && !entry.is_dir);
    if (!hasPackageJson) {
      return null;
    }

    // Read package.json to detect framework
    const packageJsonPath = `${projectPath}/package.json`;
    const packageJsonContent = await readTextFile(packageJsonPath, { suppressToast: true });
    const packageJson = JSON.parse(packageJsonContent);

    const dependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    const scripts = packageJson.scripts || {};

    // Detect Next.js
    if (dependencies.next) {
      return {
        framework: 'nextjs',
        devPort: 3000,
        devUrl: 'http://localhost:3000',
        startCommand: scripts.dev || scripts.start || 'npm run dev',
      };
    }

    // Detect Nuxt
    if (dependencies.nuxt || dependencies['@nuxt/kit']) {
      return {
        framework: 'nuxt',
        devPort: 3000,
        devUrl: 'http://localhost:3000',
        startCommand: scripts.dev || scripts.start || 'npm run dev',
      };
    }

    // Detect Astro
    if (dependencies.astro) {
      return {
        framework: 'astro',
        devPort: 4321,
        devUrl: 'http://localhost:4321',
        startCommand: scripts.dev || scripts.start || 'npm run dev',
      };
    }

    // Detect Vite
    if (dependencies.vite) {
      return {
        framework: 'vite',
        devPort: 5173,
        devUrl: 'http://localhost:5173',
        startCommand: scripts.dev || scripts.start || 'npm run dev',
      };
    }

    // Detect Angular
    if (dependencies['@angular/core']) {
      return {
        framework: 'angular',
        devPort: 4200,
        devUrl: 'http://localhost:4200',
        startCommand: scripts.start || 'ng serve',
      };
    }

    // Detect Vue
    if (dependencies.vue) {
      return {
        framework: 'vue',
        devPort: 8080,
        devUrl: 'http://localhost:8080',
        startCommand: scripts.dev || scripts.serve || 'npm run dev',
      };
    }

    // Detect Svelte/SvelteKit
    if (dependencies.svelte || dependencies['@sveltejs/kit']) {
      return {
        framework: 'svelte',
        devPort: 5173,
        devUrl: 'http://localhost:5173',
        startCommand: scripts.dev || scripts.start || 'npm run dev',
      };
    }

    // Detect general React app
    if (dependencies.react) {
      return {
        framework: 'react',
        devPort: 3000,
        devUrl: 'http://localhost:3000',
        startCommand: scripts.start || scripts.dev || 'npm start',
      };
    }

    return null;
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes('File does not exist or is a directory') ||
        error.message.includes('Failed to read file'))
    ) {
      return null;
    }
    console.error('Failed to detect web framework:', error);
    return null;
  }
}

export function getCommonPorts(): number[] {
  return [3000, 3001, 4200, 4321, 5173, 8080, 8000, 8888];
}

export function generateDevUrls(ports: number[] = getCommonPorts()): string[] {
  return ports.map((port) => `http://localhost:${port}`);
}
