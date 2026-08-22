import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import { config } from '../config/env.js';

export class AiAnalysisError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiAnalysisError';
  }
}

export const AnalysisSummarySchema = z.object({
  short: z.string().min(1, 'Short summary is required'),
  medium: z.string().min(1, 'Medium summary is required'),
  long: z.string().min(1, 'Long summary is required'),
});

export const MainIdeaSchema = z.object({
  title: z.string().min(1, 'Idea title is required'),
  body: z.string().min(1, 'Idea body is required'),
});

export const AnalysisResultSchema = z.object({
  summary: AnalysisSummarySchema,
  keyPoints: z.array(z.string()).min(1, 'At least one key point is required'),
  mainIdeas: z.array(MainIdeaSchema).min(1, 'At least one main idea is required'),
  suggestions: z.array(z.string()).min(1, 'At least one suggestion is required'),
});

export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;

const SYSTEM_PROMPT = `You are UNFOLD, a calm, deeply thoughtful research assistant and document intelligence engine.
Your mission is to read complex texts with care, nuance, and structural clarity.
You extract clear multi-tiered summaries (Short, Medium, Long), core claims, structured main ideas with descriptive titles and explanations, and actionable reading suggestions.

You MUST respond strictly with a valid JSON object matching this exact schema:
{
  "summary": {
    "short": "A crisp 1-2 sentence high-level executive brief (approx 30-50 words).",
    "medium": "A balanced 1-2 paragraph overview capturing core premises, evidence, and findings (approx 100-150 words).",
    "long": "A comprehensive multi-paragraph synthesis covering context, reasoning, detailed findings, and implications (approx 250-400 words)."
  },
  "keyPoints": [
    "Punchy, distinct bullet point takeaway 1",
    "Punchy, distinct bullet point takeaway 2",
    "Punchy, distinct bullet point takeaway 3"
  ],
  "mainIdeas": [
    {
      "title": "Evocative Theme Title (3-6 words)",
      "body": "1-3 sentence explanation of the argument and how it is supported in the document."
    }
  ],
  "suggestions": [
    "Actionable recommendation or probing inquiry question 1",
    "Actionable recommendation or probing inquiry question 2"
  ]
}

Strict Rules:
1. Base your output strictly on the provided document text.
2. Return ONLY the JSON object. Do not include markdown commentary, intro text, or conversational padding outside the JSON.`;

const MAX_WORD_LIMIT = 150000;
const CHUNK_WORD_THRESHOLD = 30000;
const CHUNK_SIZE = 15000;
const CHUNK_OVERLAP = 500;

function splitIntoWords(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean);
}

function chunkTextByWords(words: string[], chunkSize: number, overlap: number): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < words.length) {
    const end = Math.min(start + chunkSize, words.length);
    chunks.push(words.slice(start, end).join(' '));
    if (end >= words.length) break;
    start += chunkSize - overlap;
  }
  return chunks;
}

/**
 * Safely parses and validates structured JSON analysis returned by Gemini.
 */
function parseAnalysisJson(rawJson: string): AnalysisResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch (_err) {
    const match = rawJson.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        parsed = JSON.parse(match[0]);
      } catch (_nestedErr) {
        throw new AiAnalysisError('Failed to parse structured JSON response from Gemini AI model.');
      }
    } else {
      throw new AiAnalysisError('Failed to parse structured JSON response from Gemini AI model.');
    }
  }

  try {
    return AnalysisResultSchema.parse(parsed);
  } catch (_zodErr) {
    if (typeof parsed === 'object' && parsed !== null) {
      const obj = parsed as Record<string, unknown>;
      const summaryObj =
        typeof obj.summary === 'object' && obj.summary !== null
          ? (obj.summary as Record<string, unknown>)
          : {};

      const short =
        typeof summaryObj.short === 'string' && summaryObj.short.trim()
          ? summaryObj.short.trim()
          : typeof obj.summary === 'string' && obj.summary.trim()
          ? obj.summary.trim()
          : 'Document processed.';
      const medium =
        typeof summaryObj.medium === 'string' && summaryObj.medium.trim()
          ? summaryObj.medium.trim()
          : short;
      const long =
        typeof summaryObj.long === 'string' && summaryObj.long.trim()
          ? summaryObj.long.trim()
          : medium;

      const rawKeyPoints = Array.isArray(obj.keyPoints) ? obj.keyPoints : [];
      const keyPoints = rawKeyPoints
        .map((p) => (typeof p === 'string' ? p.trim() : String(p).trim()))
        .filter(Boolean);
      if (keyPoints.length === 0) {
        keyPoints.push('Core insights synthesized from the document.');
      }

      const rawMainIdeas = Array.isArray(obj.mainIdeas) ? obj.mainIdeas : [];
      const mainIdeas = rawMainIdeas
        .map((idea, idx) => {
          if (typeof idea === 'object' && idea !== null) {
            const item = idea as Record<string, unknown>;
            return {
              title:
                typeof item.title === 'string' && item.title.trim()
                  ? item.title.trim()
                  : `Key Theme 0${idx + 1}`,
              body:
                typeof item.body === 'string' && item.body.trim()
                  ? item.body.trim()
                  : String(item.description || item.content || item.summary || 'Thematic analysis.').trim(),
            };
          }
          return {
            title: `Key Theme 0${idx + 1}`,
            body: String(idea).trim(),
          };
        })
        .filter((idea) => idea.title && idea.body);

      if (mainIdeas.length === 0) {
        mainIdeas.push({ title: 'Central Premise', body: medium });
      }

      const rawSuggestions = Array.isArray(obj.suggestions) ? obj.suggestions : [];
      const suggestions = rawSuggestions
        .map((s) => (typeof s === 'string' ? s.trim() : String(s).trim()))
        .filter(Boolean);
      if (suggestions.length === 0) {
        suggestions.push('Review the key takeaways and synthesize findings.');
      }

      return {
        summary: { short, medium, long },
        keyPoints,
        mainIdeas,
        suggestions,
      };
    }

    throw new AiAnalysisError('Received malformed response format from Gemini AI service.');
  }
}

