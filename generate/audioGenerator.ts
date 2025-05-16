import fs from 'fs';
import dotenv from 'dotenv';
import { spawn } from 'child_process';

dotenv.config();

function generateXTTS(text: string, speakerWav: string, language: string, outputWav: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const py = spawn('python3', [
      'xtts_generate.py',
      text,
      speakerWav,
      language,
      outputWav,
    ]);

    py.stdout.on('data', (data) => {
      console.log(`[XTTS] ${data}`);
    });

    py.stderr.on('data', (data) => {
      console.error(`[XTTS ERROR] ${data}`);
    });

    py.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`XTTS exited with code ${code}`));
    });
  });
}

// Cache for speaker embeddings
const speakerEmbeddings = new Map<string, any>();

// Predefined speaker reference files
const SPEAKER_REFERENCES: Record<string, string> = {
  'JOE_ROGAN': 'jreaudio.mp3',
  'BARACK_OBAMA': 'obama.mp3',
  'BEN_SHAPIRO': 'benshapiroaudio.mp3',
  'DONALD_TRUMP': 'trumpaudio.mp3',
  'JOE_BIDEN': 'joebidenaudio.mp3',
  'KAMALA_HARRIS': 'kamala.mp3',
  'ANDREW_TATE': 'tate.mp3'
};

async function getSpeakerEmbedding(speaker: string): Promise<any> {
  if (speakerEmbeddings.has(speaker)) {
    return speakerEmbeddings.get(speaker);
  }

  const refFile = SPEAKER_REFERENCES[speaker];
  if (!refFile) {
    throw new Error(`No reference file found for speaker: ${speaker}`);
  }

  const refPath = `../training_audio/${refFile}`;
  if (!fs.existsSync(refPath)) {
    throw new Error(`Reference audio file not found: ${refPath}`);
  }

  try {
    speakerEmbeddings.set(speaker, refPath);
    return refPath;
  } catch (error) {
    console.error(`Error processing speaker embedding for ${speaker}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to process speaker reference: ${errorMessage}`);
  }
}

export async function generateAudio(
  person: string,
  line: string,
  index: number
) {
  try {
    console.log(`🔊 Generating audio for ${person} (${index}): ${line.substring(0, 50)}...`);
    
    // Get or create speaker embedding
    const speakerEmbedding = await getSpeakerEmbedding(person);

    // Create output directory if it doesn't exist
    const outputDir = 'public/voice';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const wavPath = `${outputDir}/${person}-${index}.wav`;
    
    // Generate audio by call to function that calls Python script
    await generateXTTS(line, speakerEmbedding, 'en', wavPath);

    console.log(`✅ Audio generated: ${wavPath}`);
    return 'Audio file saved successfully';
  } catch (err) {
		throw err;
}
}
