# Automate Educational Videos 🎥🧠

> Automate educational videos about any topic with the voices and animation of your favorite public figures.

This project stitches together large language models, voice conversion, and video composition into a single pipeline:

1. Generate an educational script about a topic.
2. Convert that script into speech using cloned / mimicked voices.
3. Animate a talking head or character.
4. Export a ready-to-share video.

## Features

- Topic → Video in one command:
  Turn a short text prompt (e.g. _“Explain CRISPR to high schoolers”_) into a full narrated video.

- Pluggable voice models:
  Use RVC (Retrieval-based Voice Conversion) or other TTS backends to mimic specific public figures’ voices (subject to local law & platform policies).

- Reusable “personas”:
  Configure public-figure–style personalities (tone, pacing, level of detail) and reuse them across videos.

- Script + structure control:
  Generate scripts in multiple segments (intro, key ideas, summary), with adjustable length and complexity.

- Batch generation:
  Loop over a list of topics and generate multiple videos in one run.

- Extensible pipeline:
  Clean separation between script generation, audio synthesis / voice conversion, and video assembly, so you can swap components.

## High-Level Architecture
          ┌─────────────────────┐
          │   Topic / Prompt    │
          └─────────┬───────────┘
                    │
                    ▼
           ┌──────────────────┐
           │  Script Generator │  (LLM)
           └─────────┬────────┘
                     │
                     ▼
           ┌──────────────────┐
           │  Voice / RVC     │  (TTS + voice conversion)
           └─────────┬────────┘
                     │
                     ▼
           ┌──────────────────┐
           │ Video Composer   │  (avatar / talking-head / slides)
           └─────────┬────────┘
                     │
                     ▼
           ┌──────────────────┐
           │  Final MP4 File  │
           └──────────────────┘

# How to download, build, and run code:

## 1. Clone the repository
git clone https://github.com/vlbomms/Automate-Educational-Videos.git
cd Automate-Educational-Videos

## 2. Install requirements
pip install -r requirements.txt

If you run into build issues for audio / ML libraries, make sure you have:
A working C/C++ toolchain (e.g. Xcode CLT on macOS, build-essential on Linux).
ffmpeg installed and available on your PATH (for audio/video processing

## 3. Create a .env file in the project root for OpenAI key

## 4. Enjoy! Generate a video using the following command
python -m generate.run \
  --topic "Explain CRISPR to a high school biology class" \
  --persona "David Attenborough" \
  --output ./public/videos/crispr_attn.mp4


