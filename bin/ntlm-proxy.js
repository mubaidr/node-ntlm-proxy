#!/usr/bin/env node

const { program } = require('commander');
const chalk = require('chalk');
const path = require('path');
const NTLMProxy = require('../src/index');

program
  .name('ntlm-proxy')
  .description('NTLM Proxy Server with TLS and CONNECT support')
  .version('1.0.0');

program
  .option('-p, --port <port>', 'proxy server port', '8080')
  .option('-h, --host <host>', 'proxy server host', 'localhost')
  .option('-t, --target <target>', 'target proxy server (format: host:port)')
  .option('-u, --username <username>', 'NTLM username')
  .option('--password <password>', 'NTLM password')
  .option('-d, --domain <domain>', 'NTLM domain')
  .option('-w, --workstation <workstation>', 'NTLM workstation')
  .option('--tls', 'enable TLS support')
  .option('--cert <cert>', 'TLS certificate file path')
  .option('--key <key>', 'TLS private key file path')
  .option('--config <config>', 'config file path', '.env')
  .option('--verbose', 'enable verbose logging')
  .action((options) => {
    console.log(chalk.blue.bold('🚀 Starting NTLM Proxy Server...'));

    try {
      const proxy = new NTLMProxy(options);
      proxy.start();
    } catch (error) {
      console.error(chalk.red.bold('❌ Error starting proxy:'), error.message);
      process.exit(1);
    }
  });

program.parse();
