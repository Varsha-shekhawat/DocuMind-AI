export type DocumentStatus = 'Ready' | 'Processing' | 'Needs attention';

export type DocumentRecord = {
  id: string;
  name: string;
  pages: number;
  words: string;
  date: string;
  status: DocumentStatus;
  kind: string;
  description: string;
  summary: string;
  keyPoints: string[];
  mainIdeas: { title: string; body: string }[];
  suggestions: string[];
  accent: string;
};

export const mockDocuments: DocumentRecord[] = [
  {
    id: 'research-paper',
    name: 'Research Paper.pdf',
    pages: 14,
    words: '3,842',
    date: 'May 18, 2024',
    status: 'Ready',
    kind: 'PDF',
    description: 'This paper explores the impact of machine learning techniques on productivity across knowledge work.',
    summary: 'This paper explores the impact of machine learning techniques on productivity across knowledge work domains. The findings suggest a significant improvement in task automation and decision support, with implications for future workflows.',
    keyPoints: ['Machine learning can significantly enhance productive capacity.', 'Automation of routine tasks leads to better time allocation.', 'Decision support systems improve accuracy and confidence.', 'The integration of AI requires thoughtful workflow design.', 'Ethical considerations and data privacy are critical.'],
    mainIdeas: [
      { title: 'Productivity is contextual', body: 'The gains are strongest when systems support human judgment rather than replace it.' },
      { title: 'Adoption follows trust', body: 'Teams adopt new tools when the reasoning behind recommendations is visible and easy to question.' },
      { title: 'Design the handoff', body: 'The most resilient workflows make the exchange between people and models explicit.' },
    ],
    suggestions: ['Compare the methodology against a longitudinal study.', 'Look for evidence of productivity gains beyond self-reported measures.', 'Add a short section on accessibility and uneven access to these tools.'],
    accent: 'ochre',
  },
  {
    id: 'annual-report',
    name: 'Annual Report 2023.pdf',
    pages: 28,
    words: '6,125',
    date: 'May 15, 2024',
    status: 'Ready',
    kind: 'PDF',
    description: 'The annual report outlines the organization’s priorities, performance, and outlook for the coming year.',
    summary: 'A clear-eyed review of a year defined by focused growth, tighter operating rhythms, and a renewed investment in long-term capabilities.',
    keyPoints: ['Revenue grew across three core areas.', 'The team consolidated overlapping initiatives.', 'Customer retention remains the strongest leading indicator.'],
    mainIdeas: [{ title: 'Focus compounds', body: 'Fewer, better-supported initiatives created more dependable progress.' }],
    suggestions: ['Review the risk section alongside the forecast.', 'Pull the three-year trend into a separate briefing.'],
    accent: 'terracotta',
  },
  {
    id: 'project-proposal',
    name: 'Project Proposal.pdf',
    pages: 9,
    words: '2,100',
    date: 'May 12, 2024',
    status: 'Ready',
    kind: 'PDF',
    description: 'A concise proposal for a cross-functional research project and its measurement plan.',
    summary: 'A practical proposal with a narrow first phase, clear ownership, and a useful set of questions to answer before expansion.',
    keyPoints: ['The first phase is intentionally small.', 'Success is measured through observed behavior.', 'The proposal leaves room for a deliberate pause.'],
    mainIdeas: [{ title: 'Start with a question', body: 'The plan stays grounded by naming what would change the team’s mind.' }],
    suggestions: ['Clarify the decision rights for phase two.', 'Add a budget range to the appendix.'],
    accent: 'sage',
  },
  {
    id: 'market-research',
    name: 'Market Research.pdf',
    pages: 16,
    words: '4,890',
    date: 'May 8, 2024',
    status: 'Ready',
    kind: 'PDF',
    description: 'An analysis of market trends, customer language, and the conditions shaping the category.',
    summary: 'The market is moving from feature comparison toward confidence, proof, and fit. The strongest opportunity is with teams already carrying the cost of ambiguity.',
    keyPoints: ['Confidence is now a buying criterion.', 'Customers describe the problem in terms of time.', 'Proof points outperform broad promises.'],
    mainIdeas: [{ title: 'Language reveals demand', body: 'The phrases customers repeat are more directional than the features they request.' }],
    suggestions: ['Pair interview language with win-loss notes.', 'Test the positioning with operations leaders.'],
    accent: 'bluegreen',
  },
  {
    id: 'user-study',
    name: 'User Study Findings.pdf',
    pages: 12,
    words: '3,506',
    date: 'May 6, 2024',
    status: 'Ready',
    kind: 'PDF',
    description: 'Findings from the user study on how people search, read, and return to long-form material.',
    summary: 'Readers build confidence through small moments of orientation: knowing where they are, what matters, and what to do next.',
    keyPoints: ['Readers need orientation before interpretation.', 'Short annotations make return visits easier.', 'The best summaries preserve the shape of an argument.'],
    mainIdeas: [{ title: 'Reading is recursive', body: 'People move between the whole and the detail, refining their mental model as they go.' }],
    suggestions: ['Design a save-for-later behavior around unresolved questions.', 'Measure return visits to highlighted passages.'],
    accent: 'plum',
  },
];

let extraDocumentNumber = 1;

export function getDocument(id?: string) {
  return mockDocuments.find((document) => document.id === id) ?? mockDocuments[0];
}

export function createMockDocument(name: string): DocumentRecord {
  const cleanName = name || `Untitled report ${extraDocumentNumber}.pdf`;
  const document: DocumentRecord = {
    id: `uploaded-${Date.now()}`,
    name: cleanName.endsWith('.pdf') ? cleanName : `${cleanName}.pdf`,
    pages: 1,
    words: '—',
    date: 'Just now',
    status: 'Processing',
    kind: 'PDF',
    description: 'Your document is being read for structure, claims, and useful context.',
    summary: 'Your summary will appear here when the reading is complete.',
    keyPoints: [],
    mainIdeas: [],
    suggestions: [],
    accent: 'terracotta',
  };
  extraDocumentNumber += 1;
  mockDocuments.unshift(document);
  return document;
}
