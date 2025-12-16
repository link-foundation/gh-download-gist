#!/usr/bin/env sh
':'; // # ; exec "$(command -v bun || command -v node)" "$0" "$@"

// Import built-in Node.js modules
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Download use-m dynamically
const { use } = eval(
  await (await fetch('https://unpkg.com/use-m/use.js')).text()
);

// Import modern npm libraries using use-m
const { Octokit } = await use('@octokit/rest@22.0.0');
const fsExtra = await use('fs-extra@11.3.0');
const fs = fsExtra.default || fsExtra;
const { default: yargs } = await use('yargs@17.7.2');
const { hideBin } = await use('yargs@17.7.2/helpers');

// Get version from package.json or fallback
let version = '0.1.0'; // Fallback version

try {
  const packagePath = path.join(__dirname, '..', 'package.json');
  if (await fs.pathExists(packagePath)) {
    const packageJson = await fs.readJson(packagePath);
    version = packageJson.version;
  }
} catch (_error) {
  // Use fallback version if package.json can't be read
}

// Colors for console output
const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  reset: '\x1b[0m',
};

const log = (color, message) =>
  console.log(`${colors[color]}${message}${colors.reset}`);

// Helper function to check if gh CLI is installed
async function isGhInstalled() {
  try {
    const { execSync } = await import('child_process');
    execSync('gh --version', { stdio: 'pipe' });
    return true;
  } catch (_error) {
    return false;
  }
}

// Helper function to get GitHub token from gh CLI if available
async function getGhToken() {
  try {
    if (!(await isGhInstalled())) {
      return null;
    }

    const { execSync } = await import('child_process');
    const token = execSync('gh auth token', {
      encoding: 'utf8',
      stdio: 'pipe',
    }).trim();
    return token;
  } catch (_error) {
    return null;
  }
}

// Parse GitHub gist URL to extract gist ID
function parseGistUrl(url) {
  // Support both full URLs and just gist IDs
  // Full URL: https://gist.github.com/username/abc123def456
  // Short format: abc123def456
  const fullUrlMatch = url.match(/gist\.github\.com\/(?:[^/]+\/)?([a-f0-9]+)/);
  if (fullUrlMatch) {
    return fullUrlMatch[1];
  }

  // Check if it's already a gist ID (alphanumeric string)
  if (/^[a-f0-9]+$/.test(url)) {
    return url;
  }

  return null;
}

// Fetch gist data from GitHub API
async function fetchGist(gistId, token) {
  try {
    log('blue', `🔍 Fetching gist ${gistId}...`);

    const octokit = new Octokit({
      auth: token,
      baseUrl: 'https://api.github.com',
    });

    // Fetch the gist
    const { data: gist } = await octokit.rest.gists.get({
      gist_id: gistId,
    });

    log(
      'green',
      `✅ Successfully fetched gist with ${Object.keys(gist.files).length} file(s)`
    );

    return gist;
  } catch (error) {
    if (error.status === 404) {
      log('red', `❌ Gist ${gistId} not found`);
    } else if (error.status === 401) {
      log(
        'red',
        `❌ Authentication failed. Please provide a valid GitHub token`
      );
    } else if (error.status === 403) {
      log(
        'red',
        `❌ Access forbidden. This might be a private gist - try providing a token`
      );
    } else {
      log('red', `❌ Failed to fetch gist: ${error.message}`);
    }
    throw error;
  }
}

