import sys
import whisper
import os
import subprocess
import re

# Caminho do ffmpeg local
ffmpeg_path = os.path.join("tools", "ffmpeg", "bin", "ffmpeg")

# Garante que o Whisper use o ffmpeg correto
os.environ["PATH"] = os.path.abspath(os.path.dirname(ffmpeg_path)) + os.pathsep + os.environ["PATH"]

def clean_text(text):
    # Remove pontuação desnecessária
    text = re.sub(r"[.?!…]", "", text)

    # Remove "h" no início ou fim de palavras curtas (ex: ah → a, oh → o, hã → ã)
    words = text.lower().split()
    cleaned_words = []

    for word in words:
        if len(word) <= 3:
            # Remove h no início ou fim
            word = re.sub(r"^h+|h+$", "", word)
        cleaned_words.append(word)

    return " ".join(cleaned_words).strip()

def transcribe(audio_path):
    model = whisper.load_model("base")
    result = model.transcribe(
        audio_path,
        language="pt",          # corrige para o código do idioma
        temperature=0.0         # desativa variações aleatórias
    )
    cleaned = clean_text(result["text"])
    print(cleaned)

if __name__ == "__main__":
    transcribe(sys.argv[1])
