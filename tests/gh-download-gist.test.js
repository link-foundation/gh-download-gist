#!/usr/bin/env sh
':'; // # ; exec "$(command -v bun || command -v deno run -A || command -v node)" "$0" "$@"

/**
 * CLI tests for gh-download-gist
 *
 * Uses test-anywhere for multi-runtime support (Node.js, Bun, Deno)
 *
 * Run with:
 *   node --test tests/gh-download-gist.test.js
 *   bun test tests/gh-download-gist.test.js
 *   deno test --allow-read --allow-run --allow-env --allow-net tests/gh-download-gist.test.js
 */

/* global TextDecoder */

import { describe, it, getRuntime, setDefaultTimeout } from 'test-anywhere';
import { existsSync, unlinkSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Set timeout to 20 seconds for slow tests on Windows
setDefaultTimeout(20000);

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI_PATH = join(__dirname, '..', 'src', 'gh-download-gist.mjs');

/**
 * Cross-runtime command execution helper
 * Works in Node.js, Bun, and Deno
 */
async function execCommand(command, args) {
  const runtime = getRuntime();

  if (runtime === 'deno') {
    // Use Deno.Command for Deno runtime
    const cmd = new Deno.Command(command, {
      args,
      stdout: 'piped',
      stderr: 'piped',
    });
    const output = await cmd.output();
    const stdout = new TextDecoder().decode(output.stdout);
    const stderr = new TextDecoder().decode(output.stderr);

    if (!output.success) {
      const error = new Error(`Command failed with exit code ${output.code}`);
      error.stdout = stdout;
      error.stderr = stderr;
      error.status = output.code;
      throw error;
    }

    return { stdout, stderr };
  } else {
    // Use child_process for Node.js and Bun
    const { execSync } = await import('node:child_process');
    try {
      const stdout = execSync(
        `${command} ${args.map((a) => `"${a}"`).join(' ')}`,
        {
          encoding: 'utf8',
          stdio: 'pipe',
        }
      );
      return { stdout, stderr: '' };
    } catch (error) {
      const err = new Error(error.message);
      err.stdout = error.stdout || '';
      err.stderr = error.stderr || '';
      err.status = error.status;
      throw err;
    }
  }
}

/**
 * Get the runtime command for executing JavaScript files
 */
function getRuntimeCommand() {
  const runtime = getRuntime();
  switch (runtime) {
    case 'deno':
      return 'deno';
    case 'bun':
      return 'bun';
    default:
      return 'node';
  }
}

/**
 * Get runtime-specific arguments for running a script
 */
function getRuntimeArgs(scriptPath) {
  const runtime = getRuntime();
  switch (runtime) {
    case 'deno':
      return [
        'run',
        '--allow-read',
        '--allow-net',
        '--allow-env',
        '--allow-run',
        '--no-check',
        scriptPath,
      ];
    case 'bun':
      return ['run', scriptPath];
    default:
      return [scriptPath];
  }
}

describe('gh-download-gist CLI', () => {
  it('CLI exists and is executable', () => {
    if (!existsSync(CLI_PATH)) {
      throw new Error(`CLI script not found at ${CLI_PATH}`);
    }
  });

  it('shows help message', async () => {
    // Skip on Windows due to use-m path issues with Windows absolute paths
    if (process.platform === 'win32') {
      console.log(
        'Skipping test on Windows - use-m has known Windows path issues'
      );
      return;
    }

    const cmd = getRuntimeCommand();
    const baseArgs = getRuntimeArgs(CLI_PATH);
    const args = [...baseArgs, '--help'];

    try {
      const result = await execCommand(cmd, args);
      const output = result.stdout + result.stderr;

      if (!output.includes('--token')) {
        throw new Error('Help message does not mention --token option');
      }

      if (!output.includes('--output')) {
        throw new Error('Help message does not mention --output option');
      }
    } catch (error) {
      // yargs --help may exit with non-zero code but still print help
      const output = (error.stdout || '') + (error.stderr || '');

      if (!output.includes('--token')) {
        throw new Error(
          `Help message does not mention --token option. Output: ${output}`
        );
      }

      if (!output.includes('--output')) {
        throw new Error(
          `Help message does not mention --output option. Output: ${output}`
        );
      }
    }
  });

  it('shows version', async () => {
    // Skip on Windows due to use-m path issues with Windows absolute paths
    if (process.platform === 'win32') {
      console.log(
        'Skipping test on Windows - use-m has known Windows path issues'
      );
      return;
    }

    const cmd = getRuntimeCommand();
    const baseArgs = getRuntimeArgs(CLI_PATH);
    const args = [...baseArgs, '--version'];

    try {
      const result = await execCommand(cmd, args);
      const output = result.stdout + result.stderr;

      // Should output a version number
      if (!/\d+\.\d+\.\d+/.test(output)) {
        throw new Error('Version output does not match expected format');
      }
    } catch (error) {
      const output = (error.stdout || '') + (error.stderr || '');

      if (!/\d+\.\d+\.\d+/.test(output)) {
        throw new Error(
          `Version output does not match expected format. Output: ${output}`
        );
      }
    }
  });

  it('handles invalid gist URL', async () => {
    // Skip on Windows due to use-m path issues with Windows absolute paths
    if (process.platform === 'win32') {
      console.log(
        'Skipping test on Windows - use-m has known Windows path issues'
      );
      return;
    }

    const cmd = getRuntimeCommand();
    const baseArgs = getRuntimeArgs(CLI_PATH);
    const args = [...baseArgs, 'invalid-url'];

    try {
      await execCommand(cmd, args);
      // If it doesn't throw, that's unexpected
      throw new Error('Should have failed with invalid URL');
    } catch (error) {
      // Expected to fail - check error message
      const output = (error.stdout || '') + (error.stderr || '');
      if (!output.includes('Invalid gist URL')) {
        throw new Error(
          `Error message does not mention invalid URL. Output: ${output}`
        );
      }
    }
  });

  // Note: This test requires internet connection and GitHub API access
  // It uses a public gist so no token is needed
  it('downloads a public gist (requires internet)', async () => {
    // Skip on Windows due to use-m path issues with Windows absolute paths
    // See: https://github.com/link-foundation/use-m/issues (Windows file:// URL scheme)
    if (process.platform === 'win32') {
      console.log(
        'Skipping test on Windows - use-m has known Windows path issues'
      );
      return;
    }

    // Skip on Deno due to intermittent GitHub API rate limiting in CI
    // The CLI works fine (as demonstrated by other tests), but this integration
    // test is flaky in CI due to external API limitations
    if (getRuntime() === 'deno') {
      console.log('Skipping test on Deno - prone to rate limiting in CI');
      return;
    }

    // Using a well-known public gist (GitHub's hello-world gist)
    const testGistId = '1';
    const outputFile = join(process.cwd(), `gist-${testGistId}.md`);

    // Clean up if file exists
    if (existsSync(outputFile)) {
      unlinkSync(outputFile);
    }

    try {
      const cmd = getRuntimeCommand();
      const baseArgs = getRuntimeArgs(CLI_PATH);
      const args = [...baseArgs, testGistId, '-o', outputFile];

      await execCommand(cmd, args);

      // Check if file was created
      if (!existsSync(outputFile)) {
        throw new Error('Output file was not created');
      }

      // Read and verify content
      const content = readFileSync(outputFile, 'utf8');

      if (!content.includes('Gist ID:')) {
        throw new Error('Output does not contain gist metadata');
      }

      if (!content.includes('Files')) {
        throw new Error('Output does not contain files section');
      }

      // Clean up
      unlinkSync(outputFile);
    } catch (error) {
      // Clean up on error
      if (existsSync(outputFile)) {
        unlinkSync(outputFile);
      }
      // If this is a network error or rate limit, skip the test
      if (
        error.message.includes('ENOTFOUND') ||
        error.message.includes('ETIMEDOUT') ||
        error.message.includes('403') ||
        error.message.includes('rate limit')
      ) {
        console.log('Skipping test - network issue or rate limit');
        return;
      }
      throw error;
    }
  });
});
