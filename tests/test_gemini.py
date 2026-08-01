import os
from llama_index.llms.gemini import Gemini

api_key = os.environ.get("GEMINI_API_KEY", "")
try:
    llm = Gemini(model="models/gemini-1.5-flash", api_key=api_key)
    res = llm.complete("Hello")
    print("SUCCESS with models/gemini-1.5-flash")
except Exception as e:
    print(f"FAILED models/gemini-1.5-flash: {e}")

try:
    llm = Gemini(model="gemini-1.5-flash", api_key=api_key)
    res = llm.complete("Hello")
    print("SUCCESS with gemini-1.5-flash")
except Exception as e:
    print(f"FAILED gemini-1.5-flash: {e}")
