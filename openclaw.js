#!/usr/bin/env node

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Deteksi base directory (dimana script ini berada)
const __baseDir = path.resolve(__dirname);

// Setup paths
const databaseDir = path.resolve(__baseDir, 'database');
const nodeModulesBin = path.resolve(__baseDir, 'node_modules', '.bin');
const openclawBin = process.platform === 'win32' 
  ? path.resolve(nodeModulesBin, 'openclaw.cmd')
  : path.resolve(nodeModulesBin, 'openclaw');

// Ambil command dari argument
const args = process.argv.slice(2);

// Fungsi utility
function ensureDirectory(dir, description = '') {
  if (!fs.existsSync(dir)) {
    console.log(`📁 Creating ${description || path.basename(dir)} directory...`);
    fs.mkdirSync(dir, { recursive: true });
  }
}

function isPortable() {
  // Cek apakah bisa dijalankan standalone
  const packageJson = path.resolve(__baseDir, 'package.json');
  const nodeModules = path.resolve(__baseDir, 'node_modules');
  return fs.existsSync(packageJson) && fs.existsSync(nodeModules);
}

function findOpenClaw() {
  // Coba cari openclaw binary di beberapa lokasi
  const searchPaths = [
    openclawBin,
    path.resolve(__baseDir, '..', 'node_modules', '.bin', 'openclaw'),
    path.resolve(process.cwd(), 'node_modules', '.bin', 'openclaw'),
  ];

  // Platform-specific
  if (process.platform === 'win32') {
    searchPaths.forEach((p, i) => {
      searchPaths[i] = p + '.cmd';
      searchPaths.push(p); // original path
    });
  }

  for (const binPath of searchPaths) {
    if (fs.existsSync(binPath)) {
      return binPath;
    }
  }

  return null;
}

function createSymlinks() {
  // Buat symlinks untuk memastikan portability
  const currentDbDir = path.resolve(process.cwd(), 'database');
  const portableDbDir = databaseDir;

  if (currentDbDir !== portableDbDir && !fs.existsSync(currentDbDir)) {
    try {
      // Buat symlink dari current dir ke portable dir
      if (process.platform === 'win32') {
        execSync(`mklink /J "${currentDbDir}" "${portableDbDir}"`, { stdio: 'ignore' });
      } else {
        fs.symlinkSync(portableDbDir, currentDbDir, 'dir');
      }
      console.log(`🔗 Linked database: ${currentDbDir} -> ${portableDbDir}`);
    } catch (error) {
      // Jika gagal, buat folder biasa
      console.log(`📁 Created database directory in working directory`);
    }
  }
}

// Setup environment
ensureDirectory(databaseDir, 'database');

// Set environment variables untuk portability
process.env.OPENCLAW_HOME = __baseDir;
process.env.OPENCLAW_DATABASE_PATH = databaseDir;
process.env.OPENCLAW_PORTABLE = 'true'; // Mode portable

// Buat symlink jika diperlukan
createSymlinks();

// Cek portability
if (!isPortable()) {
  console.warn('⚠️  Warning: Running in non-portable mode. Use "npm run setup-portable" to make it portable.');
  console.warn('📦 Please run: npm install in the same directory as this script');
}

// Cari openclaw binary
const openclawPath = findOpenClaw();

if (!openclawPath) {
  console.error('❌ OpenClaw binary not found!');
  console.error('Make sure OpenClaw is installed:');
  console.error('  npm install -g @openclaw/cli');
  console.error('  or');
  console.error('  npm install @openclaw/cli --save');
  console.error(`\nBase directory: ${__baseDir}`);
  process.exit(1);
}

console.log(`📦 OpenClaw Location: ${openclawPath}`);
console.log(`📁 Database: ${databaseDir}`);
console.log(`🏠 Home: ${__baseDir}`);

// Help text
function showHelp() {
  console.log(`
╔══════════════════════════════════════════════╗
║           OpenClaw CLI - Portable           ║
╚══════════════════════════════════════════════╝

Usage: openclaw <command> [options]

Configuration:
  Mode: ${isPortable() ? '✅ Portable' : '⚠️  Standard'}
  Home: ${__baseDir}
  Database: ${databaseDir}

Commands:
  onboard                Run onboarding process
  start                  Start OpenClaw
  gateway [options]       Start OpenClaw gateway
  gatewaynoverbose       Start gateway without verbose
  dashboard [options]    Open dashboard
  help                   Show this help
  info                   Show system information
  setup-portable         Setup for portable use

Options:
  --verbose              Enable verbose logging
  --port <number>        Specify port number
  --db-path <path>       Override database path
  --debug                Enable debug mode

Examples:
  openclaw gateway --verbose
  openclaw gatewaynoverbose
  openclaw dashboard --port 3000
  openclaw start
  openclaw help
  `);
}

function runCommand(cmd, subCmd = '', opts = {}) {
  const fullCmd = subCmd ? `${cmd} ${subCmd}` : cmd;
  
  console.log(`▶️  Executing: ${fullCmd}`);
  
  try {
    execSync(fullCmd, {
      stdio: 'inherit',
      cwd: process.cwd(),
      env: {
        ...process.env,
        OPENCLAW_HOME: __baseDir,
        OPENCLAW_DATABASE_PATH: databaseDir,
        OPENCLAW_PORTABLE: 'true',
        ...opts.env
      },
      ...opts
    });
  } catch (error) {
    if (error.status !== 0) {
      console.error(`❌ Command failed with exit code ${error.status}`);
    }
    throw error;
  }
}