/**
 * Executes structured AI document analysis on extracted text using Google Gemini 2.5 Flash.
 */
export async function analyzeDocumentText(text: string): Promise<AnalysisResult> {
  const trimmed = (text || '').trim();
  if (!trimmed) {
    throw new AiAnalysisError('Cannot analyze empty document text.');
  }

  const words = splitIntoWords(trimmed);
  if (words.length > MAX_WORD_LIMIT) {
    throw new AiAnalysisError(
      `Document is too large for AI analysis (${words.length.toLocaleString()} words). Maximum supported limit is ${MAX_WORD_LIMIT.toLocaleString()} words.`
    );
  }

  const apiKey = config.geminiApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    throw new AiAnalysisError(
      'Google Gemini API key is not configured. Please set GEMINI_API_KEY in your server environment to enable AI analysis.'
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey.trim());
  const modelName = config.geminiModel || process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  try {
    let contentToAnalyze = trimmed;

    // Hierarchical chunking strategy if document exceeds single-pass threshold
    if (words.length > CHUNK_WORD_THRESHOLD) {
      console.log(`[AI Analysis] Document has ${words.length} words; using hierarchical chunking strategy with Gemini.`);
      const chunks = chunkTextByWords(words, CHUNK_SIZE, CHUNK_OVERLAP);
      const sectionSummaries: string[] = [];

      const chunkModel = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { temperature: 0.2 },
        systemInstruction:
          'You are an expert synthesizer. Distill the core arguments, evidence, and structure from this document section into a concise 150-200 word summary with 3 bullet takeaways.',
      });

      for (let i = 0; i < chunks.length; i++) {
        console.log(`[AI Analysis] Distilling section ${i + 1} of ${chunks.length} via Gemini...`);
        const chunkPrompt = `Summarize section ${i + 1} of ${chunks.length}:\n\n${chunks[i]}`;
        const chunkResult = await chunkModel.generateContent(chunkPrompt);
        const chunkText = chunkResult.response.text();
        sectionSummaries.push(`--- SECTION ${i + 1} OF ${chunks.length} ---\n${chunkText}`);
      }

      contentToAnalyze = `Below are synthesized summaries covering the entire document in sequential sections:\n\n${sectionSummaries.join(
        '\n\n'
      )}`;
    }

    const mainModel = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
      systemInstruction: SYSTEM_PROMPT,
    });

    const userPrompt = `Please read and analyze the following document content, providing multi-tiered summaries (Short, Medium, Long), key takeaways, thematic main ideas with titles and bodies, and actionable follow-up suggestions in valid JSON format:\n\n${contentToAnalyze}`;

    const response = await mainModel.generateContent(userPrompt);
    const responseText = response.response.text();
    const analysis = parseAnalysisJson(responseText);
    return analysis;
  } catch (error: unknown) {
    if (error instanceof AiAnalysisError) {
      throw error;
    }

    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('[AI Analysis Error]', error);

    if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('API key not valid')) {
      throw new AiAnalysisError('Invalid Google Gemini API key. Please check your GEMINI_API_KEY configuration.');
    }
    if (errMsg.includes('429') || errMsg.includes('Quota exceeded') || errMsg.includes('RESOURCE_EXHAUSTED')) {
      throw new AiAnalysisError('Google Gemini API rate limit reached. Please wait a moment and try again.');
    }
    if (errMsg.includes('fetch failed') || errMsg.includes('network') || errMsg.includes('ENOTFOUND')) {
      throw new AiAnalysisError('Unable to connect to Google Gemini service. Please check network connectivity.');
    }

    throw new AiAnalysisError(
      error instanceof Error ? error.message : 'An unexpected error occurred during AI analysis.'
    );
  }
}
