# Backend Workshop

Build a full-stack web app, two different ways.

## Overview

This workshop progresses through two architectures:

1. **Flask Monolith** (`flask-app/`) -- Frontend + Backend served from one Flask server
2. **FastAPI + Vercel** (root) -- Separated frontend/backend, deployed to Vercel

Both use the same example: a patient records management system.

## Step 1: Flask Monolith

```bash
cd flask-app
pip install -r requirements.txt
flask run --host 0.0.0.0 --port 5000 --debug
```

Open http://localhost:5000 in your browser.

## Step 2: FastAPI (Local Development)

```bash
pip install 'fastapi[standard]'
uvicorn api.index:app --reload --host 0.0.0.0 --port 8000
```

In a second terminal, serve the frontend:
```bash
cd public
python -m http.server 5500
```

Open http://localhost:5500. Update `API` in `public/app.js` to `http://localhost:8000`.

## Step 3: Deploy to Vercel

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) -> "Add New Project" -> Import this repo
3. Click Deploy
4. Your app is live!

The root of this repo is structured for Vercel deployment:
- `api/index.py` -> Serverless Python function
- `public/` -> Static frontend files
- `vercel.json` -> Routing configuration

## Note

In-memory storage resets on each Vercel function invocation. For persistent data, add MongoDB Atlas or another database.

## Slides

[slides.hwpark.net/backend-workshop](https://slides.hwpark.net/backend-workshop/)