// Handle commands
if (args.length === 0) {
  showHelp();
  process.exit(0);
}

const command = args[0];
const options = args.slice(1);

// Parse options
const parsedOptions = {
  verbose: options.includes('--verbose'),
  debug: options.includes('--debug'),
  port: (() => {
    const idx = options.indexOf('--port');
    return idx !== -1 ? options[idx + 1] : null;
  })(),
  dbPath: (() => {
    const idx = options.indexOf('--db-path');
    return idx !== -1 ? options[idx + 1] : null;
  })()
};

// Override database path jika disediakan
if (parsedOptions.dbPath) {
  process.env.OPENCLAW_DATABASE_PATH = path.resolve(parsedOptions.dbPath);
  console.log(`📁 Database override: ${process.env.OPENCLAW_DATABASE_PATH}`);
}

try {
  switch (command) {
    case 'setup-portable':
      console.log('🔧 Setting up portable OpenClaw...');
      
      // Buat struktur direktori
      ensureDirectory(path.resolve(__baseDir, 'node_modules'));
      ensureDirectory(databaseDir);
      
      // Buat symlink database ke current directory
      createSymlinks();
      
      // Buat file konfigurasi
      const configPath = path.resolve(__baseDir, 'openclaw.config.json');
      const config = {
        portable: true,
        home: __baseDir,
        database: databaseDir,
        version: '1.0.0',
        created: new Date().toISOString()
      };
      
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      console.log(`⚙️  Created config: ${configPath}`);
      
      // Cek dependencies
      console.log('📦 Checking dependencies...');
      if (!fs.existsSync(path.resolve(__baseDir, 'node_modules'))) {
        console.log('📦 Installing dependencies...');
        execSync('npm install', { cwd: __baseDir, stdio: 'inherit' });
      }
      
      console.log('✅ Portable setup complete!');
      console.log(`📍 Location: ${__baseDir}`);
      console.log('📋 You can now copy this entire directory to another machine.');
      break;

    case 'info':
      console.log('System Information:');
      console.log('─────────────────────────────────────');
      console.log(`Platform:          ${process.platform}`);
      console.log(`Architecture:      ${process.arch}`);
      console.log(`Node.js:           ${process.version}`);
      console.log(`Base Directory:    ${__baseDir}`);
      console.log(`Database Path:     ${process.env.OPENCLAW_DATABASE_PATH}`);
      console.log(`Portable Mode:     ${process.env.OPENCLAW_PORTABLE === 'true' ? '✅ Yes' : '❌ No'}`);
      console.log(`OpenClaw Binary:   ${openclawPath}`);
      console.log(`Working Directory: ${process.cwd()}`);
      console.log(`Portable:          ${isPortable() ? '✅ Yes' : '❌ No'}`);
      console.log('─────────────────────────────────────');
      
      // Cek versi openclaw jika tersedia
      try {
        const version = execSync(`${openclawPath} --version`, { encoding: 'utf-8' }).trim();
        console.log(`OpenClaw Version:  ${version}`);
      } catch (e) {
        console.log('OpenClaw Version:  Unable to detect');
      }
      break;

    case 'onboard':
      console.log('🚀 Running OpenClaw onboarding...');
      runCommand(openclawPath, 'onboard');
      break;
    
    case 'start':
      console.log('🚀 Starting OpenClaw...');
      runCommand(openclawPath);
      break;

    case 'gateway':
      console.log('🌐 Starting OpenClaw Gateway...');
      if (parsedOptions.verbose) {
        console.log('📋 Verbose mode enabled');
        console.log(`📁 Working directory: ${process.cwd()}`);
      }
      
      const gatewayArgs = ['gateway'];
      if (parsedOptions.verbose) gatewayArgs.push('--verbose');
      if (parsedOptions.debug) gatewayArgs.push('--debug');
      
      runCommand(openclawPath, gatewayArgs.join(' '));
      break;

    case 'gatewaynoverbose':
      console.log('🌐 Starting OpenClaw Gateway (Non-Verbose Mode)...');
      runCommand(openclawPath, 'gateway');
      break;

    case 'dashboard':
      console.log('📊 Opening OpenClaw Dashboard...');
      
      const dashboardArgs = ['dashboard'];
      if (parsedOptions.port) dashboardArgs.push(`--port ${parsedOptions.port}`);
      if (parsedOptions.debug) dashboardArgs.push('--debug');
      
      runCommand(openclawPath, dashboardArgs.join(' '));
      break;

    case 'help':
      showHelp();
      break;

    default:
      console.log(`❌ Unknown command: ${command}`);
      console.log('Run "openclaw help" for usage information.');
      process.exit(1);
  }
} catch (error) {
  console.error('❌ Error executing command:', error.message);
  
  if (parsedOptions.debug) {
    console.error('\nStack trace:');
    console.error(error.stack);
  }
  
  console.log('\n💡 Tips:');
  console.log('  1. Run "openclaw setup-portable" to ensure proper setup');
  console.log('  2. Run "openclaw info" to check system status');
  console.log('  3. Use --debug flag for more details');
  
  process.exit(1);
}

// Cleanup saat process exit
process.on('exit', () => {
  // Cleanup symlinks jika perlu
});