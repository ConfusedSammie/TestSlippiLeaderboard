#!/bin/bash -l

# Log start time
echo "$(date '+%Y-%m-%d %H:%M:%S') - Cron job started" >> /tmp/cron_run.log

# Setup paths
export NVM_DIR="$HOME/.nvm"
export PATH="$NVM_DIR/versions/node/v18.12.0/bin:$PATH"

# Move to project root
DIR_PATH=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
cd "$DIR_PATH/.."

# Run TypeScript fetch
/home/confusedsammie/.nvm/versions/node/v18.12.0/bin/node --loader ts-node/esm --no-warnings cron/fetchStats.ts >> cron/logs/log.txt 2>&1

# Deploy using full path to npm
/home/confusedsammie/.nvm/versions/node/v18.12.0/bin/npm run --prefix /home/confusedsammie/TestSlippiLeaderboard deploy >> cron/logs/log.txt 2>&1

# Log finish time
echo "$(date '+%Y-%m-%d %H:%M:%S') - Cron job finished" >> /tmp/cron_run.log
