import sys
import torch
from TTS.api import TTS

def main():
    if len(sys.argv) < 5:
        print("Usage: xtts_generate.py <text> <speaker_wav> <language> <output_wav>")
        sys.exit(1)

    text = sys.argv[1]
    speaker_wav = sys.argv[2]
    language = sys.argv[3]
    output_wav = sys.argv[4]

    tts = TTS(model_name="tts_models/multilingual/multi-dataset/xtts_v2")
    tts.tts_to_file(
        text=text,
        speaker_wav=speaker_wav,
        language=language,
        file_path=output_wav
    )

if __name__ == "__main__":
    main()