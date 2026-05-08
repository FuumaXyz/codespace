#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Ambil command dari argument
const args = process.argv.slice(2);

// Setup database directory
const databaseDir = path.resolve(process.cwd(), 'database');

// Buat folder database jika belum ada
if (!fs.existsSync(databaseDir)) {
  console.log('📁 Creating database directory...');
  fs.mkdirSync(databaseDir, { recursive: true });
}

// Set environment variable untuk database path
process.env.OPENCLAW_DATABASE_PATH = databaseDir;

if (args.length === 0) {
  console.log('OpenClaw - CLI Tool');
  console.log('Usage: openclaw <command> [options]');
  console.log('');
  console.log('Commands:');
  console.log('  onboard           - Run onboarding process');
  console.log('  start             - Start OpenClaw');
  console.log('  gateway           - Start OpenClaw gateway');
  console.log('  gatewaynoverbose  - Start OpenClaw gateway without verbose mode');
  console.log('  dashboard         - Open OpenClaw dashboard');
  console.log('  help              - Show this help');
  console.log('');
  console.log(`Database: ${databaseDir}`);
  process.exit(0);
}

const command = args[0];
const options = args.slice(1);

try {
  switch (command) {
    case 'onboard':
      console.log('🚀 Running OpenClaw onboarding...');
      console.log(`📁 Database location: ${databaseDir}`);
      
      // Coba jalankan openclaw dari node_modules
      const openclawPath = path.resolve(__dirname, 'node_modules', '.bin', 'openclaw');
      execSync(`${openclawPath} onboard`, { 
        stdio: 'inherit',
        cwd: process.cwd(),
        env: { 
          ...process.env, 
          OPENCLAW_DATABASE_PATH: databaseDir 
        }
      });
      break;
    
    case 'start':
      console.log('🚀 Starting OpenClaw...');
      console.log(`📁 Database location: ${databaseDir}`);
      
      const openclawStart = path.resolve(__dirname, 'node_modules', '.bin', 'openclaw');
      execSync(`${openclawStart}`, { 
        stdio: 'inherit',
        cwd: process.cwd(),
        env: { 
          ...process.env, 
          OPENCLAW_DATABASE_PATH: databaseDir 
        }
      });
      break;

    case 'gateway':
      console.log('🌐 Starting OpenClaw Gateway...');
      console.log(`📁 Database location: ${databaseDir}`);
      
      // Cek apakah ada opsi --verbose
      const verboseIndex = options.indexOf('--verbose');
      const isVerbose = verboseIndex !== -1;
      
      if (isVerbose) {
        console.log('📋 Verbose mode enabled');
        console.log(`📁 Working directory: ${process.cwd()}`);
        console.log(`🔧 Command: gateway`);
      }
      
      const openclawGateway = path.resolve(__dirname, 'node_modules', '.bin', 'openclaw');
      
      // Tambahkan --verbose ke command jika ada
      const gatewayCmd = isVerbose 
        ? `${openclawGateway} gateway --verbose`
        : `${openclawGateway} gateway`;
      
      if (isVerbose) {
        console.log(`▶️  Executing: ${gatewayCmd}`);
      }
      
      execSync(gatewayCmd, { 
        stdio: 'inherit',
        cwd: process.cwd(),
        env: { 
          ...process.env, 
          OPENCLAW_DATABASE_PATH: databaseDir 
        }
      });
      break;

    case 'gatewaynoverbose':
      console.log('🌐 Starting OpenClaw Gateway (Non-Verbose Mode)...');
      console.log(`📁 Database location: ${databaseDir}`);
      
      const openclawGatewayNoVerbose = path.resolve(__dirname, 'node_modules', '.bin', 'openclaw');
      
      console.log('📋 Running gateway without verbose logging');
      console.log(`📁 Working directory: ${process.cwd()}`);
      
      // Jalankan gateway tanpa opsi --verbose
      execSync(`${openclawGatewayNoVerbose} gateway`, { 
        stdio: 'inherit',
        cwd: process.cwd(),
        env: { 
          ...process.env, 
          OPENCLAW_DATABASE_PATH: databaseDir 
        }
      });
      break;

    case 'dashboard':
      console.log('📊 Opening OpenClaw Dashboard...');
      console.log(`📁 Database location: ${databaseDir}`);
      
      const openclawDashboard = path.resolve(__dirname, 'node_modules', '.bin', 'openclaw');
      
      // Cek opsi tambahan untuk dashboard (misal: port)
      const portIndex = options.indexOf('--port');
      let dashboardCmd = `${openclawDashboard} dashboard`;
      
      if (portIndex !== -1 && options[portIndex + 1]) {
        const port = options[portIndex + 1];
        dashboardCmd += ` --port ${port}`;
        console.log(`🔌 Using port: ${port}`);
      }
      
      console.log(`▶️  Executing: ${dashboardCmd}`);
      
      execSync(dashboardCmd, { 
        stdio: 'inherit',
        cwd: process.cwd(),
        env: { 
          ...process.env, 
          OPENCLAW_DATABASE_PATH: databaseDir 
        }
      });
      break;

    case 'help':
      console.log('OpenClaw - CLI Tool');
      console.log('Usage: openclaw <command> [options]');
      console.log('');
      console.log('Configuration:');
      console.log(`  Database Path: ${databaseDir}`);
      console.log('  (Database files will be stored in ./database folder)');
      console.log('');
      console.log('Commands:');
      console.log('  onboard                - Run onboarding process');
      console.log('  start                  - Start OpenClaw');
      console.log('  gateway [options]      - Start OpenClaw gateway');
      console.log('  gatewaynoverbose       - Start OpenClaw gateway without verbose logging');
      console.log('  dashboard [options]    - Open OpenClaw dashboard');
      console.log('  help                   - Show this help');
      console.log('');
      console.log('Options for gateway:');
      console.log('  --verbose              - Enable verbose logging');
      console.log('');
      console.log('Options for dashboard:');
      console.log('  --port <number>        - Specify port number');
      console.log('');
      console.log('Examples:');
      console.log('  openclaw gateway --verbose');
      console.log('  openclaw gatewaynoverbose');
      console.log('  openclaw dashboard');
      console.log('  openclaw dashboard --port 3000');
      break;

    default:
      console.log(`Unknown command: ${command}`);
      console.log('Run "openclaw help" for usage information.');
      process.exit(1);
  }
} catch (error) {
  console.error('Error executing command:', error.message);
  process.exit(1);
}
