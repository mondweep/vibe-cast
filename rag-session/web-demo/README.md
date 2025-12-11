# RAG Pipeline Web Demo

Interactive demonstration of Retrieval-Augmented Generation (RAG) using LangChain concepts.

**Author:** Mondweep Chakravorty
**Session:** Knowledge Sharing - December 2025

## Features

- Live RAG pipeline demonstration
- Uses OpenAI embeddings and GPT-3.5
- Shows retrieved context chunks with similarity scores
- Beautiful, responsive UI
- No backend required (runs entirely in browser)

## How It Works

1. **Document Chunking** - Company policies are split into smaller chunks
2. **Query Embedding** - Your question is converted to a vector
3. **Similarity Search** - Top 3 most relevant chunks are retrieved
4. **Answer Generation** - GPT generates an answer using only the retrieved context

## Deploy to Netlify

### Option 1: One-Click Deploy
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/mondweep/vibe-cast)

### Option 2: Manual Deploy

1. Fork or clone this repository
2. Connect to Netlify:
   - Go to [Netlify](https://app.netlify.com)
   - Click "Add new site" > "Import an existing project"
   - Connect your GitHub repository
   - Set the base directory to: `rag-session/web-demo`
   - Build command: `npm run build`
   - Publish directory: `dist`
3. Deploy!

## Local Development

```bash
cd rag-session/web-demo
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## Usage

1. Enter your OpenAI API key (never stored, used client-side only)
2. Ask questions about company policies
3. See the RAG pipeline in action!

## Example Questions

- "What is the annual leave policy?"
- "How do I claim business expenses?"
- "What are the core working hours?"
- "What is the training budget?"

## Security Note

Your OpenAI API key is:
- Only used in your browser
- Never sent to any server except OpenAI
- Never stored or logged

For production use, consider implementing a backend proxy to protect your API key.
