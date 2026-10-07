#!/bin/sh
# Runs when the container starts: creates the fake serial port, then runs your command

# If any command fails stop the script
set -e

SERIAL_PORT="${SERIAL_PORT:-/dev/ttyVIRTUAL}"
BRIDGE_HOST="${BRIDGE_HOST:-host.docker.internal}"
BRIDGE_PORT="${BRIDGE_PORT:-5050}"

# Create "fake" terminal/serial device (connects two communication endpoints together)
socat PTY,link="$SERIAL_PORT",raw,echo=0 TCP:"$BRIDGE_HOST":"$BRIDGE_PORT" &

# Wait (max 5s) until the fake port exists
i=0
while [ ! -e "$SERIAL_PORT" ]; do
  i=$((i + 1))
  if [ "$i" -gt 50 ]; then
    echo "No $SERIAL_PORT: is the bridge running on port $BRIDGE_PORT?"
    exit 1
  fi
  sleep 0.1
done

exec "$@" # hand over to the CMD (bash, stm32flash, later the server)