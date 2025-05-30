#!/usr/bin/env node

/**
 * Example usage of the NTLM Proxy CLI tool
 * This demonstrates how to start the proxy programmatically
 */

const NTLMProxy = require('../src/index');

// Example configuration
const config = {
  port: 8080,
  host: 'localhost',
  target: 'corporate-proxy.company.com:8080',
  username: 'your-username',
  password: 'your-password',
  domain: 'COMPANY',
  workstation: 'localhost',
  verbose: true
};

console.log('🚀 Starting NTLM Proxy with programmatic configuration...');
console.log('Configuration:', {
  ...config,
  password: '***hidden***'
});

try {
  const proxy = new NTLMProxy(config);
  proxy.start();
} catch (error) {
  console.error('❌ Error starting proxy:', error.message);
  process.exit(1);
}
