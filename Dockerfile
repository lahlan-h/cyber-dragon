FROM node:26-bookworm-slim

# Install only required packages, no bloat, remove metadata after install
RUN apt-get update \
 && apt-get install -y --no-install-recommends git ca-certificates socat stm32flash \
 && rm -rf /var/lib/apt/lists/*

# Retrieve latest push of the chosen branch (CACHEBUST forces a fresh clone)
ARG GIT_REF=docker-update
ARG CACHEBUST=1
RUN git clone --depth 1 --branch "$GIT_REF" https://github.com/lahlan-h/cyber-dragon.git /app
WORKDIR /app

# Install server dependencies 
RUN npm ci --workspace @cyber-dragon/server

# Give the script executable permissions
# RUN chmod +x /app/docker/entrypoint.sh

ENV SERIAL_PORT=/dev/ttyVIRTUAL \
    BRIDGE_HOST=host.docker.internal \
    BRIDGE_PORT=5050 \
    HOST=0.0.0.0 \
    PORT=3000

# When this container is created run this script before anything else
#ENTRYPOINT ["/app/docker/entrypoint.sh"]
CMD ["npm", "start", "-w", "@cyber-dragon/server"]