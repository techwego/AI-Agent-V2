from backend.llm.base import LLMEngine
from typing import Generator
from google import genai
from backend.config import Config

class GeminiEngine(LLMEngine):
    def __init__(self):
        if not Config.GEMINI_API_KEY:
            self.client = None
            print("Warning: GEMINI_API_KEY is not set.")
        else:
            self.client = genai.Client(api_key=Config.GEMINI_API_KEY)
            
    def generate_stream(self, prompt: str) -> Generator[str, None, None]:
        import time, traceback
        
        t0 = time.time()
        token_count = len(prompt) // 4
        
        if not self.client:
            yield "I am currently not connected to the AI service. Please check the API key."
            return
            
        try:
            response = self.client.models.generate_content_stream(
                model=Config.GEMINI_MODEL,
                contents=prompt,
            )
            for chunk in response:
                if chunk.text:
                    yield chunk.text
            
            duration = time.time() - t0
            Config.record_gemini_success(duration)
            
        except Exception as e:
            duration = time.time() - t0
            print("=" * 60)
            print("GEMINI ERROR")
            print("=" * 60)
            print(f"Model: {Config.GEMINI_MODEL}")
            print(f"Duration: {duration:.2f}s")
            print(f"Tokens: {token_count}")
            print(f"Error: {e}")
            import traceback
            traceback.print_exc()
            print("=" * 60)
            
            error_str = str(e)
            if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str or "quota" in error_str.lower():
                yield "I am currently receiving too many requests. Please wait about a minute and try again."
            else:
                yield "I'm sorry, my language module encountered an error."
