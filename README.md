# Node.js NTLM Proxy

A powerful Node.js CLI tool for creating an NTLM proxy server with TLS support and HTTP CONNECT method support. This tool allows you to authenticate through corporate NTLM proxies while providing a local proxy server for your applications.

## Features

- ✅ **NTLM Authentication**: Full support for NTLM authentication with corporate proxy servers
- 🔒 **TLS Support**: Optional TLS/SSL encryption for secure connections
- 🔗 **CONNECT Method**: Full support for HTTP CONNECT method for tunneling
- ⚙️ **Configuration**: Flexible configuration via CLI arguments or `.env` file
- 📝 **Verbose Logging**: Detailed logging for debugging and monitoring
- 🎯 **CLI Interface**: Easy-to-use command-line interface
- 🔄 **Graceful Shutdown**: Proper cleanup on exit

## Installation

### Global Installation

```bash
npm install -g node-ntlm-proxy
```

### Local Installation

```bash
npm install node-ntlm-proxy
```

### From Source

```bash
git clone <repository-url>
cd node-ntlm-proxy
npm install
npm link  # For global CLI access
```

## Usage

### Quick Start

```bash
# Using CLI arguments
ntlm-proxy --target corporate-proxy.company.com:8080 \
           --username your-username \
           --password your-password \
           --domain COMPANY \
           --port 8080

# Using .env file
cp .env.example .env
# Edit .env with your configuration
ntlm-proxy
```

### CLI Options

```
Usage: ntlm-proxy [options]

NTLM Proxy Server with TLS and CONNECT support

Options:
  -V, --version                    output the version number
  -p, --port <port>               proxy server port (default: "8080")
  -h, --host <host>               proxy server host (default: "localhost")
  -t, --target <target>           target proxy server (format: host:port)
  -u, --username <username>       NTLM username
  -p, --password <password>       NTLM password
  -d, --domain <domain>           NTLM domain
  -w, --workstation <workstation> NTLM workstation
  --tls                           enable TLS support
  --cert <cert>                   TLS certificate file path
  --key <key>                     TLS private key file path
  --config <config>               config file path (default: ".env")
  --verbose                       enable verbose logging
  --help                          display help for command
```

### Configuration File

Create a `.env` file in your project directory:

```env
# Proxy Server Settings
PROXY_PORT=8080
PROXY_HOST=localhost

# Target Proxy Server (required)
TARGET_PROXY=corporate-proxy.company.com:8080

# NTLM Authentication (required)
NTLM_USERNAME=your-username
NTLM_PASSWORD=your-password
NTLM_DOMAIN=COMPANY
NTLM_WORKSTATION=localhost

# TLS Settings (optional)
TLS_ENABLED=false
TLS_CERT_PATH=./certs/server.crt
TLS_KEY_PATH=./certs/server.key

# Logging
VERBOSE=true
```

## Examples

### Basic HTTP Proxy

```bash
ntlm-proxy --target proxy.company.com:8080 \
           --username john.doe \
           --password mypassword \
           --domain COMPANY
```

### HTTPS Proxy with TLS

```bash
ntlm-proxy --target proxy.company.com:8080 \
           --username john.doe \
           --password mypassword \
           --domain COMPANY \
           --tls \
           --cert ./certs/server.crt \
           --key ./certs/server.key
```

### Using with Applications

Once the proxy is running, configure your applications to use it:

```bash
# Set environment variables
export HTTP_PROXY=http://localhost:8080
export HTTPS_PROXY=http://localhost:8080

# Or configure specific applications
curl --proxy http://localhost:8080 https://api.example.com
```

### Browser Configuration

Configure your browser to use the proxy:
- **Proxy Host**: localhost
- **Proxy Port**: 8080 (or your configured port)
- **Protocol**: HTTP (or HTTPS if TLS is enabled)

## TLS Certificate Generation

To enable TLS support, you'll need SSL certificates. You can generate self-signed certificates for testing:

```bash
# Create certificates directory
mkdir certs

# Generate private key
openssl genrsa -out certs/server.key 2048

# Generate certificate
openssl req -new -x509 -key certs/server.key -out certs/server.crt -days 365 -subj "/CN=localhost"
```

## Troubleshooting

### Common Issues

1. **Authentication Failed**: Verify your NTLM credentials and domain
2. **Connection Refused**: Check if the target proxy is accessible
3. **TLS Errors**: Ensure certificate and key files are valid and readable

### Verbose Logging

Enable verbose logging for debugging:

```bash
ntlm-proxy --verbose
```

Or set in `.env`:
```env
VERBOSE=true
```

### Testing Connection

Test your proxy setup:

```bash
# Test HTTP connection
curl --proxy http://localhost:8080 http://httpbin.org/ip

# Test HTTPS connection
curl --proxy http://localhost:8080 https://httpbin.org/ip
```

## Security Considerations

- **Credentials**: Store credentials securely, avoid hardcoding in scripts
- **TLS**: Use TLS in production environments
- **Network**: Restrict proxy access to trusted networks
- **Logging**: Be careful with verbose logging in production (may expose sensitive data)

## Development

### Running from Source

```bash
npm install
node bin/ntlm-proxy.js --help
```

### Running Tests

```bash
npm test
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For issues and questions:
- Create an issue on GitHub
- Check the troubleshooting section above
- Enable verbose logging for debugging
