import dotenv from 'dotenv';
dotenv.config();
import OpenAI from 'openai';
import { writeFile } from 'fs/promises';
import { generateAudio } from '../../audioGenerator';
import { generateFillerContext } from '../../fillerContext';
import fs from 'fs';

const openai = new OpenAI({
	apiKey: process.env.OPENROUTER_API_KEY,
	baseURL: 'https://openrouter.ai/api/v1',
});

// Function to parse JSON response
function extractJsonFromMarkdown(content: string): string | null {
	// Match ```json ... ```
	const match = content.match(/```json\s*([\s\S]*?)```/i);
	if (match && match[1]) {
	  return match[1].trim();
	}
	// Fallback: match any code block
	const fallback = content.match(/```[\s\S]*?```/);
	if (fallback) {
	  return fallback[0].replace(/```[a-zA-Z]*|```/g, '').trim();
	}
	// If no code block, try to find first { ... }
	const curly = content.match(/{[\s\S]*}/);
	if (curly) {
	  return curly[0];
	}
	return null;
  }

async function generateTranscript(
	topic: string,
	agentA: string,
	agentB: string
) {
	try {
		console.log('🤖 Sending topic to AI model');

		const completion = await openai.chat.completions.create({
			messages: [
				{
					role: 'system',
					content: `Create a dialogue for a short-form conversation on the topic of ${topic}. The conversation should be between two agents, ${agentA.replace(
						'_',
						' '
					)} and ${agentB}, who should act as extreme, over-the-top caricatures of themselves with wildly exaggerated personality traits and mannerisms. ${agentA.replace(
						'_',
						' '
					)} and ${agentB.replace(
						'_',
						' '
					)} should both be absurdly vulgar and crude in their language, cursing excessively and making outrageous statements to the point where it becomes almost comically over-the-top. The dialogue should still provide insights into ${topic} but do so in the most profane and shocking way possible. Limit the dialogue to a maximum of ${7} exchanges, aiming for a concise transcript that would last for 1 minute. The agentId attribute should either be ${agentA} or ${agentB}. The text attribute should be that character's line of dialogue. Make it as edgy and controversial as possible while still being funny. Remember, ${agentA} and ${agentB} are both ${agentA.replace(
						'_',
						' '
					)} and ${agentB.replace(
						'_',
						' '
					)} behaving like they would in real life, but more inflammatory. The JSON format WHICH MUST BE ADHERED TO ALWAYS is as follows: { transcript: { [ {'agentId': 'the exact value of ${agentA} or ${agentB} depending on who is talking', 'text': 'their line of conversation in the dialog'} ] } }`,
				},
				{
					role: 'user',
					content: `generate a video about ${topic}. Both the agents should talk about it in a way they would, but extremify their qualities and make the conversation risque so that it would be interesting to watch and edgy.`,
				},
			],
			response_format: { type: 'json_object' },
			model: 'deepseek/deepseek-r1:free',
			temperature: 0.5,
			max_tokens: 4096,
			top_p: 1,
			stop: null,
			stream: false,
		});

		console.log('✅ Chat completion received');
		const content = completion.choices[0]?.message?.content || '';
		console.log('📄 Content:', content);
		console.log('📄 Content length:', content.length);

		return content;
	} catch (error) {
		console.error('❌ Error in generateTranscript:', error);
		throw error;
	}
}

function delay(ms: number) {
	console.log(`⏳ Delaying for ${ms}ms`);
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export default async function Transcript(
	topic: string,
	agentA: string,
	agentB: string
) {
	console.log('🎬 Starting transcript generation');

	let transcript: Transcript[] | null = null;
	let attempts = 0;

	while (attempts < 5) {
		console.log(`🔄 Attempt ${attempts + 1}/5`);
		try {
			console.log('📝 Generating transcript...');
			const content = await generateTranscript(topic, agentA, agentB);

			console.log('🔍 Parsing content...');
			let jsonString = extractJsonFromMarkdown(content);
			if (!jsonString) {
				throw new Error('Could not extract JSON from content');
			}
			const parsedContent = JSON.parse(jsonString);

			// Extract the transcript array from the response
			transcript = parsedContent?.transcript || null;

			if (transcript !== null && Array.isArray(transcript)) {
				console.log('✅ Valid transcript generated');
				console.log('📜 Transcript lines:');
				transcript.forEach((entry, index) => {
					console.log(`${index + 1}. ${entry.agentId}: "${entry.text}"`);
				});
				return transcript;
			} else {
				console.log('⚠️ Invalid or empty transcript received');
			}
		} catch (error) {
			console.error(`❌ Attempt ${attempts + 1} failed:`, error);
			console.log('⏳ Waiting before next attempt...');
			await delay(15000);
		}
		attempts++;
	}

	console.error('❌ All attempts failed');
	throw new Error(
		`Failed to automatically generate valid transcript after 5 attempts for topic: ${topic}`
	);
}

export async function generateTranscriptAudio({
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
	transcriptPath?: string;
}) {
	try {
		console.log('📜 Getting transcript');

		// Initialize array
		let transcript : Transcript[];
		
		// If transcriptPath is provided, read it in
		if (transcriptPath) {
			transcript = JSON.parse(
				fs.readFileSync(transcriptPath, 'utf-8')
			) as Transcript[];

			console.log('✅ Transcript read from file:', transcriptPath);
			console.log('✅ Transcript has', transcript.length, 'entries');
		}
		// If it's not, generate the transcript using user-provided topic
		else {
			transcript = (await Transcript(
				topic,
				agentA,
				agentB
			)) as Transcript[];
			console.log('✅ Transcript generated:', transcript.length, 'entries');
		}
		
		const audios = [];

		for (let i = 0; i < transcript.length; i++) {
			const person = transcript[i].agentId;
			const line = transcript[i].text;

			await generateAudio(person, line, i);
			audios.push({
				person: person,
				audio: `public/voice/${person}-${i}.wav`,
				index: i,
			});
		}

		const initialAgentName = audios[0].person;

		let contextContent = `
		import { staticFile } from 'remotion';

		export const music: string = ${
					music === 'NONE' ? `'NONE'` : `'/music/${music}.MP3'`
				};
		export const initialAgentName = '${initialAgentName}';
		export const videoFileName = '/background/MINECRAFT-0.mp4';
		export const videoMode = 'normal';

		export const subtitlesFileName = [
		${audios
				.map(
					(entry, i) => `{
			name: '${entry.person}',
			file: staticFile('srt/${entry.person}-${i}.srt'),
		}`
				)
				.join(',\n  ')}
		];
		`;

		contextContent += generateFillerContext('normal');

		await writeFile('src/tmp/context.tsx', contextContent, 'utf-8');

		return { audios, transcript };
	} catch (err) {
		throw err;
	}
}