import type { ApiDocument, PublicSharedDocument } from './api-client';
import type { DocumentRecord } from '@/data/mock-data';

export type ExportableDocument = ApiDocument | DocumentRecord | PublicSharedDocument;

/**
 * Builds the Markdown representation of an analyzed document synthesis.
 */
export function generateMarkdown(doc: ExportableDocument): string {
  const cleanTitle =
    'title' in doc && doc.title
      ? doc.title
      : 'name' in doc
      ? doc.name.replace(/\.[^/.]+$/, '')
      : 'Document';

  const dateStr =
    'date' in doc && doc.date
      ? doc.date
      : 'createdAt' in doc && doc.createdAt
      ? new Date(doc.createdAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : new Date().toLocaleDateString('en-US');

  const variants = 'summaryVariants' in doc ? doc.summaryVariants : undefined;
  const shortSummary = variants?.short?.trim() || '';
  const mediumSummary = variants?.medium?.trim() || doc.summary?.trim() || ('description' in doc ? doc.description?.trim() : '') || '';
  const longSummary = variants?.long?.trim() || '';

  let md = `# ${cleanTitle}\n\n`;
  md += `> **UNFOLD Document Synthesis**  \n`;
  md += `> **Words Indexed:** ${doc.words || '—'} | **Pages:** ${doc.pages || 1}  \n`;
  md += `> **Date:** ${dateStr}  \n\n`;
  md += `---\n\n`;

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

  if (doc.keyPoints && doc.keyPoints.length > 0) {
    md += `## 2. Key Takeaways\n\n`;
    doc.keyPoints.forEach((pt, i) => {
      md += `${i + 1}. ${pt.trim()}\n`;
    });
    md += `\n`;
  }

  if (doc.mainIdeas && doc.mainIdeas.length > 0) {
    md += `## 3. Core Thematic Arguments\n\n`;
    doc.mainIdeas.forEach((idea, i) => {
      md += `### 0${i + 1}. ${idea.title.trim()}\n\n`;
      md += `${idea.body.trim()}\n\n`;
    });
  }

  if (doc.suggestions && doc.suggestions.length > 0) {
    md += `## 4. Actionable Insights & Next Inquiries\n\n`;
    doc.suggestions.forEach((sug) => {
      md += `- ${sug.trim()}\n`;
    });
    md += `\n`;
  }

  const notes = 'notes' in doc ? doc.notes : undefined;
  if (notes && notes.length > 0) {
    md += `## 5. Reader Notes & Annotations\n\n`;
    notes.forEach((note, i) => {
      const noteDate = note.createdAt
        ? new Date(note.createdAt).toLocaleDateString('en-US')
        : '';
      md += `### Note 0${i + 1}${noteDate ? ` (${noteDate})` : ''}\n\n`;
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

/**
 * Initiates an immediate client-side download of the document synthesis as a Markdown file.
 */
export function exportToMarkdown(doc: ExportableDocument): void {
  const markdown = generateMarkdown(doc);
  const rawName = 'title' in doc && doc.title ? doc.title : 'name' in doc ? doc.name : 'document';
  const cleanFileName = rawName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${cleanFileName}-unfold-summary.md`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Opens a dedicated, styled print window formatted specifically for clean PDF export.
 */
export function exportToPdf(doc: ExportableDocument): void {
  const rawTitle =
    'title' in doc && doc.title
      ? doc.title
      : 'name' in doc
      ? doc.name.replace(/\.[^/.]+$/, '')
      : 'Document';

  const cleanTitle = escapeHtml(rawTitle);

  const rawDateStr =
    'date' in doc && doc.date
      ? doc.date
      : 'createdAt' in doc && doc.createdAt
      ? new Date(doc.createdAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : new Date().toLocaleDateString('en-US');

  const dateStr = escapeHtml(rawDateStr);

  const variants = 'summaryVariants' in doc ? doc.summaryVariants : undefined;
  const shortSummary = escapeHtml(variants?.short?.trim() || '');
  const mediumSummary = escapeHtml(
    variants?.medium?.trim() ||
      doc.summary?.trim() ||
      ('description' in doc ? doc.description?.trim() : '') ||
      ''
  );
  const longSummary = escapeHtml(variants?.long?.trim() || '');
  const notes = 'notes' in doc ? doc.notes : undefined;

  const printWindow = window.open('', '_blank', 'width=850,height=1000');
  if (!printWindow) {
    // If popup blocked, fallback to standard window.print()
    window.print();
    return;
  }

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${cleanTitle} — UNFOLD Document Synthesis</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,600;1,6..72,400&family=JetBrains+Mono:wght@400;500&family=Inter:wght@400;500;600&display=swap');

    @page {
      size: A4;
      margin: 20mm;
    }

    * {
      box-sizing: border-box;
    }

    body {
      font-family: 'Newsreader', Georgia, serif;
      color: #1a1e1b;
      background-color: #faf6ee;
      margin: 0;
      padding: 30px;
      line-height: 1.6;
      font-size: 15px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .header-badge {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #293d2c;
      padding-bottom: 12px;
      margin-bottom: 24px;
    }

    .brand-mark {
      font-family: 'Inter', sans-serif;
      font-weight: 700;
      font-size: 14px;
      letter-spacing: 0.1em;
      color: #293d2c;
      text-transform: uppercase;
    }

    .doc-meta {
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    h1 {
      font-size: 28px;
      font-weight: 600;
      line-height: 1.15;
      margin: 0 0 10px 0;
      color: #1a1e1b;
    }

    .meta-bar {
      display: flex;
      gap: 20px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: #b75d3f;
      margin-bottom: 24px;
      padding-bottom: 12px;
      border-bottom: 1px solid #e0d7c3;
    }

    h2 {
      font-size: 18px;
      font-weight: 600;
      color: #293d2c;
      margin-top: 24px;
      margin-bottom: 10px;
      border-bottom: 1px solid #d4c8af;
      padding-bottom: 4px;
    }

    h3 {
      font-size: 15px;
      font-weight: 600;
      color: #1a1e1b;
      margin-top: 16px;
      margin-bottom: 6px;
    }

    p {
      margin: 0 0 12px 0;
      color: #2c322d;
    }

    .brief-box {
      background: #f0e6d2;
      border-left: 3px solid #b75d3f;
      padding: 12px 16px;
      margin: 12px 0;
      font-style: italic;
    }

    ol, ul {
      margin: 8px 0 16px 20px;
      padding: 0;
    }

    li {
      margin-bottom: 8px;
    }

    .idea-card {
      border-left: 3px solid #d7b25c;
      padding-left: 14px;
      margin-bottom: 16px;
    }

    .footer {
      margin-top: 40px;
      padding-top: 16px;
      border-top: 1px solid #d4c8af;
      display: flex;
      justify-content: space-between;
      font-family: 'JetBrains Mono', monospace;
      font-size: 9px;
      color: #888;
      text-transform: uppercase;
    }
  </style>
</head>
<body>
  <div class="header-badge">
    <span class="brand-mark">UNFOLD · Reading Room</span>
    <span class="doc-meta">${dateStr}</span>
  </div>

  <h1>${cleanTitle}</h1>
  <div class="meta-bar">
    <span>${doc.pages || 1} Pages</span>
    <span>·</span>
    <span>${escapeHtml(String(doc.words || '—'))} Words</span>
    <span>·</span>
    <span>Status: ${escapeHtml(doc.status)}</span>
  </div>

  <h2>1. Executive Summary</h2>
  ${shortSummary ? `<div class="brief-box">${shortSummary}</div>` : ''}
  ${mediumSummary ? `<p>${mediumSummary}</p>` : ''}
  ${longSummary && longSummary !== mediumSummary ? `<p>${longSummary}</p>` : ''}

  ${
    doc.keyPoints && doc.keyPoints.length > 0
      ? `
  <h2>2. Key Takeaways</h2>
  <ol>
    ${doc.keyPoints.map((pt) => `<li>${escapeHtml(pt)}</li>`).join('')}
  </ol>
  `
      : ''
  }

  ${
    doc.mainIdeas && doc.mainIdeas.length > 0
      ? `
  <h2>3. Core Thematic Arguments</h2>
  ${doc.mainIdeas
    .map(
      (idea, i) => `
    <div class="idea-card">
      <h3 style="color:#b75d3f;">0${i + 1}. ${escapeHtml(idea.title)}</h3>
      <p>${escapeHtml(idea.body)}</p>
    </div>
  `
    )
    .join('')}
  `
      : ''
  }

  ${
    doc.suggestions && doc.suggestions.length > 0
      ? `
  <h2>4. Actionable Insights & Next Inquiries</h2>
  <ul>
    ${doc.suggestions.map((sug) => `<li>${escapeHtml(sug)}</li>`).join('')}
  </ul>
  `
      : ''
  }

  ${
    notes && notes.length > 0
      ? `
  <h2>5. Reader Notes & Annotations</h2>
  ${notes
    .map(
      (note, i) => `
    <div class="idea-card" style="border-left-color: ${
      note.color === 'terracotta'
        ? '#b75d3f'
        : note.color === 'sage'
        ? '#6b826d'
        : note.color === 'bluegreen'
        ? '#3b7a74'
        : note.color === 'plum'
        ? '#7a3b5c'
        : '#d7b25c'
    };">
      <h3 style="color:#293d2c;">Note 0${i + 1} ${
        note.createdAt
          ? `<span style="font-size:10px;font-weight:normal;color:#777;">— ${escapeHtml(
              new Date(note.createdAt).toLocaleDateString('en-US')
            )}</span>`
          : ''
      }</h3>
      ${
        note.excerpt
          ? `<div class="brief-box" style="margin:6px 0;padding:8px 12px;font-size:13px;">"${escapeHtml(
              note.excerpt
            )}"</div>`
          : ''
      }
      <p style="margin-top:6px;">${escapeHtml(note.content)}</p>
    </div>
  `
    )
    .join('')}
  `
      : ''
  }

  <div class="footer">
    <span>UNFOLD Synthesis</span>
    <span>A quieter way to understand.</span>
  </div>

  <script>
    window.onload = function() {
      window.print();
    };
  </script>
</body>
</html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

