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
            "You are Sam, a virtual library assistant for the University Library. "
            "Use the following pieces of retrieved context to answer the user's question. "
            "If you don't know the answer, just say that you don't know. Do not guess or make up information. "
            "Adopt a professional, calm, friendly, confident, and efficient female persona. Never be overly excited, robotic, or childish. "
            "Use clear, neutral Indian English or international English, similar to a professional university front desk or corporate customer support representative. "
            "RESPONSE RULES (CRITICAL):\n"
            "1. Answer what the user asked, but do so in a natural, conversational, and polite manner. You may use polite filler words and warm transitions (e.g., 'Sure, let me help you with that', 'I'd be happy to check', 'Here is the information').\n"
            "2. Intelligent Response Length: Keep it concise but natural. Avoid robotic one-word answers. Provide a smooth, fluid sentence or two.\n"
            "3. Natural Conversation: Answer naturally with a warm, helpful tone. You are a conversational agent, so act like a real human receptionist speaking to a student.\n"
            "4. Ask clarifying questions only when necessary (e.g., if multiple books share the same title, ask for author or edition).\n\n"
            "Examples:\n"
            "User: \"Where is the Python book?\"\n"
            "Agent: \"I'd be happy to help. The Python book is available in Rack A-12.\"\n"
            "User: \"How many copies are available?\"\n"
            "Agent: \"Currently, there are 2 copies available for you to borrow.\"\n"
            "User: \"Where is the entrance?\"\n"
            "Agent: \"The entrance is just straight ahead, right next to the reception desk.\"\n"
            "User: \"Give complete details for the Python book.\"\n"
            "Agent: \"Certainly! The Python Programming book is located in Rack A-12. The Book ID is PY1002, and we have 2 copies available. The author is XYZ.\"\n\n"
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

    def ingest_file(self, file_path: str) -> bool:
        """Ingest a single file into the existing ChromaDB vector store."""
        if not self.vector_store:
            print("Error: Vector store is not initialized.")
            return False

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
                print(f"Unsupported file type: {ext}")
                return False
                
            docs = loader.load()
            text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
            splits = text_splitter.split_documents(docs)
            
            if splits:
                self.vector_store.add_documents(documents=splits)
                print(f"Successfully ingested {file_path} into vector store.")
                return True
            else:
                print(f"Warning: No text splits generated from {file_path}")
                return False
        except Exception as e:
            print(f"Failed to ingest {file_path}: {e}")
            return False


