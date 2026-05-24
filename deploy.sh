#!/bin/bash
set -euo pipefail

# ============================================================================
# PrimeaHR Apply Flow — Deploy Script
# Run this on your Hostinger VPS after uploading primeahr-apply-deploy.zip
#
# Usage:
#   1. Upload primeahr-apply-deploy.zip to /tmp/ on your VPS
#   2. Run: bash /tmp/deploy.sh
# ============================================================================

ZIP_PATH="/tmp/primeahr-apply-deploy.zip"
REPO_PATH="/tmp/primeahr"
BRANCH="feat/apply-flow"

echo "=== PrimeaHR Apply Flow Deploy ==="

# Check zip exists
if [ ! -f "$ZIP_PATH" ]; then
  echo "ERROR: $ZIP_PATH not found"
  echo "Upload primeahr-apply-deploy.zip to /tmp/ first"
  exit 1
fi

# Make sure repo is cloned
if [ ! -d "$REPO_PATH/.git" ]; then
  echo "Cloning repo..."
  git clone https://github.com/jemelike-lab/primeahr.git "$REPO_PATH"
fi

cd "$REPO_PATH"

# Pull latest main
echo "Pulling latest main..."
git checkout main 2>/dev/null || git checkout master
git pull --rebase origin $(git symbolic-ref --short HEAD)

# Create feature branch
echo "Creating branch $BRANCH..."
git checkout -B "$BRANCH"

# Extract the zip (overwrites existing files, adds new ones)
echo "Extracting apply flow files..."
unzip -o "$ZIP_PATH" -d "$REPO_PATH"

# Install new dependencies
echo "Installing dependencies..."
npm install @anthropic-ai/sdk@latest zod@latest --save

# Show what changed
echo ""
echo "=== Files changed ==="
git status -s
echo ""

# Stage and commit
git add -A
git commit -m "feat: hire-to-onboard funnel — public apply page + Claude resume parsing

Phase A of the PrimeaHR hire-to-onboard funnel:
- Public /apply/[role] page with 8-step wizard
- Claude-powered resume parser with BLH case management signals
- AI fit scoring against open requisitions
- Document upload to Supabase Storage
- Save-and-resume via magic link tokens
- 16 real BLH roles seeded (Support Planner, CCS, etc.)
- Counties-served picker for field-based roles
- Background check + drug screen consent flow
- E-signature capture with IP/UA audit trail
- Application events audit log

BLH context: Maryland case management agency (CFC + DDA waivers).
NOT direct care. All clinical references removed."

echo ""
echo "=== Pushing to GitHub ==="
git push -u origin "$BRANCH"

echo ""
echo "=== DONE ==="
echo ""
echo "Next steps:"
echo "  1. Vercel will auto-deploy a preview at:"
echo "     https://primeahr-git-${BRANCH}-jemelike-6356s-projects.vercel.app"
echo ""
echo "  2. Add SUPABASE_SERVICE_ROLE_KEY to Vercel if not already set:"
echo "     https://vercel.com/jemelike-6356s-projects/primeahr/settings/environment-variables"
echo ""
echo "  3. Test: visit /apply/support-planner on the preview URL"
echo ""
echo "  4. When satisfied, merge to main:"
echo "     git checkout main && git merge $BRANCH && git push origin main"
