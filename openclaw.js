#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Deteksi base directory
const __baseDir = path.resolve(__dirname);

// Setup paths - database akan disimpan di .openclaw di current working directory
const cwd = process.cwd();
const databaseDir = path.resolve(cwd, '.openclaw');
const nodeModulesBin = path.resolve(__baseDir, 'node_modules', '.bin');
const openclawBin = process.platform === 'win32' 
  ? path.resolve(nodeModulesBin, 'openclaw.cmd')
  : path.resolve(nodeModulesBin, 'openclaw');

// Ambil command dari argument
const args = process.argv.slice(2);

// Fungsi untuk memastikan direktori ada
function ensureDirectory(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Fungsi untuk mencari binary openclaw
function findOpenClaw() {
  const searchPaths = [
    openclawBin,
    path.resolve(__baseDir, '..', 'node_modules', '.bin', 'openclaw'),
    path.resolve(cwd, 'node_modules', '.bin', 'openclaw'),
  ];

  // Platform-specific untuk Windows
  if (process.platform === 'win32') {
    searchPaths.forEach((p, i) => {
      if (!p.endsWith('.cmd')) {
        searchPaths.push(p + '.cmd');
      }
    });
  }

  for (const binPath of searchPaths) {
    if (fs.existsSync(binPath)) {
      return binPath;
    }
  }

  // Coba cari di PATH
  try {
    const whichCmd = process.platform === 'win32' ? 'where' : 'which';
    return execSync(`${whichCmd} openclaw`, { encoding: 'utf-8' }).trim().split('\n')[0];
  } catch (e) {
    return null;
  }
}

// Setup environment
ensureDirectory(databaseDir);

// Set environment variables
process.env.OPENCLAW_HOME = cwd;
process.env.OPENCLAW_DATABASE_PATH = databaseDir;

// Cari openclaw binary
const openclawPath = findOpenClaw();

if (!openclawPath) {
  console.error('❌ OpenClaw binary not found!');
  console.error('Make sure OpenClaw is installed:');
  console.error('  npm install -g @openclaw/cli');
  console.error('  or');
  console.error('  npm install @openclaw/cli');
  process.exit(1);
}

// Jika tidak ada command, tampilkan help
if (args.length === 0) {
  console.log('OpenClaw CLI - Portable Mode');
  console.log(`Database: ${databaseDir}`);
  console.log(`Running: openclaw ${args.join(' ')}`);
}

try {
  // Jalankan openclaw dengan arguments yang diberikan
  const command = `${openclawPath} ${args.join(' ')}`;
  
  execSync(command, {
    stdio: 'inherit',
    cwd: cwd,
    env: {
      ...process.env,
      OPENCLAW_HOME: cwd,
      OPENCLAW_DATABASE_PATH: databaseDir,
    }
  });
} catch (error) {
  // openclaw akan menangani error dan help text-nya sendiri
  process.exit(error.status || 1);
}