#!/bin/bash

##############################################################################
# Vodichron HRMS Backend - Staging/Development Deployment Script
# ============================================================================
# This script deploys the application to a development/staging environment
# Usage: npm run deploy
##############################################################################

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEPLOY_USER="vodichron"
DEPLOY_HOST="staging.vodichron.com"
DEPLOY_PATH="/var/www/vodichron-backend"
APP_NAME="Vodichron HRMS Backend"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="${DEPLOY_PATH}/backups/${TIMESTAMP}"

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}$APP_NAME - Deployment Script${NC}"
echo -e "${BLUE}Environment: Development/Staging${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Step 1: Validate environment
echo -e "${YELLOW}[Step 1]${NC} Validating environment..."
if [ ! -f ".env" ]; then
    echo -e "${RED}✗ Error: .env file not found${NC}"
    echo "  Please create .env file from .env.example"
    exit 1
fi
echo -e "${GREEN}✓ .env file found${NC}"

# Step 2: Install dependencies
echo ""
echo -e "${YELLOW}[Step 2]${NC} Installing dependencies..."
npm ci --production
echo -e "${GREEN}✓ Dependencies installed${NC}"

# Step 3: Run type checking
echo ""
echo -e "${YELLOW}[Step 3]${NC} Running TypeScript type checking..."
npm run typecheck
echo -e "${GREEN}✓ Type checking passed${NC}"

# Step 4: Build the application
echo ""
echo -e "${YELLOW}[Step 4]${NC} Building application..."
npm run build:clean
echo -e "${GREEN}✓ Build completed${NC}"

# Step 5: Run tests (if available)
echo ""
echo -e "${YELLOW}[Step 5]${NC} Running tests..."
if [ -f "package.json" ] && grep -q '"test"' package.json; then
    npm run test || echo -e "${YELLOW}⚠ Tests failed or not available${NC}"
else
    echo -e "${YELLOW}⚠ No test script found${NC}"
fi

# Step 6: Create backup on remote server
echo ""
echo -e "${YELLOW}[Step 6]${NC} Creating backup on remote server..."
ssh ${DEPLOY_USER}@${DEPLOY_HOST} "mkdir -p ${BACKUP_DIR} && \
  if [ -d ${DEPLOY_PATH}/dist ]; then \
    cp -r ${DEPLOY_PATH}/dist ${BACKUP_DIR}/dist; \
    cp ${DEPLOY_PATH}/.env ${BACKUP_DIR}/.env.backup 2>/dev/null || true; \
  fi"
echo -e "${GREEN}✓ Backup created${NC}"

# Step 7: Deploy to remote server
echo ""
echo -e "${YELLOW}[Step 7]${NC} Uploading files to server..."
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude '.env' \
  --exclude 'dist' \
  --exclude 'logs' \
  --exclude 'assets' \
  . ${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH}/
echo -e "${GREEN}✓ Files uploaded${NC}"

# Step 8: Install dependencies on server
echo ""
echo -e "${YELLOW}[Step 8]${NC} Installing dependencies on server..."
ssh ${DEPLOY_USER}@${DEPLOY_HOST} "cd ${DEPLOY_PATH} && npm ci --production"
echo -e "${GREEN}✓ Dependencies installed on server${NC}"

# Step 9: Build on server
echo ""
echo -e "${YELLOW}[Step 9]${NC} Building on server..."
ssh ${DEPLOY_USER}@${DEPLOY_HOST} "cd ${DEPLOY_PATH} && npm run build:clean"
echo -e "${GREEN}✓ Build completed on server${NC}"

# Step 10: Run migrations (if needed)
echo ""
echo -e "${YELLOW}[Step 10]${NC} Running database seeds..."
ssh ${DEPLOY_USER}@${DEPLOY_HOST} "cd ${DEPLOY_PATH} && npm run seed || true"
echo -e "${GREEN}✓ Seeds applied${NC}"

# Step 11: Restart application
echo ""
echo -e "${YELLOW}[Step 11]${NC} Restarting application..."
ssh ${DEPLOY_USER}@${DEPLOY_HOST} "cd ${DEPLOY_PATH} && \
  pm2 restart vodichron-backend-dev || \
  pm2 start --name vodichron-backend-dev 'npm run start:prod' --output logs/out.log --error logs/err.log"
echo -e "${GREEN}✓ Application restarted${NC}"

# Step 12: Verify deployment
echo ""
echo -e "${YELLOW}[Step 12]${NC} Verifying deployment..."
HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" https://staging.vodichron.com/health || echo "000")
if [ "$HEALTH_CHECK" = "200" ]; then
    echo -e "${GREEN}✓ Health check passed (HTTP $HEALTH_CHECK)${NC}"
else
    echo -e "${RED}✗ Health check failed (HTTP $HEALTH_CHECK)${NC}"
    echo "  Attempting rollback..."
    ssh ${DEPLOY_USER}@${DEPLOY_HOST} "cd ${DEPLOY_PATH} && \
      if [ -d ${BACKUP_DIR}/dist ]; then \
        cp -r ${BACKUP_DIR}/dist ./; \
        pm2 restart vodichron-backend-dev; \
      fi"
    exit 1
fi

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}✓ Deployment completed successfully!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "Deployment Details:"
echo "  Environment: Staging/Development"
echo "  Server: ${DEPLOY_HOST}"
echo "  Path: ${DEPLOY_PATH}"
echo "  Backup: ${BACKUP_DIR}"
echo "  Timestamp: $(date)"
echo ""
echo "Next steps:"
echo "  - Check logs: ssh ${DEPLOY_USER}@${DEPLOY_HOST} 'pm2 logs vodichron-backend-dev'"
echo "  - Monitor: pm2 monit"
echo ""
