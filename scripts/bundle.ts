#!/usr/bin/env tsx
/**
 * Bundle script for creating skill packs
 *
 * Creates standalone MCP servers with pre-bundled skills.
 *
 * Usage:
 *   npm run bundle                    # Build all bundles from bundle.config.json
 *   npm run bundle -- web3-skills     # Build specific bundle
 */

import { readFile, writeFile, mkdir, cp, rm } from 'node:fs/promises';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

interface BundleConfig {
  name: string;
  description: string;
  version: string;
  skills: string[];
}

interface Config {
  bundles: Record<string, BundleConfig>;
}

async function loadConfig(): Promise<Config> {
  const configPath = join(rootDir, 'bundle.config.json');

  if (!existsSync(configPath)) {
    console.error('Error: bundle.config.json not found');
    console.error('Copy bundle.config.example.json to bundle.config.json and configure your bundles');
    process.exit(1);
  }

  const content = await readFile(configPath, 'utf-8');
  return JSON.parse(content);
}

async function loadBasePackageJson(): Promise<Record<string, unknown>> {
  const packagePath = join(rootDir, 'package.json');
  const content = await readFile(packagePath, 'utf-8');
  return JSON.parse(content);
}

async function buildBundle(bundleName: string, config: BundleConfig): Promise<void> {
  console.log(`\nBuilding bundle: ${bundleName}`);

  const bundleDir = join(rootDir, 'bundles', bundleName);

  // Clean and create bundle directory
  if (existsSync(bundleDir)) {
    await rm(bundleDir, { recursive: true });
  }
  await mkdir(bundleDir, { recursive: true });

  // Copy compiled dist files
  const distDir = join(rootDir, 'dist');
  if (!existsSync(distDir)) {
    console.error('Error: dist/ not found. Run npm run build first.');
    process.exit(1);
  }
  await cp(distDir, join(bundleDir, 'dist'), { recursive: true });

  // Copy bundled skills
  const skillsDir = join(bundleDir, 'bundled-skills');
  await mkdir(skillsDir, { recursive: true });

  for (const skillPath of config.skills) {
    const fullPath = join(rootDir, skillPath);
    const skillName = basename(skillPath);

    if (!existsSync(fullPath)) {
      console.warn(`  Warning: Skill not found: ${skillPath}`);
      continue;
    }

    await cp(fullPath, join(skillsDir, skillName), { recursive: true });
    console.log(`  Bundled: ${skillName}`);
  }

  // Generate package.json for the bundle
  const basePackage = await loadBasePackageJson();
  const bundlePackage = {
    name: config.name,
    version: config.version,
    description: config.description,
    type: 'module',
    main: 'dist/index.js',
    bin: {
      [config.name]: 'dist/index.js'
    },
    scripts: {
      start: 'node dist/index.js',
    },
    dependencies: basePackage.dependencies,
    // Mark that this is a bundled package with embedded skills
    skillsBundle: {
      embedded: true,
      skillsPath: './bundled-skills'
    }
  };

  await writeFile(
    join(bundleDir, 'package.json'),
    JSON.stringify(bundlePackage, null, 2)
  );

  // Create README for the bundle
  const readme = `# ${config.name}

${config.description}

## Installation

\`\`\`bash
npm install ${config.name}
\`\`\`

## Usage

Add to your Claude Code MCP configuration:

\`\`\`bash
claude mcp add ${config.name} -- npx ${config.name} --mcp
\`\`\`

Or run directly:

\`\`\`bash
npx ${config.name} --mcp --watch --allow-scripts
\`\`\`

## Bundled Skills

${config.skills.map(s => `- ${basename(s)}`).join('\n')}

## Options

- \`--mcp\` - Run as MCP server with stdio transport
- \`--watch\` - Watch for skill changes (hot-reload)
- \`--skills-dir <path>\` - Add additional skill directories
- \`--allow-scripts\` - Enable script execution

## Publishing

\`\`\`bash
cd bundles/${bundleName}
npm publish
\`\`\`
`;

  await writeFile(join(bundleDir, 'README.md'), readme);

  console.log(`  Created: bundles/${bundleName}/`);
  console.log(`  Package: ${config.name}@${config.version}`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const config = await loadConfig();

  // Get list of bundles to build
  let bundlesToBuild: string[];

  if (args.length > 0) {
    // Build specific bundles
    bundlesToBuild = args.filter(arg => !arg.startsWith('-'));

    for (const name of bundlesToBuild) {
      if (!config.bundles[name]) {
        console.error(`Error: Bundle "${name}" not found in bundle.config.json`);
        console.error(`Available bundles: ${Object.keys(config.bundles).join(', ')}`);
        process.exit(1);
      }
    }
  } else {
    // Build all bundles
    bundlesToBuild = Object.keys(config.bundles);
  }

  if (bundlesToBuild.length === 0) {
    console.log('No bundles defined in bundle.config.json');
    return;
  }

  console.log('Loadout Bundler');
  console.log('===============');
  console.log(`Building ${bundlesToBuild.length} bundle(s)...`);

  for (const name of bundlesToBuild) {
    await buildBundle(name, config.bundles[name]);
  }

  console.log('\nDone! Bundles ready in bundles/ directory');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
