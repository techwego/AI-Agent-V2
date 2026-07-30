from abc import ABC, abstractmethod

class STTEngine(ABC):
    @abstractmethod
    def transcribe_stream(self, audio_stream):
        """
        Takes an audio stream and yields partial/final transcriptions.
        """
        pass
