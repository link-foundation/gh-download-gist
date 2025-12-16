# gh-download-gist

Download GitHub gists and convert them to markdown - perfect for AI processing and offline analysis.

## Features

- **Download any GitHub gist**: Public or private (with authentication)
- **Multiple authentication methods**: Token, GitHub CLI, or environment variable
- **Flexible input formats**: Full URLs or just gist IDs
- **Markdown output**: Clean, structured markdown with syntax highlighting
- **Cross-runtime support**: Works with Node.js, Bun, and Deno
- **Zero dependencies**: Uses dynamic loading for minimal package size

## Installation

Install globally to use from anywhere:

```bash
npm install -g gh-download-gist
```

Or with other package managers:

```bash
# Using Bun
bun install -g gh-download-gist

# Using pnpm
pnpm install -g gh-download-gist

# Using yarn
yarn global add gh-download-gist
```

## Usage

### Basic Usage

Download a gist using its ID:

```bash
gh-download-gist abc123def456
```

Or using the full URL:

```bash
gh-download-gist https://gist.github.com/username/abc123def456
```

### Authentication

For private gists or to avoid rate limits, provide authentication:

**Using GitHub CLI (recommended):**

```bash
# The tool automatically detects gh CLI authentication
gh auth login
gh-download-gist abc123def456
```

**Using a token:**

```bash
gh-download-gist abc123def456 --token ghp_your_token_here
```

**Using environment variable:**

```bash
export GITHUB_TOKEN=ghp_your_token_here
gh-download-gist abc123def456
```

### Custom Output

Specify a custom output file:

```bash
gh-download-gist abc123def456 --output my-gist.md
```

By default, gists are saved to `gist-<id>.md` in the current directory.

## Examples

```bash
# Download a public gist
gh-download-gist 1

# Download using full URL
gh-download-gist https://gist.github.com/octocat/abc123def456

# Download to specific file
gh-download-gist abc123 -o code-snippet.md

# Download private gist with token
gh-download-gist abc123 --token ghp_yourtoken

# Show help
gh-download-gist --help

# Show version
gh-download-gist --version
```

## Output Format

The generated markdown includes:

- **Gist metadata**: ID, author, visibility, creation/update dates
- **Description**: Gist description if provided
- **All files**: Each file with syntax highlighting based on language
- **File details**: Language, size, and raw URL for each file

Example output structure:

````markdown
# Gist Title

**Gist ID:** [abc123](https://gist.github.com/user/abc123)
**Author:** [@username](https://github.com/username)
**Public:** Yes
**Created:** 1/1/2024, 12:00:00 PM
**Updated:** 1/2/2024, 3:30:00 PM
**Files:** 2

---

## Files

### 1. example.js

**Language:** JavaScript
**Size:** 256 bytes

```javascript
console.log('Hello, world!');
```
````

---

### 2. README.md

**Language:** Markdown
**Size:** 128 bytes

```markdown
# Example Gist
```

````

## CLI Options

| Option               | Alias | Description                                       |
| -------------------- | ----- | ------------------------------------------------- |
| `<gist>`             |       | GitHub gist URL or gist ID (required)             |
| `--token <token>`    | `-t`  | GitHub personal access token                      |
| `--output <file>`    | `-o`  | Output file path (default: `gist-<id>.md`)        |
| `--help`             | `-h`  | Show help message                                 |
| `--version`          |       | Show version number                               |

## Development

### Setup

```bash
# Clone the repository
git clone https://github.com/link-foundation/gh-download-gist.git
cd gh-download-gist

# Install dependencies
npm install
````

### Testing

```bash
# Run tests with Node.js
npm test

# Or with other runtimes
bun test
deno test --allow-read --allow-net --allow-run --allow-env
```

### Code Quality

```bash
# Lint code
npm run lint

# Format code
npm run format

# Run all checks (lint + format + file size)
npm run check
```

### Making Changes

1. Create a feature branch
2. Make your changes
3. Create a changeset: `npm run changeset`
4. Commit your changes (pre-commit hooks will run automatically)
5. Push and create a Pull Request

## How It Works

1. **Dynamic Loading**: Uses `use-m` to load dependencies on-the-fly
2. **GitHub API**: Fetches gist data via Octokit REST API
3. **Authentication**: Cascades through token → gh CLI → env var → unauthenticated
4. **Markdown Conversion**: Formats gist data into structured markdown
5. **File Output**: Saves to local filesystem

## Use Cases

- **AI Processing**: Convert gists to markdown for AI analysis
- **Offline Access**: Save gists for offline reading
- **Documentation**: Archive code snippets and examples
- **Backup**: Create local copies of important gists
- **Research**: Analyze gist content programmatically

## Requirements

- Node.js >= 20.0.0 (or Bun >= 1.2.0, or Deno >= 1.40.0)
- Internet connection to fetch gists
- GitHub token for private gists (optional for public gists)

## Contributing

Contributions are welcome! See our [contributing guidelines](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Create a changeset: `npm run changeset`
5. Commit your changes (pre-commit hooks will run automatically)
6. Push and create a Pull Request

## License

[Unlicense](LICENSE) - Public Domain

## Related Tools

- [gh-download-issue](https://github.com/link-foundation/gh-download-issue) - Download GitHub issues
- [gh-download-pull-request](https://github.com/link-foundation/gh-download-pull-request) - Download pull requests

## Credits

Built with:

- [@octokit/rest](https://github.com/octokit/rest.js) - GitHub API client
- [yargs](https://github.com/yargs/yargs) - Command-line argument parsing
- [use-m](https://github.com/link-foundation/use-m) - Dynamic package loading
