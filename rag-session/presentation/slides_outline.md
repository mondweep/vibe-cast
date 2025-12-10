# RAG Pipeline - Presentation Slides Outline
## Building a RAG Pipeline using LangChain and FAISS

---

## Slide 1: Title Slide
**Building a RAG Pipeline**
*Using LangChain and FAISS*

Knowledge Sharing Session
[Your Name] | 10th December 2025

---

## Slide 2: What is RAG?

**R**etrieval **A**ugmented **G**eneration

> A technique that enhances LLMs by giving them access to external knowledge

**The Problem RAG Solves:**
- LLMs have knowledge cutoff dates
- They can "hallucinate" (make things up)
- They don't know your private/company data

---

## Slide 3: RAG vs Standard LLM

**Without RAG:**
```
User: "What is our company's leave policy?"
LLM: "I don't have information about your specific company..."
```

**With RAG:**
```
User: "What is our company's leave policy?"
RAG: [Retrieves relevant policy document]
LLM: "Your company offers 25 days annual leave..."
```

---

## Slide 4: How RAG Works (Visual Diagram)

```
┌─────────────┐
│  Question   │
└──────┬──────┘
       │
       ▼
┌─────────────────┐    ┌──────────────────┐
│ Vector Database │◄───│ Your Documents   │
│    (FAISS)      │    │ (Pre-processed)  │
└────────┬────────┘    └──────────────────┘
         │
         │ Retrieve relevant chunks
         ▼
┌─────────────────────────────────┐
│   LLM (e.g., GPT-4, Claude)     │
│   Context: Retrieved documents  │
│   + Original question           │
└────────────────┬────────────────┘
                 │
                 ▼
          ┌──────────┐
          │  Answer  │
          └──────────┘
```

---

## Slide 5: Key Components

| Component | Purpose | Tool We Use |
|-----------|---------|-------------|
| Document Loader | Load your files | LangChain |
| Text Splitter | Break into chunks | LangChain |
| Embeddings | Convert text → vectors | OpenAI |
| Vector Store | Store & search vectors | FAISS |
| LLM | Generate answers | OpenAI GPT |
| Chain | Connect it all | LangChain |

---

## Slide 6: What are Embeddings?

**Embeddings = Numbers that capture meaning**

```
"King" → [0.2, 0.8, 0.1, ...]
"Queen" → [0.3, 0.7, 0.1, ...]  ← Similar vectors!
"Car" → [0.9, 0.1, 0.5, ...]    ← Different vector
```

Similar concepts have similar vectors = **Semantic Search**

---

## Slide 7: What is FAISS?

**Facebook AI Similarity Search**

- Open-source library from Meta
- Efficiently stores millions of vectors
- Finds similar vectors incredibly fast
- Free to use (no API costs!)

---

## Slide 8: The RAG Pipeline in 5 Steps

1. **LOAD** → Get your documents
2. **SPLIT** → Break into chunks
3. **EMBED** → Convert to vectors
4. **STORE** → Save in FAISS
5. **QUERY** → Retrieve + Generate

---

## Slide 9: Code Demo

*Live demonstration of rag_simple_demo.py*

```python
# The entire RAG pipeline in ~15 lines!
```

---

## Slide 10: Use Cases

- **Customer Support:** Answer questions from knowledge base
- **Legal:** Search through contracts and policies
- **HR:** Query company procedures
- **Research:** Explore academic papers
- **Documentation:** Chat with your codebase

---

## Slide 11: Key Takeaways

✅ RAG = Retrieval + Generation

✅ Solves LLM limitations (hallucination, knowledge cutoff)

✅ LangChain makes it easy to build

✅ FAISS provides free, fast vector search

✅ You can build one in ~15 lines of code!

---

## Slide 12: Questions?

**Resources:**
- LangChain Docs: langchain.com
- FAISS: github.com/facebookresearch/faiss
- OpenAI: platform.openai.com

**Q&A Time: 30 minutes**

---

*End of Presentation*
