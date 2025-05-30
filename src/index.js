const http = require('http');
const https = require('https');
const net = require('net');
const url = require('url');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const dotenv = require('dotenv');
const ntlm = require('ntlm');

class NTLMProxy {
  constructor(options = {}) {
    // Load environment variables
    this.loadConfig(options.config || '.env');

    this.options = {
      port: parseInt(options.port || process.env.PROXY_PORT || 8080),
      host: options.host || process.env.PROXY_HOST || 'localhost',
      target: options.target || process.env.TARGET_PROXY,
      username: options.username || process.env.NTLM_USERNAME,
      password: options.password || process.env.NTLM_PASSWORD,
      domain: options.domain || process.env.NTLM_DOMAIN || '',
      workstation: options.workstation || process.env.NTLM_WORKSTATION || 'localhost',
      tls: options.tls || process.env.TLS_ENABLED === 'true',
      cert: options.cert || process.env.TLS_CERT_PATH,
      key: options.key || process.env.TLS_KEY_PATH,
      verbose: options.verbose || process.env.VERBOSE === 'true'
    };

    this.server = null;
    this.validateConfig();
  }

  loadConfig(configPath) {
    try {
      if (fs.existsSync(configPath)) {
        dotenv.config({ path: configPath });
        this.log('✅ Configuration loaded from ' + configPath);
      }
    } catch (error) {
      this.log('⚠️  Warning: Could not load config file: ' + error.message);
    }
  }

  validateConfig() {
    if (!this.options.target) {
      throw new Error('Target proxy server is required. Use --target option or set TARGET_PROXY in .env');
    }

    if (!this.options.username || !this.options.password) {
      throw new Error('NTLM credentials are required. Use --username/--password options or set NTLM_USERNAME/NTLM_PASSWORD in .env');
    }

    if (this.options.tls && (!this.options.cert || !this.options.key)) {
      throw new Error('TLS certificate and key files are required when TLS is enabled');
    }
  }

  log(message, level = 'info') {
    if ((this.options && this.options.verbose) || level === 'error') {
      const timestamp = new Date().toISOString();
      const coloredMessage = level === 'error' ? chalk.red(message) :
                           level === 'warn' ? chalk.yellow(message) :
                           chalk.white(message);
      console.log(`[${timestamp}] ${coloredMessage}`);
    }
  }

  createNTLMHeaders(req) {
    const type1Message = ntlm.createType1Message({
      domain: this.options.domain,
      workstation: this.options.workstation
    });

    return {
      'Proxy-Authorization': `NTLM ${type1Message.toString('base64')}`
    };
  }

  handleNTLMChallenge(challengeHeader) {
    const challengeMatch = challengeHeader.match(/NTLM\s+(.+)/);
    if (!challengeMatch) {
      throw new Error('Invalid NTLM challenge response');
    }

    const type2Message = Buffer.from(challengeMatch[1], 'base64');
    const type3Message = ntlm.createType3Message(type2Message, {
      username: this.options.username,
      password: this.options.password,
      domain: this.options.domain,
      workstation: this.options.workstation
    });

    return `NTLM ${type3Message.toString('base64')}`;
  }

  handleConnect(req, socket, head) {
    this.log(`CONNECT request to ${req.url}`);

    const [targetHost, targetPort] = this.options.target.split(':');
    const proxyOptions = {
      hostname: targetHost,
      port: parseInt(targetPort),
      method: 'CONNECT',
      path: req.url,
      headers: {
        ...req.headers,
        ...this.createNTLMHeaders(req)
      }
    };

    const proxyReq = http.request(proxyOptions);

    proxyReq.on('connect', (proxyRes, proxySocket, proxyHead) => {
      if (proxyRes.statusCode === 407) {
        // Handle NTLM challenge
        const challengeHeader = proxyRes.headers['proxy-authenticate'];
        if (challengeHeader && challengeHeader.includes('NTLM')) {
          this.handleNTLMAuthentication(req, socket, head, challengeHeader);
          return;
        }
      }

      if (proxyRes.statusCode === 200) {
        socket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
        proxySocket.pipe(socket);
        socket.pipe(proxySocket);
        this.log(`CONNECT tunnel established to ${req.url}`);
      } else {
        socket.write(`HTTP/1.1 ${proxyRes.statusCode} ${proxyRes.statusMessage}\r\n\r\n`);
        socket.end();
        this.log(`CONNECT failed with status ${proxyRes.statusCode}`, 'error');
      }
    });

    proxyReq.on('error', (err) => {
      this.log(`CONNECT error: ${err.message}`, 'error');
      socket.write('HTTP/1.1 500 Connection Error\r\n\r\n');
      socket.end();
    });

    proxyReq.end();
  }

