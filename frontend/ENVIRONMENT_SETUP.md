# Environment Configuration Guide

## Quick Start

Your frontend is now configured to automatically use the correct backend based on your environment:

### For Local Development (Testing with localhost backend):

```bash
npm start
```

- Uses `.env` file
- Connects to: `http://localhost:3001/api`
- Perfect for local testing with your local backend running

### For Production Build (Deploy to Vercel):

```bash
npm run build
```

# - Uses `.env.production` file

# - Automatically uses Railway backend

## Switching Between Environments

### Option 1: Edit `.env` file (Recommended for local dev)

```bash
# In frontend/.env

# Use localhost backend:
REACT_APP_API_URL=http://localhost:3001/api

# Or use Railway backend:

```

### Option 2: Use environment-specific files

- `.env` - Local development (npm start)
- `.env.production` - Production builds (npm run build)
- `.env.local` - Override for your personal setup (git-ignored)

## Current Setup:

1. **`.env`** → Points to `localhost:3001` (local backend)
2. **`.env.production`** → Points to Railway (production backend)
3. **`.env.example`** → Template with both options documented

## After Changing Environment:

**IMPORTANT:** After changing the `.env` file, you MUST restart your dev server:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm start
```

Environment variables are loaded at **build time** in React, not runtime!

## Vercel Deployment:

Vercel automatically uses the value set in:

1. Vercel Dashboard → Settings → Environment Variables (highest priority)
2. `.env.production` file in your repo (fallback)

Your Vercel is configured to use Railway backend through the dashboard environment variable.

## Troubleshooting:

**Frontend calling wrong backend?**

1. Check which `.env` file is being used
2. Restart your dev server (npm start)
3. Clear browser cache
4. Check console logs: Look for `🔧 [ApiService] API_BASE_URL:` in browser console

**Want to temporarily test with production backend locally?**

```bash
# In frontend/.env, temporarily change to:
#REACT_APP_API_URL=https://spl-token-backend-production.up.railway.app/api

# Restart dev server
npm start
```
