# Update Script for VPS Deployment

This document explains how to use the `update.sh` script for deploying updates to your ncala application on a VPS.

## Overview

The `update.sh` script automates the process of updating your production server by:
1. Stashing any local changes
2. Pulling the latest changes from the repository
3. Updating dependencies if needed
4. Checking for new environment variables
5. Restarting the application
6. Performing health checks

## Configuration

Before using the script, you need to configure the variables at the top of the file:

```bash
APP_DIR="/var/www/ncala"                    # Path to your application on the server
LOG_FILE="/tmp/ncala.log"                    # Log file for application output
HEALTH_CHECK_URL_LOCAL="http://localhost:3000/health"  # Local health check URL
HEALTH_CHECK_URL_PUBLIC="https://your-domain.com/ncala/health"  # Public health check URL
```

## Usage

1. Upload the script to your VPS
2. Make it executable: `chmod +x update.sh`
3. Run it: `./update.sh`

## Health Endpoint

The application already includes a health endpoint at `/health` that returns:
```json
{"ok": true}
```

This endpoint is used by the script to verify that the application is running correctly after deployment.

## Process Management

The script uses `pkill` to stop the existing Node.js process and starts a new one using `nohup` with the existing `start.sh` script.

## Environment Variables

The script will check for new environment variables by comparing `.env.example` with your existing `.env` file and notify you if any new variables need to be added.

## Logging

Application logs are written to `/tmp/ncala.log` (or whatever you configure in `LOG_FILE`). You can monitor these with:
```bash
tail -f /tmp/ncala.log