  handleNTLMAuthentication(req, socket, head, challengeHeader) {
    this.log('Handling NTLM authentication challenge');

    const [targetHost, targetPort] = this.options.target.split(':');
    const authHeader = this.handleNTLMChallenge(challengeHeader);

    const proxyOptions = {
      hostname: targetHost,
      port: parseInt(targetPort),
      method: 'CONNECT',
      path: req.url,
      headers: {
        ...req.headers,
        'Proxy-Authorization': authHeader
      }
    };

    const proxyReq = http.request(proxyOptions);

    proxyReq.on('connect', (proxyRes, proxySocket, proxyHead) => {
      if (proxyRes.statusCode === 200) {
        socket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
        proxySocket.pipe(socket);
        socket.pipe(proxySocket);
        this.log(`NTLM authenticated CONNECT tunnel established to ${req.url}`);
      } else {
        socket.write(`HTTP/1.1 ${proxyRes.statusCode} ${proxyRes.statusMessage}\r\n\r\n`);
        socket.end();
        this.log(`NTLM authentication failed with status ${proxyRes.statusCode}`, 'error');
      }
    });

    proxyReq.on('error', (err) => {
      this.log(`NTLM authentication error: ${err.message}`, 'error');
      socket.write('HTTP/1.1 500 Authentication Error\r\n\r\n');
      socket.end();
    });

    proxyReq.end();
  }

  handleHttpRequest(req, res) {
    this.log(`HTTP ${req.method} request to ${req.url}`);

    const [targetHost, targetPort] = this.options.target.split(':');
    const proxyOptions = {
      hostname: targetHost,
      port: parseInt(targetPort),
      method: req.method,
      path: req.url,
      headers: {
        ...req.headers,
        ...this.createNTLMHeaders(req)
      }
    };

    const proxyReq = http.request(proxyOptions, (proxyRes) => {
      if (proxyRes.statusCode === 407) {
        const challengeHeader = proxyRes.headers['proxy-authenticate'];
        if (challengeHeader && challengeHeader.includes('NTLM')) {
          this.handleHttpNTLMAuthentication(req, res, challengeHeader);
          return;
        }
      }

      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      this.log(`HTTP request error: ${err.message}`, 'error');
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Proxy Error: ' + err.message);
    });

    req.pipe(proxyReq);
  }

  handleHttpNTLMAuthentication(req, res, challengeHeader) {
    this.log('Handling HTTP NTLM authentication challenge');

    const [targetHost, targetPort] = this.options.target.split(':');
    const authHeader = this.handleNTLMChallenge(challengeHeader);

    const proxyOptions = {
      hostname: targetHost,
      port: parseInt(targetPort),
      method: req.method,
      path: req.url,
      headers: {
        ...req.headers,
        'Proxy-Authorization': authHeader
      }
    };

    const proxyReq = http.request(proxyOptions, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      this.log(`HTTP NTLM authentication error: ${err.message}`, 'error');
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Authentication Error: ' + err.message);
    });

    req.pipe(proxyReq);
  }

  start() {
    const serverOptions = {};

    if (this.options.tls) {
      serverOptions.cert = fs.readFileSync(this.options.cert);
      serverOptions.key = fs.readFileSync(this.options.key);
      this.server = https.createServer(serverOptions);
    } else {
      this.server = http.createServer();
    }

    this.server.on('request', (req, res) => {
      this.handleHttpRequest(req, res);
    });

    this.server.on('connect', (req, socket, head) => {
      this.handleConnect(req, socket, head);
    });

    this.server.on('error', (err) => {
      this.log(`Server error: ${err.message}`, 'error');
    });

    this.server.listen(this.options.port, this.options.host, () => {
      const protocol = this.options.tls ? 'https' : 'http';
      console.log(chalk.green.bold(`✅ NTLM Proxy Server started successfully!`));
      console.log(chalk.cyan(`🌐 Server: ${protocol}://${this.options.host}:${this.options.port}`));
      console.log(chalk.cyan(`🎯 Target: ${this.options.target}`));
      console.log(chalk.cyan(`👤 User: ${this.options.domain}\\${this.options.username}`));
      console.log(chalk.cyan(`🔒 TLS: ${this.options.tls ? 'Enabled' : 'Disabled'}`));
      console.log(chalk.yellow('Press Ctrl+C to stop the server'));
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log(chalk.yellow('\n🛑 Shutting down proxy server...'));
      this.server.close(() => {
        console.log(chalk.green('✅ Server shut down gracefully'));
        process.exit(0);
      });
    });
  }
}

module.exports = NTLMProxy;
