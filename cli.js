#!/usr/bin/env node

/**
 * Enhanced Session Checker - CLI Entry Point
 * Professional cookie validation and session analysis tool
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Get command line arguments
const args = process.argv.slice(2);

function showUsage() {
  console.log(`
╔══════════════════════════════════════════════╗
║                                              ║
║  🚀  CheckCookie - Enhanced Session Checker  ║
║     Professional Cookie Validation Tool      ║
║                                              ║
╚══════════════════════════════════════════════╝

Usage: checkcookie [command] [options]

Commands:
  discover    Cookie Discovery & Preparation (Mode 1)
  test        Automated Session Testing (Mode 2) 
  mixed       Mixed Auto/Manual Testing (Mode 3)
  verify      Manual Verification (Mode 4)
  help        Show this help message
  version     Show version information

Options:
  --timeout <ms>      Request timeout in milliseconds (default: 30000)
  --concurrent <n>    Number of concurrent validations (default: 3)
  --input <path>      Path to cookie directory or file
  --headless          Run browser in headless mode (default: true)
  --debug             Enable debug logging

Examples:
  checkcookie discover --input ./cookies/
  checkcookie test --timeout 60000 --concurrent 5
  checkcookie mixed --debug
  checkcookie verify

Direct execution:
  node session_checker_improved.js

For detailed documentation, visit:
https://github.com/hekticxox/checkcookie
`);
}

function showVersion() {
  try {
    const packageJson = require('./package.json');
    console.log(`CheckCookie v${packageJson.version}`);
  } catch (error) {
    console.log('CheckCookie v2.0.0');
  }
}

// Handle commands
const command = args[0];

if (!command || command === 'help' || command === '--help') {
  showUsage();
  process.exit(0);
}

if (command === 'version' || command === '--version') {
  showVersion();
  process.exit(0);
}

// Map command to mode arguments
const commands = {
  'discover': ['--mode', '1'],
  'test': ['--mode', '2'], 
  'mixed': ['--mode', '3'],
  'verify': ['--mode', '4']
};

const modeArgs = commands[command];
if (!modeArgs) {
  console.error(`❌ Unknown command: ${command}`);
  console.error(`Run 'checkcookie help' for usage information.`);
  process.exit(1);
}

// Build final arguments
const finalArgs = [...modeArgs, ...args.slice(1)];

// Execute main script
try {
  const scriptPath = path.join(__dirname, 'session_checker_improved.js');
  if (!fs.existsSync(scriptPath)) {
    console.error(`❌ Main script not found: ${scriptPath}`);
    process.exit(1);
  }
  
  const cmd = `node "${scriptPath}" ${finalArgs.join(' ')}`;
  
  execSync(cmd, { 
    stdio: 'inherit',
    cwd: __dirname
  });
} catch (error) {
  console.error(`❌ Execution failed: ${error.message}`);
  process.exit(1);
}
