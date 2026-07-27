import os
import glob
from langchain_community.document_loaders import (
    PyPDFLoader,
    Docx2txtLoader,
    TextLoader,
    CSVLoader,
    UnstructuredExcelLoader
)
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate

class LibraryRAG:
    def __init__(self, data_dir, persist_dir="./chroma_db"):
        self.data_dir = data_dir
        self.persist_dir = persist_dir
        self.embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        self.vector_store = None
        self.retriever = None
        self.llm = None
        self.qa_chain = None

    def load_documents(self):
        docs = []
        # Ensure data directory exists
        if not os.path.exists(self.data_dir):
            print(f"Warning: Data directory {self.data_dir} does not exist.")
            return docs

        for file_path in glob.glob(os.path.join(self.data_dir, "*.*")):
            ext = os.path.splitext(file_path)[1].lower()
            try:
                if ext == ".pdf":
                    loader = PyPDFLoader(file_path)
                elif ext == ".docx":
                    loader = Docx2txtLoader(file_path)
                elif ext == ".txt":
                    loader = TextLoader(file_path, encoding='utf-8')
                elif ext == ".csv":
                    loader = CSVLoader(file_path)
                elif ext == ".xlsx":
                    loader = UnstructuredExcelLoader(file_path)
                else:
                    continue
                docs.extend(loader.load())
                print(f"Loaded {file_path}")
            except Exception as e:
                print(f"Failed to load {file_path}: {e}")
        return docs

    def initialize(self):
        # Initialize Gemini LLM
        api_key = os.environ.get("GEMINI_API_KEY", "")
            
        self.llm = ChatGoogleGenerativeAI(model="gemini-flash-latest", temperature=0.3, google_api_key=api_key)

        if os.path.exists(self.persist_dir) and os.listdir(self.persist_dir):
            print("Loading existing Chroma database...")
            self.vector_store = Chroma(persist_directory=self.persist_dir, embedding_function=self.embeddings)
        else:
            print("Creating new Chroma database from data files...")
            docs = self.load_documents()
            text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
            splits = text_splitter.split_documents(docs)
            if not splits:
                print("Warning: No text splits found. Ensure your data folder has valid documents.")
                self.vector_store = Chroma(persist_directory=self.persist_dir, embedding_function=self.embeddings)
            else:
                self.vector_store = Chroma.from_documents(documents=splits, embedding=self.embeddings, persist_directory=self.persist_dir)
            
        self.retriever = self.vector_store.as_retriever(search_kwargs={"k": 4})
        
        system_prompt = (
            "You are Sam, a helpful library assistant for Athenaeum Library. "
            "Use the following pieces of retrieved context to answer the user's question. "
            "If you don't know the answer, just say that you don't know, don't try to make up an answer. "
            "Ensure you answer all the questions comprehensively based on the context. "
            "Keep your answers conversational, concise, and friendly, as they will be spoken out loud.\n\n"
            "{context}"
        )

        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("human", "{input}"),
        ])
        
        from langchain_core.runnables import RunnablePassthrough
        from langchain_core.output_parsers import StrOutputParser

        def format_docs(docs):
            return "\n\n".join(doc.page_content for doc in docs)

        self.qa_chain = (
            {"context": self.retriever | format_docs, "input": RunnablePassthrough()}
            | prompt
            | self.llm
            | StrOutputParser()
        )
        print("RAG Engine successfully initialized.")

    def query(self, user_input: str) -> str:
        if not self.qa_chain:
            return "Error: RAG engine is not initialized."
        
        response = self.qa_chain.invoke(user_input)
        return response

