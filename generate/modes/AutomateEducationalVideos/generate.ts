import getAudioDuration from '../../audioDuration';
import * as fs from 'fs';
import concatenateAudioFiles from '../../concat';
//import { generateCleanSrt } from '../../cleanSrt';
import { secondsToSrtTime, srtTimeToSeconds } from '../../transcribeAudio';
import { transcribeAudio } from '../../transcribeAudio';
import { generateTranscriptAudio } from './transcript';

export default async function generateIntermediateFiles({
	topic,
	agentA,
	agentB,
	music,
	transcriptPath,
}: {
	topic: string;
	agentA: string;
	agentB: string;
	music: string;
	transcriptPath: string;
}) {
	const { audios, transcript } = await generateTranscriptAudio({
		topic,
		agentA,
		agentB,
		music,
		transcriptPath,
	});
	let startingTime = 0;

	// Concatenate audio files if needed, or comment out if not used
	concatenateAudioFiles();

	// Perform transcription and get the result
	const transcriptionResults = await transcribeAudio(
		audios.map((audio: any) => audio.audio)
	);

	const uncleanSrtContentArr = [];

	// Iterate over each transcription result and corresponding audio file
	for (let i = 0; i < (transcriptionResults ?? []).length; i++) {
		const transcription = transcriptionResults![i][0];
		const audio = audios[i]; // Corresponding audio file object
		let srtIndex = 1; // SRT index starts at 1

		// Initialize SRT content
		let srtContent = '';

		const words = transcription.segments.flatMap(
			(segment: any) => segment.words
		);
		for (let j = 0; j < words.length; j++) {
			const word = words[j];
			const nextWord = words[j + 1];

			// Set the start time to the word's start time
			const startTime = secondsToSrtTime(word.start);

			// If there's a next word, the end time is the next word's start time
			// Otherwise, use the current word's end time
			const endTime = nextWord
				? secondsToSrtTime(nextWord.start)
				: secondsToSrtTime(word.end);

			// Append the formatted SRT entry to the content
			srtContent += `${srtIndex}\n${startTime} --> ${endTime}\n${word.text}\n\n`;
			srtIndex++;
		}

		const lines = srtContent.split('\n');

		const incrementedSrtLines = lines.map((line) => {
			const timeMatch = line.match(
				/(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/
			);
			if (timeMatch) {
				const startTime = srtTimeToSeconds(timeMatch[1]) + startingTime;
				const endTime = srtTimeToSeconds(timeMatch[2]) + startingTime;
				const incrementedStartTime = secondsToSrtTime(startTime);
				const incrementedEndTime = secondsToSrtTime(endTime);
				return `${incrementedStartTime} --> ${incrementedEndTime}`;
			}
			return line;
		});

		const incrementedSrtContent = incrementedSrtLines.join('\n');

		// The name of the SRT file is based on the second element of the audio array but with the .srt extension
		const srtFileName = audio.audio
			.replace('voice', 'srt')
			.replace('.wav', '.srt');

		uncleanSrtContentArr.push({
			content: incrementedSrtContent,
			fileName: srtFileName,
		});

		fs.writeFileSync(srtFileName, incrementedSrtContent, 'utf-8');

		const duration = await getAudioDuration(audio.audio);
		startingTime += duration + 0.2;
	}

	// Commented out for manual cleaning
	/*await generateCleanSrt(
		transcript.map((t: any) => t.text),
		uncleanSrtContentArr
	);*/
}
