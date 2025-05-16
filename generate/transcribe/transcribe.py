from flask import Flask, jsonify, request
import whisper_timestamped as whispered

import json
import os
import logging

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)

@app.route('/transcribe', methods=['POST'])
def transcribe_audio():
    res = []
    try:
        data = request.json
        audios = data.get('audios')
        logger.info(f"Received request with audios: {audios}")

        if not audios:
            raise ValueError("The 'audios' is not provided in the request.")

        logger.debug("Loading model")
        model = whispered.load_model("tiny", device="cpu")

        for audio_path in audios:
            relative_audio_path = "../" + audio_path
            try:
                if not os.path.exists(relative_audio_path):
                    logger.error(f"File not found: {relative_audio_path}")
                    res.append(({"error": f"File not found: {relative_audio_path}"}, relative_audio_path))
                    continue

                file_size = os.path.getsize(relative_audio_path)
                logger.info(f"Processing file: {relative_audio_path} (size: {file_size} bytes)")

                logger.debug("Loading audio file")
                audio = whispered.load_audio(relative_audio_path)
                
                logger.debug(f"Audio loaded, shape: {audio.shape if hasattr(audio, 'shape') else 'unknown'}")
                
                logger.debug("Starting transcription")
                transcribed = whispered.transcribe(model, audio, language="en")
                logger.info(f"Transcription result: {transcribed}")
                
                logger.info(f"Successfully transcribed: {relative_audio_path}")
                res.append((transcribed, relative_audio_path))
                
            except Exception as e:
                logger.error(f"Error processing {relative_audio_path}: {str(e)}", exc_info=True)
                res.append(({"error": str(e)}, relative_audio_path))
                continue

        return jsonify(res)
    except Exception as e:
        logger.error(f"Global error in transcription: {str(e)}", exc_info=True)