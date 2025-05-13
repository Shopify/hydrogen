# Using HTTPS in Hydrogen Development

Hydrogen provides built-in support for HTTPS in local development, which is useful for:

- Testing authentication features that require secure contexts
- Working with secure cookies
- Testing browser features that require HTTPS
- Simulating production environments more accurately

## Quick Start

To start your development server with HTTPS:

```bash
npm run dev -- --https
```

Or using the Hydrogen CLI directly:

```bash
hydrogen dev --https
```

## How It Works

When you run Hydrogen with the `--https` flag, the development server will:

1. Check if you have [mkcert](https://github.com/FiloSottile/mkcert) installed
2. If mkcert is not installed, attempt to install it (on macOS)
3. Generate self-signed certificates that are trusted by your local machine
4. Start the Vite development server with HTTPS enabled

The certificates are stored in `~/.hydrogen/certs/` and are reused for future development sessions.

## Installing mkcert

The HTTPS feature relies on mkcert, which creates locally-trusted development certificates.

### macOS

```bash
brew install mkcert
brew install nss # for Firefox support
```

### Windows

```bash
choco install mkcert
```

### Linux

This varies by distribution. For example, on Ubuntu:

```bash
sudo apt install libnss3-tools
# Download and install mkcert from https://github.com/FiloSottile/mkcert/releases
```

## Trusting the Certificates on Mobile Devices

To test HTTPS on a mobile device connected to your local network:

1. Expose your server to the network with:

```bash
hydrogen dev --https --host
```

2. Find the mkcert root CA file:

```bash
mkcert -CAROOT
```

3. Transfer this CA certificate to your mobile device and install it in the system settings.

## Troubleshooting

### Certificate Issues

If you see warnings about untrusted certificates:

1. Ensure mkcert is installed correctly
2. Run `mkcert -install` to install the local CA
3. Delete the `~/.hydrogen/certs/` directory to force regeneration of certificates

### Browser Trust Issues

For Firefox, ensure you have installed the NSS tools and run `mkcert -install` again.

### Mobile Device Testing

If you're testing on a mobile device connected to your local network:

1. Make sure the device trusts your local CA certificate
2. Use the `--host` flag together with `--https` to expose the server on your network
3. Connect from your mobile device using your computer's local IP address

## Using with Shopify Authentication

When working with Shopify authentication flows, HTTPS is often required. Use the `--https` flag when developing features that interact with Shopify's authentication systems.