import { OpenAI } from 'openai';
import dotenv from 'dotenv';
import { writeFile } from 'fs/promises';

dotenv.config();

// Function to parse JSON response
function extractSrtBlock(content: string): string {
	const lines = content.split('\n');
	let firstIdx = -1;
	let lastIdx = -1;

	// Find the first line containing -->
	for (let i = 0; i < lines.length; i++) {
		if (lines[i].includes('-->')) {
			firstIdx = i;
			break;
		}
	}

	// Find the last line containing -->
	for (let i = lines.length - 1; i >= 0; i--) {
		if (lines[i].includes('-->')) {
			lastIdx = Math.min(lines.length - 1, i + 1);
			break;
		}
	}

	// Only include subtitles, their index numbers, and their timestamps
	if (firstIdx !== -1 && lastIdx !== -1 && firstIdx <= lastIdx) {
		const block = lines.slice(firstIdx, lastIdx + 1);
		block.unshift('1');
		return block.join('\n');
	}
	return '';
}

const openai = new OpenAI({
	apiKey: process.env.OPENROUTER_API_KEY,
	baseURL: 'https://openrouter.ai/api/v1',
});

export async function generateCleanSrt(
	transcript: string[],
	srt: { content: string; fileName: string }[]
) {
	const promises = [];
	for (let i = 0; i < transcript.length; i++) {
		promises.push(cleanSrt(transcript[i], srt[i].content, i));
	}
	const responses = await Promise.all(promises);

	for (let i = 0; i < srt.length; i++) {
		const response = responses.find((response) => response.i === i);
		if (response) {
			await writeFile(srt[i].fileName, response.content ?? '', 'utf8');
		}
	}
}

async function cleanSrt(transcript: string, srt: string, i: number) {
	const completion = await openai.chat.completions.create({
		messages: [
			{
				role: 'system',
				content: `The first item I will give you is the correct text, and the next will be the SRT generated from this text which is not totally accurate. Sometimes the srt files just doesn't have words so if this is the case add the missing words to the SRT file which are present in the transcript. Based on the accurate transcript, and the possibly inaccurate SRT file, return the SRT text corrected for inaccurate spelling and such. Make sure you keep the format and the times the same.
                            
                            transcript: 
                            ${transcript}
                            
                            srt file text: 
                            ${srt}`,
			},
		],
		model: 'deepseek/deepseek-r1:free',
	});

	const content = extractSrtBlock(completion.choices[0]?.message?.content || '');
	return { content, i };
}