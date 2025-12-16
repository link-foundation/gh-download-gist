import { test } from 'test-anywhere';
import { execSync } from 'child_process';
import { existsSync, unlinkSync, readFileSync } from 'fs';
import { join } from 'path';

const CLI_PATH = join(process.cwd(), 'src', 'gh-download-gist.mjs');

test('gh-download-gist CLI exists and is executable', () => {
  if (!existsSync(CLI_PATH)) {
    throw new Error(`CLI script not found at ${CLI_PATH}`);
  }
});

test('gh-download-gist shows help message', () => {
  try {
    const output = execSync(`node ${CLI_PATH} --help`, {
      encoding: 'utf8',
      stdio: 'pipe',
    });

    if (!output.includes('--token')) {
      throw new Error('Help message does not mention --token option');
    }

    if (!output.includes('--output')) {
      throw new Error('Help message does not mention --output option');
    }
  } catch (error) {
    // When --help is provided without positional args, yargs exits with code 1
    // but still prints the help message to stderr/stdout
    const output = error.stdout || error.stderr || '';

    if (!output.includes('--token')) {
      throw new Error('Help message does not mention --token option');
    }

    if (!output.includes('--output')) {
      throw new Error('Help message does not mention --output option');
    }
  }
});

test('gh-download-gist shows version', () => {
  const output = execSync(`node ${CLI_PATH} --version`, {
    encoding: 'utf8',
  });

  // Should output a version number
  if (!/\d+\.\d+\.\d+/.test(output)) {
    throw new Error('Version output does not match expected format');
  }
});

test('gh-download-gist handles invalid gist URL', () => {
  try {
    execSync(`node ${CLI_PATH} "invalid-url"`, {
      encoding: 'utf8',
      stdio: 'pipe',
    });
    throw new Error('Should have failed with invalid URL');
  } catch (error) {
    // Expected to fail - check error message
    const output = error.stderr || error.stdout || '';
    if (!output.includes('Invalid gist URL')) {
      throw new Error('Error message does not mention invalid URL');
    }
  }
});

// Note: This test requires internet connection and GitHub API access
// It uses a public gist so no token is needed
test('gh-download-gist downloads a public gist (requires internet)', async () => {
  // Using a well-known public gist (GitHub's hello-world gist)
  const testGistId = '1';
  const outputFile = join(process.cwd(), `gist-${testGistId}.md`);

  // Clean up if file exists
  if (existsSync(outputFile)) {
    unlinkSync(outputFile);
  }

  try {
    execSync(`node ${CLI_PATH} ${testGistId} -o ${outputFile}`, {
      encoding: 'utf8',
      stdio: 'pipe',
    });

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
    // If this is a network error, skip the test
    if (
      error.message.includes('ENOTFOUND') ||
      error.message.includes('ETIMEDOUT')
    ) {
      console.log('Skipping test - network not available');
      return;
    }
    throw error;
  }
});