// Convert gist to markdown format
function gistToMarkdown(gist) {
  let markdown = '';

  // Title (use description or first file name)
  const title = gist.description || 'Untitled Gist';
  markdown += `# ${title}\n\n`;

  // Metadata
  markdown += `**Gist ID:** [${gist.id}](${gist.html_url})  \n`;
  if (gist.owner) {
    markdown += `**Author:** [@${gist.owner.login}](${gist.owner.html_url})  \n`;
  } else {
    markdown += `**Author:** Anonymous  \n`;
  }
  markdown += `**Public:** ${gist.public ? 'Yes' : 'No'}  \n`;
  markdown += `**Created:** ${new Date(gist.created_at).toLocaleString()}  \n`;
  markdown += `**Updated:** ${new Date(gist.updated_at).toLocaleString()}  \n`;
  markdown += `**Files:** ${Object.keys(gist.files).length}  \n`;

  if (gist.description) {
    markdown += `**Description:** ${gist.description}  \n`;
  }

  markdown += '\n---\n\n';

  // Files
  const fileNames = Object.keys(gist.files);
  markdown += `## Files\n\n`;

  fileNames.forEach((fileName, index) => {
    const file = gist.files[fileName];
    markdown += `### ${index + 1}. ${fileName}\n\n`;

    if (file.language) {
      markdown += `**Language:** ${file.language}  \n`;
    }
    markdown += `**Size:** ${file.size} bytes  \n`;
    if (file.raw_url) {
      markdown += `**Raw URL:** [${file.raw_url}](${file.raw_url})  \n`;
    }

    markdown += '\n';

    // File content
    if (file.content) {
      // Detect language for syntax highlighting
      const lang = file.language
        ? file.language.toLowerCase()
        : path.extname(fileName).slice(1) || 'text';
      markdown += `\`\`\`${lang}\n`;
      markdown += file.content;
      markdown += '\n```\n\n';
    } else if (file.truncated) {
      markdown += `*File content truncated. Download from [${file.raw_url}](${file.raw_url})*\n\n`;
    }

    if (index < fileNames.length - 1) {
      markdown += '---\n\n';
    }
  });

  return markdown;
}

// Configure CLI arguments
const scriptName = path.basename(process.argv[1]);
const argv = yargs(hideBin(process.argv))
  .scriptName(scriptName)
  .version(version)
  .usage('Usage: $0 <gist-url> [options]')
  .command(
    '$0 <gist>',
    'Download a GitHub gist and convert it to markdown',
    (yargs) => {
      yargs.positional('gist', {
        describe: 'GitHub gist URL or gist ID',
        type: 'string',
      });
    }
  )
  .option('token', {
    alias: 't',
    type: 'string',
    describe: 'GitHub personal access token (required for private gists)',
    default: process.env.GITHUB_TOKEN,
  })
  .option('output', {
    alias: 'o',
    type: 'string',
    describe: 'Output file path (default: gist-<id>.md in current directory)',
  })
  .help('h')
  .alias('h', 'help')
  .example('$0 https://gist.github.com/user/abc123', 'Download gist abc123')
  .example('$0 abc123def456', 'Download gist using just the ID')
  .example('$0 abc123 -o my-gist.md', 'Save to specific file')
  .example('$0 abc123 --token ghp_xxx', 'Use specific GitHub token').argv;

async function main() {
  const { gist: gistInput, output } = argv;
  let { token } = argv;

  // Parse the gist URL
  const gistId = parseGistUrl(gistInput);
  if (!gistId) {
    log('red', '❌ Invalid gist URL or format');
    log('yellow', '   Expected: https://gist.github.com/user/abc123 or abc123');
    process.exit(1);
  }

  // If no token provided, try to get it from gh CLI
  if (!token || token === undefined) {
    const ghToken = await getGhToken();
    if (ghToken) {
      token = ghToken;
      log('cyan', '🔑 Using GitHub token from gh CLI');
    }
  }

  // Fetch the gist
  let gist;
  try {
    gist = await fetchGist(gistId, token);
  } catch (_error) {
    process.exit(1);
  }

  // Convert to markdown
  log('blue', '📝 Converting to markdown...');
  const markdown = gistToMarkdown(gist);

  // Determine output file path
  const outputPath = output || path.join(process.cwd(), `gist-${gistId}.md`);

  // Write to file
  try {
    await fs.writeFile(outputPath, markdown, 'utf8');
    log('green', `✅ Gist saved to: ${outputPath}`);
  } catch (error) {
    log('red', `❌ Failed to write file: ${error.message}`);
    process.exit(1);
  }
}

main().catch((error) => {
  log('red', `💥 Script failed: ${error.message}`);
  process.exit(1);
});
