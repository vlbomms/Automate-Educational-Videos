// Need to override JSON with JSON5 to avoid issue with parsing Infinity in config file
import JSON5 from 'json5';
globalThis.JSON.parse = (text: string, reviver?: any) => {
  return JSON5.parse(text, reviver);
};

import fs from 'fs';
import path from 'path';
import generateIntermediateFiles from './modes/AutomateEducationalVideos/generate';
import { exec } from 'child_process';
import { rm, mkdir } from 'fs/promises';
import { parseArgs } from 'util';

// Type definition for transcript item
type TranscriptItem = {
	agentId: string;
	text:     string;
  };

/**
 * Cleanup resources by removing old audio, context, and srt files
 * as well as recreating directories for intermediate voice files and subtitles
 */
async function cleanupResources() {
	try {
		// Delete directories for intermediate voice files and subtitles
		await rm(path.join('public', 'srt'), { recursive: true, force: true });
		await rm(path.join('public', 'voice'), { recursive: true, force: true });

		// Check if files exist before attempting to delete them
		const audioPath = path.join('public', 'audio.wav');
		const contextPath = path.join('src', 'tmp', 'context.tsx');

		// If a final audio file exists, delete it
		if (fs.existsSync(audioPath)) {
			fs.unlinkSync(audioPath);
		}

		// If a context file exists, delete it
		if (fs.existsSync(contextPath)) {
			fs.unlinkSync(contextPath);
		}

		// Recreate directories anew
		await mkdir(path.join('public', 'srt'), { recursive: true });
		await mkdir(path.join('public', 'voice'), { recursive: true });

	} catch (err: any) {
		if (
			err instanceof SyntaxError &&
			err.message.includes('Unexpected identifier "Infinity"')
		) {
			console.warn('⚠️ Ignored Infinity JSON.parse error in cleanupResources');
		} else {
			console.error(`❌ Error during cleanup:`, err);
			console.error(err.stack);
		}
	}
}

/**
 * Helper function to check if command line arguments are properly formatted
 * 
 */
function validateCLAs(s: string): boolean {
	return /^[A-Z]+(?:_[A-Z]+)*$/.test(s);
}

/**
 * Reads & validates a JSON5 transcript file.
 * Exits with error if anything is malformed.
 */
export function validateTranscript(path: string): TranscriptItem[] {
	// Read + parse
	let raw: string;
	try {
	  raw = fs.readFileSync(path, "utf-8");
	} catch (err) {
	  console.error(`❌ Could not read file at ${path}:`, (err as Error).message);
	  process.exit(1);
	}
  
	let data: unknown;
	try {
	  data = JSON5.parse(raw);
	} catch (err) {
	  console.error(`❌ Invalid JSON5 in ${path}:`, (err as Error).message);
	  process.exit(1);
	}
  
	// Root must be an array
	if (!Array.isArray(data)) {
	  console.error(`❌ Transcript must be an array, got ${typeof data}`);
	  process.exit(1);
	}
  
	// Define our agentId regex: UPPERCASE words joined by single underscores
	const AGENT_ID_RE = /^[A-Z]+(?:_[A-Z]+)*$/;
  
	// Validate each item
	data.forEach((item, idx) => {
	  if (typeof item !== "object" || item === null || Array.isArray(item)) {
		console.error(`❌ Item at index ${idx} is not an object`);
		process.exit(1);
	  }
	  const obj = item as Record<string,unknown>;
  
	  // agentId
	  if (typeof obj.agentId !== "string" || !AGENT_ID_RE.test(obj.agentId)) {
		console.error(
		  `❌ Invalid agentId at index ${idx}:`,
		  JSON.stringify(obj.agentId),
		  "\n  → must match /^[A-Z]+(?:_[A-Z]+)*$/"
		);
		process.exit(1);
	  }
  
	  // text
	  if (typeof obj.text !== "string" || obj.text.trim().length === 0) {
		console.error(
		  `❌ Invalid text at index ${idx}:`,
		  JSON.stringify(obj.text),
		  "\n  → must be a non-empty string"
		);
		process.exit(1);
	  }
	});
  
	// If we get here, it's valid
	return data as TranscriptItem[];
}

/**
 * Validate command line arguments
 * 
 */
async function validateArgs() {
	// Obtain and validate command line arguments
	const { values } = parseArgs({
		args: Bun.argv.slice(2),
		options: {
		  agentA:  { type: "string", required: true },  // e.g. --agentA BARACK_OBAMA
		  agentB:  { type: "string", required: true },  // e.g. --agentB JOE_ROGAN
		  music:  { type: "string", required: true }, // e.g. --music WII_SHOP_CHANNEL_TRAP
		  videoTopic: { type: "string", required: false }, // e.g. --videoTopic "obama wants to talk about waifu titties but joe rogan wants to talk about how he does not support indian immigration into america. obama calls joe a racist but joe calls obama out for marrying michelle, or as joe calls him michael because he thinks michelle obama is a born male. and obama claps back saying how he did jessica"
		  transcriptPath: { type: "string", required: false }, // e.g. --transcriptPath ./transcript.json
		},
		strict: true,           // throws error on unknown flags
		allowPositionals: false // disallows any extra args
	});

	const { agentA, agentB, music, videoTopic, transcriptPath } = values as {
		agentA: string;
		agentB: string;
		music: string;
		videoTopic: string;
		transcriptPath: string;
	};

	// Validate agentA further
	if (!validateCLAs(agentA)) {
		console.error("❌ agentA must only contain uppercase and underscore");
		process.exit(1);
	}
	
	console.log("✔ agentA:",  agentA);

	// Validate agentB further
	if (!validateCLAs(agentB)) {
		console.error("❌ agentB must only contain uppercase and underscore");
		process.exit(1);
	}

	console.log("✔ agentB:",  agentB);

	// Validate music further
	if (!validateCLAs(music)) {
		console.error("❌ music must only contain uppercase and underscore");
		process.exit(1);
	}

	console.log("✔ music:",  music);

	// Ensure only one of videoTopic or transcriptPath are provided
	if (videoTopic && transcriptPath) {
		console.error("❌ Provide only one of videoTopic or transcriptPath");
		process.exit(1);
	}

	// Validate videoTopic further, only if not null
	if (videoTopic) {
		if (!validateCLAs(videoTopic)) {
			console.error("❌ videoTopic must only contain uppercase and underscore");
			process.exit(1);
		}
		console.log("✔ videoTopic:",  videoTopic);
	}

	// Validate transcriptPath further, only if not null
	if (transcriptPath) {
		if (!fs.existsSync(transcriptPath)) {
			console.error("❌ transcriptPath does not exist");
			process.exit(1);
		}
		if (validateTranscript(transcriptPath)){
			console.log("✔ transcriptPath:",  transcriptPath);
		}
	}

	return { agentA, agentB, music, videoTopic, transcriptPath };
}

async function main() {

	// Obtain and validate command line arguments
	const { agentA, agentB, music, videoTopic, transcriptPath } = await validateArgs();

	await cleanupResources();

	// Generate intermediate materials needed for video
	await generateIntermediateFiles({
		agentA: agentA,
		agentB: agentB,
		music: music,
		topic: videoTopic,
		transcriptPath: transcriptPath,
	});

	// Build the video
	exec('bun run build', async (error, stdout, stderr) => {
		if (error) {
			console.error(`exec error: ${error}`);
			return;
		}
		console.log(`stdout: ${stdout}`);
		console.error(`stderr: ${stderr}`);

		cleanupResources();
	});
}

(async () => {
	await main();
})();