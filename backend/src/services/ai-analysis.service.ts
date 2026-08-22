import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';
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

const ANALYSIS_TOOL: Anthropic.Tool = {
  name: 'record_document_analysis',
  description:
    'Records the structured analytical reading of a document including multi-tier summaries, key takeaways, thematic main ideas, and actionable reading suggestions.',
  input_schema: {
    type: 'object',
    properties: {
      summary: {
        type: 'object',
        properties: {
          short: {
            type: 'string',
            description:
              'A crisp 1-2 sentence high-level executive summary (approx 30-50 words).',
          },
          medium: {
            type: 'string',
            description:
              'A balanced 1-2 paragraph summary capturing the core premise, evidence, and conclusions (approx 100-150 words).',
          },
          long: {
            type: 'string',
            description:
              'A thorough multi-paragraph synthesis covering context, methodology/reasoning, detailed findings, and broader implications (approx 250-400 words).',
          },
        },
        required: ['short', 'medium', 'long'],
      },
      keyPoints: {
        type: 'array',
        items: { type: 'string' },
        description:
          'A list of 3-6 distinct, punchy bullet points representing the most important findings, claims, or takeaways.',
      },
      mainIdeas: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description:
                'A concise, evocative title for the concept or thematic argument (3-6 words).',
            },
            body: {
              type: 'string',
              description:
                'A 1-3 sentence explanation of the argument, showing how it is supported in the document.',
            },
          },
          required: ['title', 'body'],
        },
        description:
          'A list of 2-5 major structural themes or core arguments explored in the document.',
      },
      suggestions: {
        type: 'array',
        items: { type: 'string' },
        description:
          'A list of 2-4 actionable insights, practical recommendations, or probing questions for further investigation.',
      },
    },
    required: ['summary', 'keyPoints', 'mainIdeas', 'suggestions'],
  },
};

const SYSTEM_PROMPT = `You are UNFOLD, a calm, deeply thoughtful research assistant and document intelligence engine.
Your purpose is to read complex texts with care, nuance, and structural clarity.
You extract clear multi-tiered summaries (Short, Medium, Long), core claims, structured main ideas with descriptive titles and explanations, and actionable reading suggestions.
Always preserve the author's tone, precision, and central intent.
You MUST output your final analysis using the record_document_analysis tool call.`;

const MAX_WORD_LIMIT = 150000;
const CHUNK_WORD_THRESHOLD = 25000;
const CHUNK_SIZE = 12000;
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
 * Executes structured AI document analysis on extracted text using Anthropic Claude.
 * Handles text validation, single-pass analysis, safe hierarchical chunking for large
 * documents, structured tool parsing, and error handling.
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

  const apiKey = config.anthropicApiKey || process.env.ANTHROPIC_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    throw new AiAnalysisError(
      'Anthropic API key is not configured. Please set ANTHROPIC_API_KEY in your server environment to enable AI analysis.'
    );
  }

  const client = new Anthropic({ apiKey: apiKey.trim() });
  const modelName = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';

  try {
    let contentToAnalyze = trimmed;

    // Hierarchical chunking strategy if document exceeds single-pass threshold
    if (words.length > CHUNK_WORD_THRESHOLD) {
      console.log(`[AI Analysis] Document has ${words.length} words; using hierarchical chunking strategy.`);
      const chunks = chunkTextByWords(words, CHUNK_SIZE, CHUNK_OVERLAP);
      const sectionSummaries: string[] = [];

      for (let i = 0; i < chunks.length; i++) {
        console.log(`[AI Analysis] Distilling section ${i + 1} of ${chunks.length}...`);
        const chunkResponse = await client.messages.create({
          model: modelName,
          max_tokens: 1024,
          system:
            'You are an expert synthesizer. Distill the core arguments, evidence, and structure from this document section into a concise 150-200 word summary with 3 bullet takeaways.',
          messages: [
            {
              role: 'user',
              content: `Summarize section ${i + 1} of ${chunks.length}:\n\n${chunks[i]}`,
            },
          ],
        });

        const chunkText = chunkResponse.content
          .filter((b): b is Anthropic.TextBlock => b.type === 'text')
          .map((b) => b.text)
          .join('\n\n');

        sectionSummaries.push(`--- SECTION ${i + 1} OF ${chunks.length} ---\n${chunkText}`);
      }

      contentToAnalyze = `Below are synthesized summaries covering the entire document in sequential sections:\n\n${sectionSummaries.join(
        '\n\n'
      )}`;
    }

    // Main analysis pass with structured tool output
    const response = await client.messages.create({
      model: modelName,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: [ANALYSIS_TOOL],
      tool_choice: { type: 'tool', name: 'record_document_analysis' },
      messages: [
        {
          role: 'user',
          content: `Please read and analyze the following document content, providing multi-tiered summaries (Short, Medium, Long), key takeaways, thematic main ideas with titles and bodies, and actionable follow-up suggestions:\n\n${contentToAnalyze}`,
        },
      ],
    });

    const toolUseBlock = response.content.find(
      (block): block is Anthropic.ToolUseBlock =>
        block.type === 'tool_use' && block.name === 'record_document_analysis'
    );

    if (toolUseBlock && toolUseBlock.input) {
      const parsed = AnalysisResultSchema.parse(toolUseBlock.input);
      return parsed;
    }

    // Fallback: parse JSON from text blocks if tool call wasn't returned
    const textBlock = response.content.find(
      (block): block is Anthropic.TextBlock => block.type === 'text'
    );
    if (textBlock && textBlock.text) {
      const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsedJson = JSON.parse(jsonMatch[0]);
        return AnalysisResultSchema.parse(parsedJson);
      }
    }

    throw new AiAnalysisError('AI provider did not return structured analysis data.');
  } catch (error) {
    if (error instanceof AiAnalysisError) {
      throw error;
    }
    if (error instanceof Anthropic.AuthenticationError) {
      throw new AiAnalysisError(
        'Invalid Anthropic API key. Please check your ANTHROPIC_API_KEY configuration.'
      );
    }
    if (error instanceof Anthropic.RateLimitError) {
      throw new AiAnalysisError(
        'AI service rate limit reached. Please wait a moment and try again.'
      );
    }
    if (error instanceof Anthropic.APIConnectionError) {
      throw new AiAnalysisError(
        'Unable to connect to AI analysis service. Please check network connectivity.'
      );
    }
    if (error instanceof Anthropic.APIError) {
      throw new AiAnalysisError(`AI analysis service error: ${error.message}`);
    }
    if (error instanceof z.ZodError) {
      console.error('[AI Analysis] Zod validation failed:', error.issues || error.message);
      throw new AiAnalysisError('Received malformed response format from AI service.');
    }
    console.error('[AI Analysis Error]', error);
    throw new AiAnalysisError(
      error instanceof Error ? error.message : 'An unexpected error occurred during AI analysis.'
    );
  }
}
