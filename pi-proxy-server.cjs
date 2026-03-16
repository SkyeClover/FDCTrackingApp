#!/usr/bin/env node

/**
 * PI5 System Info Proxy Server
 * Connects to PI5 via SSH and fetches system information
 */

const http = require('http');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);
const PORT = 3002; // Different port to avoid conflicts

// PI5 SSH Configuration
// These can be overridden via environment variables
const PI5_CONFIG = {
  host: process.env.PI5_HOST || 'fdc-tracker.local', // or use IP like '192.168.1.100'
  user: process.env.PI5_USER || 'WalkerRanger',
  port: process.env.PI5_SSH_PORT || '22',
  // For password auth, you'll need to use sshpass or set up SSH keys
  // For key-based auth, ensure your SSH key is in ~/.ssh/id_rsa or specify with PI5_SSH_KEY
};

function buildSSHCommand(command) {
  const sshKey = process.env.PI5_SSH_KEY ? `-i ${process.env.PI5_SSH_KEY}` : '';
  const sshOptions = [
    '-o', 'StrictHostKeyChecking=no',
    '-o', 'UserKnownHostsFile=/dev/null',
    '-o', 'ConnectTimeout=5',
    sshKey
  ].filter(Boolean).join(' ');
  
  return `ssh ${sshOptions} -p ${PI5_CONFIG.port} ${PI5_CONFIG.user}@${PI5_CONFIG.host} "${command}"`;
}

async function executeOnPI5(command) {
  try {
    const sshCommand = buildSSHCommand(command);
    const { stdout, stderr } = await execAsync(sshCommand, {
      timeout: 10000, // 10 second timeout
    });
    
    if (stderr && !stderr.includes('Warning: Permanently added')) {
      console.warn('SSH stderr:', stderr);
    }
    
    return stdout.trim();
  } catch (error) {
    console.error(`Error executing command on PI5: ${command}`, error.message);
    throw error;
  }
}

async function getSystemInfoFromPI5() {
  try {
    // Get CPU temperature
    let temperature = 'N/A';
    try {
      const temp = await executeOnPI5('vcgencmd measure_temp');
      temperature = temp.replace('temp=', '').replace("'C", '\u00B0C');
    } catch (e) {
      console.warn('Could not get temperature:', e.message);
    }

    // Get voltage
    let voltage = 'N/A';
    try {
      const volt = await executeOnPI5('vcgencmd measure_volts');
      voltage = volt.replace('volt=', '');
    } catch (e) {
      console.warn('Could not get voltage:', e.message);
    }

    // Get CPU load
    let cpuLoad = 'N/A';
    try {
      const load = await executeOnPI5("top -bn1 | grep 'Cpu(s)' | sed 's/.*, *\\([0-9.]*\\)%* id.*/\\1/' | awk '{print 100 - $1}'");
      cpuLoad = load + '%';
    } catch (e) {
      try {
        const load = await executeOnPI5("grep 'cpu ' /proc/stat | awk '{usage=($2+$4)*100/($2+$3+$4+$5)} END {print usage \"%\"}'");
        cpuLoad = load;
      } catch (e2) {
        console.warn('Could not get CPU load:', e2.message);
      }
    }

    // Get memory info (in bytes)
    let memoryTotal = '0';
    let memoryUsed = '0';
    let memoryFree = '0';
    try {
      const mem = await executeOnPI5('free -b');
      const lines = mem.split('\n');
      const memLine = lines[1];
      const parts = memLine.split(/\s+/).filter(Boolean);
      memoryTotal = parts[1] || '0';
      memoryUsed = parts[2] || '0';
      memoryFree = parts[3] || '0';
    } catch (e) {
      console.warn('Could not get memory info:', e.message);
    }

    // Get disk info (in bytes)
    let diskTotal = '0';
    let diskUsed = '0';
    let diskFree = '0';
    try {
      const disk = await executeOnPI5('df -B1 /');
      const lines = disk.split('\n');
      const diskLine = lines[1];
      const parts = diskLine.split(/\s+/).filter(Boolean);
      diskTotal = parts[1] || '0';
      diskUsed = parts[2] || '0';
      diskFree = parts[3] || '0';
    } catch (e) {
      console.warn('Could not get disk info:', e.message);
    }

    // Get uptime
    let uptime = 'N/A';
    try {
      uptime = await executeOnPI5('uptime -p');
    } catch (e) {
      try {
        uptime = await executeOnPI5('uptime');
      } catch (e2) {
        console.warn('Could not get uptime:', e2.message);
      }
    }

    // Get hostname
    let hostname = 'N/A';
    try {
      hostname = await executeOnPI5('hostname');
    } catch (e) {
      console.warn('Could not get hostname:', e.message);
    }

    // Get OS version
    let osVersion = 'N/A';
    try {
      osVersion = await executeOnPI5('cat /etc/os-release | grep PRETTY_NAME | cut -d "=" -f 2 | tr -d \'"\'');
    } catch (e) {
      console.warn('Could not get OS version:', e.message);
    }

    // Get CPU model
    let cpuModel = 'N/A';
    try {
      cpuModel = await executeOnPI5('cat /proc/cpuinfo | grep Model | head -1 | cut -d ":" -f 2 | xargs');
      if (!cpuModel) {
        cpuModel = await executeOnPI5('cat /proc/cpuinfo | grep "model name" | head -1 | cut -d ":" -f 2 | xargs');
      }
      if (!cpuModel) {
        cpuModel = 'Raspberry Pi';
      }
    } catch (e) {
      cpuModel = 'Raspberry Pi';
    }

    return {
      cpuTemp: temperature,
      cpuVoltage: voltage,
      cpuLoad,
      memoryTotal,
      memoryUsed,
      memoryFree,
      diskTotal,
      diskUsed,
      diskFree,
      uptime,
      hostname,
      osVersion,
      cpuModel,
    };
  } catch (error) {
    console.error('Error getting system info from PI5:', error);
    throw error;
  }
}

const server = http.createServer(async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.url === '/system-info' && req.method === 'GET') {
    try {
      const info = await getSystemInfoFromPI5();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(info));
    } catch (error) {
      console.error('Error fetching system info:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        error: 'Failed to fetch system information from PI5',
        details: error.message 
      }));
    }
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`PI5 System Info Proxy Server running on http://127.0.0.1:${PORT}`);
  console.log(`Connecting to PI5 at: ${PI5_CONFIG.user}@${PI5_CONFIG.host}:${PI5_CONFIG.port}`);
  console.log(`To configure, set environment variables:`);
  console.log(`  PI5_HOST=${PI5_CONFIG.host}`);
  console.log(`  PI5_USER=${PI5_CONFIG.user}`);
  console.log(`  PI5_SSH_PORT=${PI5_CONFIG.port}`);
  console.log(`  PI5_SSH_KEY=/path/to/ssh/key (optional, for key-based auth)`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`Port ${PORT} already in use, proxy server may already be running`);
  } else {
    console.error('Server error:', err);
  }
});

