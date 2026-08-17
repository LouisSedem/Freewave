#!/bin/bash
# FreeWave - Push to GitHub Script
# Usage: ./scripts/push-to-github.sh
# Prerequisites: GitHub CLI installed and authenticated (gh auth login)

set -e

REPO_NAME="freewave"
GITHUB_USER="LouisSedem"
REMOTE_URL="https://github.com/${GITHUB_USER}/${REPO_NAME}.git"

echo "🎵 FreeWave - Pushing to GitHub"
echo "================================"
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "⚠️  GitHub CLI (gh) is not installed."
    echo "   Install it from: https://cli.github.com/"
    echo ""
    echo "   Alternatively, use git directly:"
    echo "   1. Create a repo at https://github.com/new"
    echo "   2. Run: git remote add origin ${REMOTE_URL}"
    echo "   3. Run: git push -u origin main"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "⚠️  Not authenticated with GitHub CLI."
    echo "   Run: gh auth login"
    exit 1
fi

echo "✅ GitHub CLI authenticated"
echo ""

# Create the repo on GitHub (private by default)
echo "📋 Creating GitHub repository: ${GITHUB_USER}/${REPO_NAME} ..."
gh repo create "${GITHUB_USER}/${REPO_NAME}" \
    --private \
    --description "🎵 FreeWave — Stream free music online. Built with Next.js, YouTube & Apple Music." \
    --source=. \
    --remote=origin \
    --push 2>&1 || {
        echo ""
        echo "⚠️  Repo might already exist. Trying to push to existing repo..."
        git remote add origin "${REMOTE_URL}" 2>/dev/null || git remote set-url origin "${REMOTE_URL}"
        git push -u origin main 2>&1
    }

echo ""
echo "🎉 Done! Your repo is at: https://github.com/${GITHUB_USER}/${REPO_NAME}"
