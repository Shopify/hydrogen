#!/bin/bash

# Script to set up EJSON private key from clipboard

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Set keydir path
EJSON_KEYDIR="/opt/ejson/keys"

# Check if secrets.ejson exists
if [ ! -f "secrets.ejson" ]; then
    echo -e "${RED}Error: secrets.ejson not found in current directory${NC}"
    exit 1
fi

# Extract public key from secrets.ejson
PUBLIC_KEY=$(awk -F'"' '/_public_key/ {print $4}' secrets.ejson)

if [ -z "$PUBLIC_KEY" ]; then
    echo -e "${RED}Error: Could not extract public key from secrets.ejson${NC}"
    exit 1
fi

echo "Found public key: $PUBLIC_KEY"

# Create keydir if it doesn't exist
if [ ! -d "$EJSON_KEYDIR" ]; then
    echo "Creating keydir at $EJSON_KEYDIR..."
    if ! mkdir -p "$EJSON_KEYDIR" 2>/dev/null; then
        echo -e "${YELLOW}Need sudo to create $EJSON_KEYDIR${NC}"
        sudo mkdir -p "$EJSON_KEYDIR"
        sudo chown -R $(whoami) "$(dirname "$EJSON_KEYDIR")"
    fi
fi

# Get private key from clipboard
echo "Getting private key from clipboard..."
PRIVATE_KEY=$(pbpaste)

if [ -z "$PRIVATE_KEY" ]; then
    echo -e "${RED}Error: No private key found in clipboard${NC}"
    echo "Please copy your private key to clipboard and try again"
    exit 1
fi

# Save the private key
KEY_FILE="$EJSON_KEYDIR/$PUBLIC_KEY"
echo "$PRIVATE_KEY" > "$KEY_FILE"
chmod 600 "$KEY_FILE"

echo -e "${GREEN}Private key saved to: $KEY_FILE${NC}"

# Test decryption
echo -e "\nTesting decryption..."
if ejson decrypt secrets.ejson > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Decryption successful!${NC}"
    echo -e "\nDecrypted content:"
    ejson decrypt secrets.ejson
else
    echo -e "${RED}✗ Decryption failed${NC}"
    echo "Please verify your private key is correct"
    exit 1
fi