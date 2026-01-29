#!/usr/bin/env node
/**
 * CLI entry point for the MCP Skills Server
 * Provides a command-line interface for running the skills server with various options
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ListToolsRequestSchema,
  CallToolRequestSchema,
  type CallToolResult,
} from '@modelcontextprotocol/sdk/types.js';
import { Command } from 'commander';
import { SkillDiscovery } from './discovery.js';
import { getResourceHandlers } from './resources.js';
import { getPromptHandlers } from './prompts.js';
import { getToolHandlers, getToolDefinitions } from './tools.js';

// Package info for version
const packageInfo = {
  name: 'loadout',
  version: '0.1.0',
};

/**
 * Main entry point
 */
async function main(): Promise<void> {
  // Parse command line arguments
  const program = new Command();

  program
    .name(packageInfo.name)
    .description('MCP server for discovering and serving skills')
    .version(packageInfo.version)
    .option('--mcp', 'Run as MCP server with stdio transport (default behavior)', true)
    .option('--watch', 'Enable hot-reload with chokidar file watching')
    .option(
      '--skills-dir <path>',
      'Add custom skill directory (can be used multiple times)',
      (value: string, previous: string[]) => previous.concat([value]),
      [] as string[]
    )
    .option('--allow-scripts', 'Enable script execution tool')
    .parse(process.argv);

  const options = program.opts<{
    mcp: boolean;
    watch?: boolean;
    skillsDir: string[];
    allowScripts?: boolean;
  }>();

  // Create skill discovery with custom paths
  const discovery = new SkillDiscovery(
    options.skillsDir.length > 0 ? options.skillsDir : undefined
  );

  // Log discovery events to stderr (stdout is reserved for MCP)
  discovery.on('skill:discovered', ({ skill }) => {
    console.error(`[loadout] Discovered skill: ${skill.name}`);
  });

  discovery.on('skill:updated', ({ skill }) => {
    console.error(`[loadout] Updated skill: ${skill.name}`);
  });

  discovery.on('skill:removed', ({ name }) => {
    console.error(`[loadout] Removed skill: ${name}`);
  });

  discovery.on('error', (error) => {
    console.error(`[loadout] Discovery error:`, error.message);
  });

  // Initial scan for skills
  console.error('[loadout] Scanning for skills...');
  await discovery.scan();
  console.error(`[loadout] Found ${discovery.getAllSkills().length} skills`);

  // Enable hot-reload watching if requested
  if (options.watch) {
    console.error('[loadout] Starting file watcher for hot-reload...');
    discovery.watch();
  }

  // Create MCP server
  const server = new Server(
    {
      name: packageInfo.name,
      version: packageInfo.version,
    },
    {
      capabilities: {
        resources: {},
        prompts: {},
        tools: {},
      },
    }
  );

  // Get handlers
  const resourceHandlers = getResourceHandlers(discovery);
  const promptHandlers = getPromptHandlers(discovery);
  const toolHandlers = getToolHandlers(discovery, {
    allowScripts: options.allowScripts ?? false,
  });
  const toolDefs = getToolDefinitions({
    allowScripts: options.allowScripts ?? false,
  });

  // Register resource handlers
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    const resources = await resourceHandlers.listResources();
    return { resources };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    return await resourceHandlers.readResource(request.params.uri);
  });

  // Register prompt handlers
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    const prompts = promptHandlers.listPrompts();
    return { prompts };
  });

  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    return await promptHandlers.getPrompt(
      request.params.name,
      (request.params.arguments ?? {}) as Record<string, string | undefined>
    );
  });

  // Register tool handlers
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: toolDefs };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request): Promise<CallToolResult> => {
    const handler = toolHandlers[request.params.name];
    if (!handler) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: `Unknown tool: ${request.params.name}` }) }],
        isError: true,
      };
    }
    const result = await handler((request.params.arguments ?? {}) as Record<string, unknown>);
    return {
      content: result.content,
      isError: result.isError,
    };
  });

  // Set up graceful shutdown
  const shutdown = async (signal: string): Promise<void> => {
    console.error(`\n[loadout] Received ${signal}, shutting down...`);

    // Close the file watcher if active
    await discovery.close();

    // Close the server
    await server.close();

    console.error('[loadout] Shutdown complete');
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Start the MCP server with stdio transport
  console.error('[loadout] Starting MCP server with stdio transport...');
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[loadout] MCP server running');
}

// Run main and handle errors
main().catch((error) => {
  console.error('[loadout] Fatal error:', error);
  process.exit(1);
});
