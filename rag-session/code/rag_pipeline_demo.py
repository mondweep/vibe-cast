"""
RAG Pipeline Demo using LangChain and FAISS
============================================
Knowledge Sharing Session - Beginner Level

This script demonstrates how to build a simple Retrieval-Augmented
Generation (RAG) pipeline using LangChain and FAISS vector store.

Author: Mondweep Chakravorty
Date: 25th December 2025
"""

# =============================================================================
# STEP 1: Import Required Libraries
# =============================================================================

from langchain.document_loaders import TextLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.embeddings import OpenAIEmbeddings
from langchain.vectorstores import FAISS
from langchain.chains import RetrievalQA
from langchain.llms import OpenAI
import os

# =============================================================================
# STEP 2: Set Up Environment
# =============================================================================

# Set your OpenAI API key (in production, use environment variables)
# os.environ["OPENAI_API_KEY"] = "your-api-key-here"


# =============================================================================
# STEP 3: Load Documents
# =============================================================================

def load_documents(file_path: str):
    """
    Load documents from a text file.

    In a real-world scenario, you might load from:
    - PDF files
    - Web pages
    - Databases
    - Multiple file types

    Args:
        file_path: Path to the document file

    Returns:
        List of document objects
    """
    loader = TextLoader(file_path, encoding='utf-8')
    documents = loader.load()
    print(f"✅ Loaded {len(documents)} document(s)")
    return documents


# =============================================================================
# STEP 4: Split Documents into Chunks
# =============================================================================

def split_documents(documents, chunk_size: int = 500, chunk_overlap: int = 50):
    """
    Split documents into smaller chunks for processing.

    Why do we chunk documents?
    - LLMs have token limits
    - Smaller chunks = more precise retrieval
    - Overlap ensures context isn't lost at boundaries

    Args:
        documents: List of documents to split
        chunk_size: Maximum size of each chunk (in characters)
        chunk_overlap: Number of overlapping characters between chunks

    Returns:
        List of document chunks
    """
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        length_function=len,
        separators=["\n\n", "\n", " ", ""]
    )

    chunks = text_splitter.split_documents(documents)
    print(f"✅ Created {len(chunks)} chunks from documents")
    return chunks


# =============================================================================
# STEP 5: Create Embeddings and Vector Store
# =============================================================================

def create_vector_store(chunks):
    """
    Create embeddings and store them in FAISS vector database.

    What are embeddings?
    - Numerical representations of text
    - Capture semantic meaning
    - Enable similarity search

    What is FAISS?
    - Facebook AI Similarity Search
    - Efficient similarity search library
    - Stores and indexes embeddings

    Args:
        chunks: List of document chunks

    Returns:
        FAISS vector store
    """
    # Initialise the embedding model
    embeddings = OpenAIEmbeddings()

    # Create FAISS vector store from documents
    vector_store = FAISS.from_documents(
        documents=chunks,
        embedding=embeddings
    )

    print("✅ Vector store created successfully")
    return vector_store


# =============================================================================
# STEP 6: Create the RAG Chain
# =============================================================================

def create_rag_chain(vector_store):
    """
    Create a RAG chain that combines retrieval with generation.

    The RAG process:
    1. User asks a question
    2. Relevant documents are retrieved from vector store
    3. Retrieved documents + question are sent to LLM
    4. LLM generates answer based on context

    Args:
        vector_store: FAISS vector store with embedded documents

    Returns:
        RetrievalQA chain
    """
    # Initialise the LLM
    llm = OpenAI(temperature=0)  # temperature=0 for deterministic responses

    # Create retriever from vector store
    retriever = vector_store.as_retriever(
        search_type="similarity",
        search_kwargs={"k": 3}  # Retrieve top 3 most relevant chunks
    )

    # Create the RAG chain
    rag_chain = RetrievalQA.from_chain_type(
        llm=llm,
        chain_type="stuff",  # "stuff" = combine all retrieved docs into prompt
        retriever=retriever,
        return_source_documents=True  # Return the source documents used
    )

    print("✅ RAG chain created successfully")
    return rag_chain


# =============================================================================
# STEP 7: Query the RAG Pipeline
# =============================================================================

def ask_question(rag_chain, question: str):
    """
    Ask a question to the RAG pipeline.

    Args:
        rag_chain: The RAG chain
        question: User's question

    Returns:
        Answer and source documents
    """
    print(f"\n📝 Question: {question}")
    print("-" * 50)

    # Get response from RAG chain
    response = rag_chain({"query": question})

    # Extract answer and sources
    answer = response["result"]
    sources = response["source_documents"]

    print(f"\n💡 Answer: {answer}")
    print(f"\n📚 Sources used: {len(sources)} document(s)")

    return answer, sources


# =============================================================================
# MAIN EXECUTION
# =============================================================================

def main():
    """
    Main function to demonstrate the complete RAG pipeline.
    """
    print("=" * 60)
    print("RAG Pipeline Demo - LangChain + FAISS")
    print("=" * 60)

    # Step 1: Load documents
    documents = load_documents("sample_data/company_policies.txt")

    # Step 2: Split into chunks
    chunks = split_documents(documents)

    # Step 3: Create vector store
    vector_store = create_vector_store(chunks)

    # Step 4: Create RAG chain
    rag_chain = create_rag_chain(vector_store)

    # Step 5: Ask questions
    print("\n" + "=" * 60)
    print("Ready to answer questions!")
    print("=" * 60)

    # Example questions
    questions = [
        "What is the company's annual leave policy?",
        "How do I request time off?",
        "What are the working hours?"
    ]

    for question in questions:
        ask_question(rag_chain, question)
        print("\n")


if __name__ == "__main__":
    main()
