#!/bin/bash -l

# Log start timestamp
echo "$(date '+%Y-%m-%d %H:%M:%S') - Cron job started" >> /tmp/cron_run.log

# Explicitly set environment variables (cron runs a limited shell)
export NVM_DIR="$HOME/.nvm"
export PATH="$NVM_DIR/versions/node/v18.12.0/bin:$PATH"

# Navigate to project root
DIR_PATH=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
cd "$DIR_PATH/.."

# Run the TypeScript script with ts-node and log output
LOG_FILE="cron/logs/log.txt"
NODE_CMD="/home/confusedsammie/.nvm/versions/node/v18.12.0/bin/node"

# Execute and log both stdout and stderr
$NODE_CMD --loader ts-node/esm --no-warnings cron/fetchStats.ts >> "$LOG_FILE" 2>&1

# Log end timestamp
echo "$(date '+%Y-%m-%d %H:%M:%S') - Cron job finished" >> /tmp/cron_run.log
