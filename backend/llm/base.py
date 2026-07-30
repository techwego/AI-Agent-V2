from abc import ABC, abstractmethod
from typing import Generator

class LLMEngine(ABC):
    @abstractmethod
    def generate_stream(self, prompt: str) -> Generator[str, None, None]:
        pass
