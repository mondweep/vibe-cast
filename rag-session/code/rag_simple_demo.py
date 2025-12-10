"""
RAG Pipeline - Simplified Demo for Beginners
=============================================

This is a minimal example showing the core RAG concepts
in just a few lines of code.
"""

from langchain.document_loaders import TextLoader
from langchain.text_splitter import CharacterTextSplitter
from langchain.embeddings import OpenAIEmbeddings
from langchain.vectorstores import FAISS
from langchain.chains import RetrievalQA
from langchain.llms import OpenAI

# ----- THE RAG PIPELINE IN 5 STEPS -----

# 1️⃣ LOAD: Get your documents
loader = TextLoader("sample_data/company_policies.txt")
documents = loader.load()

# 2️⃣ SPLIT: Break documents into smaller pieces
splitter = CharacterTextSplitter(chunk_size=500, chunk_overlap=50)
chunks = splitter.split_documents(documents)

# 3️⃣ EMBED: Convert text to numbers (vectors)
embeddings = OpenAIEmbeddings()
vector_store = FAISS.from_documents(chunks, embeddings)

# 4️⃣ RETRIEVE + GENERATE: Create the RAG chain
rag_chain = RetrievalQA.from_chain_type(
    llm=OpenAI(),
    retriever=vector_store.as_retriever()
)

# 5️⃣ ASK: Query your documents!
answer = rag_chain.run("What is the annual leave policy?")
print(answer)
