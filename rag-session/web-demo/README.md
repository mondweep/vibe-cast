# RAG Pipeline Web Demo

Interactive demonstration of Retrieval-Augmented Generation (RAG).

**Author:** Mondweep Chakravorty
**Session:** Knowledge Sharing - December 2025

## Features

- Live RAG pipeline demonstration
- Server-side API calls via Netlify Functions
- Uses OpenAI embeddings and GPT-3.5
- Shows retrieved context chunks with similarity scores
- Beautiful, responsive UI

## Deploy to Netlify

### Step 1: Import Project

1. Go to [app.netlify.com](https://app.netlify.com)
2. Click **"Add new site"** > **"Import an existing project"**
3. Connect your GitHub repo
4. Configure build settings:
   - **Base directory:** `rag-session/web-demo`
   - **Publish directory:** `.`

### Step 2: Set Environment Variable

1. Go to **Site settings** > **Environment variables**
2. Add:
   - **Key:** `OPENAI_API_KEY`
   - **Value:** Your OpenAI API key (sk-...)

### Step 3: Deploy

Click **Deploy** and you're done!

## How It Works

1. User submits a question
2. Frontend calls `/api/ask` (Netlify Function)
3. Function retrieves `OPENAI_API_KEY` from environment
4. Chunks are embedded and similarity search finds top 3 matches
5. GPT generates answer using retrieved context
6. Response returned to user

## Project Structure

```
web-demo/
├── index.html              # Frontend UI
├── netlify.toml            # Netlify configuration
├── package.json            # Project metadata
└── netlify/
    └── functions/
        └── ask.mjs         # Serverless RAG function
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | Your OpenAI API key (required) |

## Example Questions

- "What is the annual leave policy?"
- "How do I claim business expenses?"
- "What are the core working hours?"
- "What is the training budget?"
