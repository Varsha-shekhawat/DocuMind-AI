import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config/env.js';

export class AiQaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiQaError';
  }
}

export const QaResultSchema = z.object({
  answer: z.string().min(1, 'Answer is required'),
  sources: z.array(z.string()).default([]),
});

export type QaResult = z.infer<typeof QaResultSchema>;

const QA_TOOL: Anthropic.Tool = {
  name: 'record_document_answer',
  description:
    'Records the grounded answer to the user question along with key verbatim quotation excerpts from the document context.',
  input_schema: {
    type: 'object',
    properties: {
      answer: {
        type: 'string',
        description:
          'The direct, clear answer strictly grounded in the document context. If the document lacks sufficient info, state clearly that the document does not contain enough information.',
      },
      sources: {
        type: 'array',
        items: { type: 'string' },
        description:
          '1-3 concise, verbatim quote snippets from the document context that substantiate the answer (empty array if no direct quote applies or if info is missing).',
      },
    },
    required: ['answer', 'sources'],
  },
};

const QA_SYSTEM_PROMPT = `You are UNFOLD Document Assistant, a precise, faithful reading companion.
Your mission is to answer user questions about a document using ONLY the provided document context.

Strict Guidelines:
1. Ground your entire answer exclusively in the text of the provided document.
2. If the document does not contain sufficient information to answer the question, clearly state: "Based on the provided document, there is not enough information to answer this question." Do not extrapolate, speculate, or guess.
3. NEVER use outside world knowledge to fabricate facts or make assumptions not directly stated in the text.
4. When possible, include 1-3 short, verbatim quote excerpts from the document in the sources field to substantiate your answer.
5. Provide clear, structured, and helpful responses formatted in clean text or markdown bullets where appropriate.
6. Always invoke the record_document_answer tool to return your result.`;

const SINGLE_PASS_WORD_LIMIT = 25000;
const MAX_QUERY_WORDS = 15000;
const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren',
  'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
  'can', 'could', 'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for', 'from',
  'further', 'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself',
  'his', 'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'just', 'me', 'more', 'most',
  'my', 'myself', 'no', 'nor', 'not', 'now', 'of', 'off', 'on', 'once', 'only', 'or', 'other',
  'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'she', 'should', 'so', 'some', 'such',
  'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they',
  'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'we', 'were',
  'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'with', 'would', 'you', 'your',
]);

function extractKeywords(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

function retrieveRelevantContext(
  text: string,
  question: string,
  summaryContext?: string
): string {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (paragraphs.length <= 10) {
    return text;
  }

  const keywords = extractKeywords(question);
  if (keywords.length === 0) {
    // If no specific keywords, take the first N paragraphs up to word limit
    return paragraphs.slice(0, 20).join('\n\n');
  }

  // Score each paragraph based on keyword matches
  const scored = paragraphs.map((para, index) => {
    const lower = para.toLowerCase();
    let score = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        score += 1;
        // Boost for exact word boundary match
        const regex = new RegExp(`\\b${kw}\\b`, 'i');
        if (regex.test(para)) {
          score += 1.5;
        }
      }
    }
    return { para, index, score };
  });

  // Sort by score descending, pick highest relevant
  const topMatches = scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 18);

  // If few or no keyword matches, fallback to beginning + middle sections
  if (topMatches.length === 0) {
    return paragraphs.slice(0, 20).join('\n\n');
  }

  // Restore original chronological order of paragraphs
  topMatches.sort((a, b) => a.index - b.index);

  let totalWords = 0;
  const selectedParagraphs: string[] = [];

  for (const match of topMatches) {
    const wordCount = match.para.split(/\s+/).length;
    if (totalWords + wordCount > MAX_QUERY_WORDS && selectedParagraphs.length > 0) {
      break;
    }
    selectedParagraphs.push(match.para);
    totalWords += wordCount;
  }

  const header = summaryContext
    ? `[DOCUMENT OVERVIEW]:\n${summaryContext}\n\n[RELEVANT DOCUMENT EXCERPTS]:\n`
    : '[RELEVANT DOCUMENT EXCERPTS]:\n';

  return header + selectedParagraphs.join('\n\n');
}

