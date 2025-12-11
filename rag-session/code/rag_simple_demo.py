"""
RAG Pipeline - Simplified Demo for Beginners
=============================================

This is a minimal example showing the core RAG concepts
in just a few lines of code.

Author: Mondweep Chakravorty
Date: December 2025
"""

from langchain_community.document_loaders import TextLoader
from langchain_text_splitters import CharacterTextSplitter
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_community.vectorstores import FAISS
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough

# ----- THE RAG PIPELINE IN 5 STEPS -----

# 1. LOAD: Get your documents
loader = TextLoader("sample_data/company_policies.txt")
documents = loader.load()

# 2. SPLIT: Break documents into smaller pieces
splitter = CharacterTextSplitter(chunk_size=500, chunk_overlap=50)
chunks = splitter.split_documents(documents)

# 3. EMBED: Convert text to numbers (vectors)
embeddings = OpenAIEmbeddings()
vector_store = FAISS.from_documents(chunks, embeddings)

# 4. CREATE CHAIN: Set up retrieval + generation
retriever = vector_store.as_retriever()
prompt = ChatPromptTemplate.from_template(
    "Answer based on this context: {context}\n\nQuestion: {question}"
)
llm = ChatOpenAI(model="gpt-3.5-turbo", temperature=0)

rag_chain = (
    {"context": retriever | (lambda docs: "\n".join(d.page_content for d in docs)),
     "question": RunnablePassthrough()}
    | prompt
    | llm
    | StrOutputParser()
)

# 5. ASK: Query your documents!
answer = rag_chain.invoke("What is the annual leave policy?")
print(answer)
