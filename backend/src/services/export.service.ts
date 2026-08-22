import type { DocumentDocument } from '../models/document.model.js';

/**
 * Generates a clean, beautifully formatted Markdown document containing the
 * full analytical synthesis of an analyzed document.
 */
export function generateMarkdownExport(doc: DocumentDocument): string {
  const cleanTitle = doc.name.replace(/\.[^/.]+$/, '');
  const dateStr = doc.createdAt
    ? new Date(doc.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : new Date().toLocaleDateString('en-US');

  const shortSummary = doc.summary?.short?.trim() || '';
  const mediumSummary = doc.summary?.medium?.trim() || doc.description?.trim() || '';
  const longSummary = doc.summary?.long?.trim() || '';

  let md = `# ${cleanTitle}\n\n`;
  md += `> **UNFOLD Document Synthesis**  \n`;
  md += `> **Original File:** ${doc.originalFileName}  \n`;
  md += `> **Words Indexed:** ${doc.words ? doc.words.toLocaleString() : '—'} | **Pages:** ${doc.pages || 1}  \n`;
  md += `> **Date Analyzed:** ${dateStr}  \n\n`;
  md += `---\n\n`;

  // Summary Section
  md += `## 1. Summary\n\n`;
  if (shortSummary) {
    md += `### Executive Brief\n${shortSummary}\n\n`;
  }
  if (mediumSummary) {
    md += `### Overview\n${mediumSummary}\n\n`;
  }
  if (longSummary && longSummary !== mediumSummary) {
    md += `### Detailed Synthesis\n${longSummary}\n\n`;
  }

  // Key Takeaways Section
  if (doc.keyPoints && doc.keyPoints.length > 0) {
    md += `## 2. Key Takeaways\n\n`;
    doc.keyPoints.forEach((point, index) => {
      md += `${index + 1}. ${point.trim()}\n`;
    });
    md += `\n`;
  }

  // Main Ideas Section
  if (doc.mainIdeas && doc.mainIdeas.length > 0) {
    md += `## 3. Core Thematic Arguments\n\n`;
    doc.mainIdeas.forEach((idea, index) => {
      md += `### 0${index + 1}. ${idea.title.trim()}\n\n`;
      md += `${idea.body.trim()}\n\n`;
    });
  }

  // Actionable Insights Section
  if (doc.suggestions && doc.suggestions.length > 0) {
    md += `## 4. Actionable Insights & Next Inquiries\n\n`;
    doc.suggestions.forEach((suggestion) => {
      md += `- ${suggestion.trim()}\n`;
    });
    md += `\n`;
  }

  // Reader Notes Section
  if (doc.notes && doc.notes.length > 0) {
    md += `## 5. Reader Notes & Annotations\n\n`;
    doc.notes.forEach((note, index) => {
      const noteDate = note.createdAt
        ? new Date(note.createdAt).toLocaleDateString('en-US')
        : '';
      md += `### Note 0${index + 1}${noteDate ? ` (${noteDate})` : ''}\n\n`;
      if (note.excerpt) {
        md += `> *Excerpt:* "${note.excerpt.trim()}"\n\n`;
      }
      md += `${note.content.trim()}\n\n`;
    });
  }

  md += `---\n`;
  md += `*Generated with UNFOLD · A quieter way to understand.*  \n`;

  return md;
}
