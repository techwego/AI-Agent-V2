from backend.llm.base import LLMEngine
from typing import Generator
import groq
from backend.config import Config
import time
import traceback

class GroqEngine(LLMEngine):
    def __init__(self):
        if not Config.GROQ_API_KEY:
            self.client = None
            print("Warning: GROQ_API_KEY is not set.")
        else:
            self.client = groq.Groq(api_key=Config.GROQ_API_KEY, max_retries=0)
            
    def generate_stream(self, prompt: str) -> Generator[str, None, None]:
        t0 = time.time()
        token_count = len(prompt) // 4
        
        if not self.client:
            yield "I am currently not connected to the AI service. Please check the Groq API key."
            return
            
        try:
            response = self.client.chat.completions.create(
                model=Config.GROQ_MODEL,
                messages=[
                    {"role": "user", "content": prompt}
                ],
                stream=True,
                temperature=0.3,
            )
            
            for chunk in response:
                if chunk.choices and chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
            
            duration = time.time() - t0
            Config.record_llm_success(duration)
            
        except Exception as e:
            duration = time.time() - t0
            print("=" * 60)
            print("GROQ ERROR")
            print("=" * 60)
            print(f"Model: {Config.GROQ_MODEL}")
            print(f"Duration: {duration:.2f}s")
            print(f"Tokens: {token_count}")
            print(f"Error: {e}")
            traceback.print_exc()
            print("=" * 60)
            
            error_str = str(e)
            if "429" in error_str or "rate_limit" in error_str.lower() or "quota" in error_str.lower():
                yield "I am currently receiving too many requests. Please wait about a minute and try again."
            else:
                yield "I'm sorry, my language module encountered an error connecting to Groq."
            Config.record_llm_error()
