#!/usr/bin/env node

/**
 * Example: Download a GitHub gist and convert it to markdown
 *
 * This example demonstrates how to use gh-download-gist to fetch
 * a public gist and save it as a markdown file.
 *
 * Usage:
 *   node examples/download-gist.js
 */

import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the CLI script
const CLI_PATH = join(__dirname, '..', 'src', 'gh-download-gist.mjs');

console.log('Example: Downloading a public GitHub gist...\n');

// Example 1: Download using gist ID
console.log('Example 1: Using gist ID');
console.log('Command: node gh-download-gist.mjs 1\n');

try {
  const output = execSync(`node ${CLI_PATH} 1 -o gist-example-1.md`, {
    encoding: 'utf8',
  });
  console.log(output);
} catch (error) {
  console.error('Error:', error.message);
}

console.log('\n---\n');

// Example 2: Download using full URL
console.log('Example 2: Using full gist URL');
console.log('Command: node gh-download-gist.mjs https://gist.github.com/...\n');

console.log(
  'You can also use the full URL format:\n  gh-download-gist https://gist.github.com/username/gist-id\n'
);

console.log('\n---\n');

// Example 3: Using with token
console.log('Example 3: Using with GitHub token (for private gists)');
console.log('Command: node gh-download-gist.mjs gist-id --token YOUR_TOKEN\n');

console.log(
  'For private gists or to avoid rate limits, provide a token:\n  gh-download-gist gist-id --token ghp_your_token_here\n'
);

console.log(
  'Or use the gh CLI (will auto-detect token):\n  gh-download-gist gist-id\n'
);

console.log('\nExample completed!');
console.log(
  'Check the current directory for gist-example-1.md to see the output.'
);
