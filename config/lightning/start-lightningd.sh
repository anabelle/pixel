#!/bin/sh
set -e

# Create config directory
mkdir -p /root/.lightning/testnet

# Write configuration to use local bitcoind
cat > /root/.lightning/testnet/config <<EOF
bitcoin-network=testnet
bitcoin-rpcuser=bitcoin
bitcoin-rpcpassword=password123
bitcoin-rpcconnect=bitcoin
bitcoin-datadir=/bitcoin/.bitcoin
bitcoin-rpcport=18332
bind-addr=127.0.0.1:9736
addr=0.0.0.0:9736
EOF

echo "Configuration:"
cat /root/.lightning/testnet/config
echo ""
echo "Starting Core Lightning with bitcoind backend..."
exec lightningd --testnet