export interface AnswerQuestionInput {
  documentText: string;
  documentName: string;
  question: string;
  summaryContext?: string;
}

/**
 * Answers a question strictly grounded in the provided document text using Anthropic Claude.
 */
export async function answerDocumentQuestion(input: AnswerQuestionInput): Promise<QaResult> {
  const trimmedText = (input.documentText || '').trim();
  const trimmedQuestion = (input.question || '').trim();

  if (!trimmedText) {
    throw new AiQaError('Document text is empty; cannot answer questions.');
  }

  if (!trimmedQuestion) {
    throw new AiQaError('Please provide a valid question.');
  }

  const apiKey = config.anthropicApiKey || process.env.ANTHROPIC_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    throw new AiQaError(
      'Anthropic API key is not configured. Please set ANTHROPIC_API_KEY in your server environment to enable document Q&A.'
    );
  }

  const client = new Anthropic({ apiKey: apiKey.trim() });
  const modelName = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';

  const words = trimmedText.split(/\s+/).filter(Boolean);
  let contextText = trimmedText;

  if (words.length > SINGLE_PASS_WORD_LIMIT) {
    console.log(`[AI Q&A] Large document (${words.length} words); retrieving contextual passages.`);
    contextText = retrieveRelevantContext(trimmedText, trimmedQuestion, input.summaryContext);
  }

  try {
    const response = await client.messages.create({
      model: modelName,
      max_tokens: 2048,
      system: QA_SYSTEM_PROMPT,
      tools: [QA_TOOL],
      tool_choice: { type: 'tool', name: 'record_document_answer' },
      messages: [
        {
          role: 'user',
          content: `Document Title: "${input.documentName}"\n\n--- DOCUMENT CONTEXT START ---\n${contextText}\n--- DOCUMENT CONTEXT END ---\n\nUser Question: ${trimmedQuestion}\n\nPlease answer the question based strictly on the document context above.`,
        },
      ],
    });

    const toolUseBlock = response.content.find(
      (block): block is Anthropic.ToolUseBlock =>
        block.type === 'tool_use' && block.name === 'record_document_answer'
    );

    if (toolUseBlock && toolUseBlock.input) {
      const parsed = QaResultSchema.parse(toolUseBlock.input);
      return parsed;
    }

    // Fallback: parse text block if tool call was missed
    const textBlock = response.content.find(
      (block): block is Anthropic.TextBlock => block.type === 'text'
    );
    if (textBlock && textBlock.text) {
      const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsedJson = JSON.parse(jsonMatch[0]);
        return QaResultSchema.parse(parsedJson);
      }
      return {
        answer: textBlock.text.trim(),
        sources: [],
      };
    }

    throw new AiQaError('AI provider did not return an answer.');
  } catch (error) {
    if (error instanceof AiQaError) {
      throw error;
    }
    if (error instanceof Anthropic.AuthenticationError) {
      throw new AiQaError('Invalid Anthropic API key. Please check your ANTHROPIC_API_KEY setting.');
    }
    if (error instanceof Anthropic.RateLimitError) {
      throw new AiQaError('AI service rate limit reached. Please wait a moment before trying again.');
    }
    if (error instanceof Anthropic.APIConnectionError) {
      throw new AiQaError('Unable to connect to AI service. Please check your network connection.');
    }
    if (error instanceof Anthropic.APIError) {
      throw new AiQaError(`AI service error: ${error.message}`);
    }
    if (error instanceof z.ZodError) {
      console.error('[AI Q&A] Zod validation failed:', error.issues || error.message);
      throw new AiQaError('Received malformed response structure from the AI service.');
    }
    console.error('[AI Q&A Error]', error);
    throw new AiQaError(
      error instanceof Error ? error.message : 'An unexpected error occurred while generating the answer.'
    );
  }
}
