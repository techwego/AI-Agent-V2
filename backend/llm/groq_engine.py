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
            self.client = groq.Groq(api_key=Config.GROQ_API_KEY, max_retries=2)
            
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
            
            in_think_block = False
            buffer = ""
            
            for chunk in response:
                if chunk.choices and chunk.choices[0].delta.content:
                    buffer += chunk.choices[0].delta.content
                    
                    while True:
                        if not in_think_block:
                            if "<think>" in buffer:
                                before, rest = buffer.split("<think>", 1)
                                if before:
                                    yield before
                                buffer = rest
                                in_think_block = True
                            else:
                                if len(buffer) > 7:
                                    safe_text = buffer[:-7]
                                    buffer = buffer[-7:]
                                    yield safe_text
                                break
                        else:
                            if "</think>" in buffer:
                                _, rest = buffer.split("</think>", 1)
                                buffer = rest
                                in_think_block = False
                            else:
                                if len(buffer) > 9:
                                    buffer = buffer[-9:]
                                break
            
            if not in_think_block and buffer:
                # Strip out any partial "<think" at the very end just in case
                if buffer.startswith("<thin"):
                    pass
                else:
                    yield buffer
            
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
            if "getaddrinfo failed" not in str(e) and "Connection error" not in str(e):
                traceback.print_exc()
            else:
                print("Note: Network connection to Groq API failed. Please check your internet connection.")
            print("=" * 60)
            
            error_str = str(e)
            if "429" in error_str or "rate_limit" in error_str.lower() or "quota" in error_str.lower():
                yield "I am currently receiving too many requests. Please wait about a minute and try again."
            elif "timeout" in error_str.lower():
                yield "I'm having trouble connecting to the network right now. Please check your connection and try again."
            else:
                yield "I'm sorry, my language module encountered an error connecting to Groq."
            Config.record_llm_error()

    def generate_sync(self, prompt: str, json_mode: bool = False) -> str:
        """Synchronous version for internal tasks like query rewriting."""
        if not self.client:
            return ""
        
        try:
            kwargs = {
                "model": Config.GROQ_MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "stream": False,
                "temperature": 0.1,
            }
            if json_mode:
                kwargs["response_format"] = {"type": "json_object"}
                
            response = self.client.chat.completions.create(**kwargs)
            
            if response.choices and response.choices[0].message.content:
                content = response.choices[0].message.content
                import re
                content = re.sub(r'<think>.*?</think>', '', content, flags=re.DOTALL)
                return content.strip()
            return ""
        except Exception as e:
            print(f"Sync generation error: {e}")
            return ""
