import { z } from 'zod';
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

const QA_SYSTEM_PROMPT = `You are UNFOLD Document Assistant, a precise, faithful reading companion.
Your mission is to answer user questions about a document using ONLY the provided document context.

Strict Guidelines:
1. Ground your entire answer exclusively in the text of the provided document.
2. If the document does not contain sufficient information to answer the question, clearly state: "Based on the provided document, there is not enough information to answer this question." Do not extrapolate, speculate, or guess.
3. NEVER use outside world knowledge to fabricate facts or make assumptions not directly stated in the text.
4. When possible, include 1-3 short, verbatim quote excerpts from the document in the "sources" field to substantiate your answer. Never fabricate quotations.
5. Provide clear, structured, and helpful responses formatted in clean text or markdown bullets where appropriate.
6. You MUST respond strictly with a valid JSON object matching this exact schema:
{
  "answer": "Direct, clear answer grounded strictly in the document context.",
  "sources": [
    "Verbatim quote snippet 1 from the text",
    "Verbatim quote snippet 2 from the text"
  ]
}
Do not output any markdown formatting or conversation text outside the JSON object.`;

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
    return paragraphs.slice(0, 20).join('\n\n');
  }

  // Score each paragraph based on keyword matches
  const scored = paragraphs.map((para, index) => {
    const lower = para.toLowerCase();
    let score = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        score += 1;
        const regex = new RegExp(`\\b${kw}\\b`, 'i');
        if (regex.test(para)) {
          score += 1.5;
        }
      }
    }
    return { para, index, score };
  });

  const topMatches = scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 18);

  if (topMatches.length === 0) {
    return paragraphs.slice(0, 20).join('\n\n');
  }

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
 * Answers a question strictly grounded in the provided document text using local Ollama.
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

  const words = trimmedText.split(/\s+/).filter(Boolean);
  let contextText = trimmedText;

  if (words.length > SINGLE_PASS_WORD_LIMIT) {
    console.log(`[AI Q&A] Large document (${words.length} words); retrieving contextual passages for Ollama.`);
    contextText = retrieveRelevantContext(trimmedText, trimmedQuestion, input.summaryContext);
  }

  const userPrompt = `Document Title: "${input.documentName}"\n\n--- DOCUMENT CONTEXT START ---\n${contextText}\n--- DOCUMENT CONTEXT END ---\n\nUser Question: ${trimmedQuestion}\n\nPlease answer the question in the required JSON format based strictly on the document context above.`;

  try {
    const url = `${config.ollamaBaseUrl}/api/chat`;
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: config.ollamaModel,
          messages: [
            { role: 'system', content: QA_SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
          ],
          format: 'json',
          stream: false,
          options: {
            temperature: 0.1,
          },
        }),
      });
    } catch (err: unknown) {
      console.error('[Ollama Connection Error]', err);
      throw new AiQaError(
        `Local AI service (Ollama) is unavailable at ${config.ollamaBaseUrl}. Please ensure Ollama is installed and running ('ollama serve') and model '${config.ollamaModel}' is available ('ollama pull ${config.ollamaModel}').`
      );
    }

    if (!res.ok) {
      const errorBody = await res.text().catch(() => '');
      throw new AiQaError(`Ollama returned error status ${res.status}: ${errorBody || res.statusText}`);
    }

    const data = (await res.json()) as { message?: { content?: string }; response?: string };
    const rawContent = data.message?.content || data.response || '';
    if (!rawContent.trim()) {
      throw new AiQaError('Ollama returned an empty response.');
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawContent);
    } catch (_err) {
      const match = rawContent.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          parsed = JSON.parse(match[0]);
        } catch (_nestedErr) {
          return { answer: rawContent.trim(), sources: [] };
        }
      } else {
        return { answer: rawContent.trim(), sources: [] };
      }
    }

    try {
      return QaResultSchema.parse(parsed);
    } catch (_zodErr) {
      if (typeof parsed === 'object' && parsed !== null) {
        const obj = parsed as Record<string, unknown>;
        const answer =
          typeof obj.answer === 'string' && obj.answer.trim()
            ? obj.answer.trim()
            : rawContent.trim();
        const sources = Array.isArray(obj.sources)
          ? obj.sources
              .map((s) => (typeof s === 'string' ? s.trim() : String(s).trim()))
              .filter(Boolean)
          : [];
        return { answer, sources };
      }
      return { answer: rawContent.trim(), sources: [] };
    }
  } catch (error) {
    if (error instanceof AiQaError) {
      throw error;
    }
    console.error('[AI Q&A Error]', error);
    throw new AiQaError(
      error instanceof Error ? error.message : 'An unexpected error occurred while generating the answer.'
    );
  }
}
