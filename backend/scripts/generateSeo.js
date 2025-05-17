/** @format */

import { buildSeoPrompt } from "../utils/GptPromptBuilder.js";
// useOpenAI() or however you’re piping in GPT

const prompt = buildSeoPrompt(
	"Goblin Self-Care Kit",
	"Coloring Book",
	"Neurodivergent Adults"
);
const gptResponse = await runGpt(prompt); // however you handle it
