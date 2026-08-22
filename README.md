# DocuMind AI

**DocuMind AI** (featuring the UNFOLD editorial reading interface) is an AI-powered document intelligence and reading assistant that enables users to upload complex documents, extract their textual content, generate multi-tier structured summaries, ask citation-grounded questions, take persistent notes, export insights, and securely share syntheses with colleagues and collaborators.

---

## Table of Contents

1. [Why DocuMind AI?](#why-documind-ai)
2. [Features](#features)
3. [Tech Stack](#tech-stack)
4. [Architecture](#architecture)
5. [Security & Data Privacy](#security--data-privacy)
6. [Project Structure](#project-structure)
7. [Environment Variables](#environment-variables)
8. [Local Development](#local-development)
9. [Verification](#verification)
10. [Future Improvements](#future-improvements)

---

## Why DocuMind AI?

Knowledge workers, researchers, analysts, and students routinely face long, dense documents—academic papers, legal briefs, technical specifications, and executive reports—where manually scanning pages to locate crucial arguments is time-consuming and cognitively demanding.

DocuMind AI streamlines this workflow through:
- **Automated Text Extraction**: Eliminating copy-paste friction across PDF, DOCX, and TXT files.
- **Multi-Level Summarization**: Offering dynamic short, medium, and long summaries tailored to the reader's current depth of inquiry.
- **Thematic Structuring**: Categorizing key takeaways, core thematic arguments, and actionable suggestions.
- **Document-Grounded Q&A**: Answering natural language queries using strictly the document's verified text, complete with quotation citations.
- **In-Context Annotations**: Allowing personal reflections and excerpts to be recorded alongside the analysis.
- **Seamless Portability**: Enabling one-click Markdown downloads, styled PDF/print exports, and secure, revocable web sharing.

---

## Features

- **Secure Authentication**: User registration and login protected by cryptographically hashed passwords (`bcryptjs`) and stateless session tokens stored in secure, `HttpOnly` JWT cookies.
- **Protected Document Library**: Private document workspace isolating each user's uploaded library with real-time status filtering and search.
- **Native Document Extraction & OCR**: Real text parsing for PDF (`pdf-parse`), DOCX (`mammoth`), plain text (`.txt`), and image files (`.png`, `.jpg`, `.jpeg`, `.webp`) via local Optical Character Recognition (`tesseract.js`).
- **Asynchronous Processing Pipeline**: Multi-stage processing lifecycle (`uploaded` &rarr; `extracting` &rarr; `analyzing` &rarr; `ready`) with live polling and visual progress indicators.
- **AI-Powered Structured Analysis**: High-fidelity document synthesis generated via local, open-source Ollama models (`qwen2.5:3b`) utilizing structured JSON schema output.
- **Multi-Tier Summary Variants**: Instant switching between **Short** (executive brief), **Medium** (core premise and findings), and **Long** (comprehensive synthesis) summaries.
- **Key Takeaways & Core Arguments**: Automatically extracted numbered bullet points and thematic arguments paired with conceptual titles and explanatory bodies.
- **Actionable Insights & Suggestions**: Practical next steps, inquiry questions, and implications surfaced from the text.
- **Document-Grounded AI Q&A**: Interactive dialogue companion that answers questions strictly using the document's contents, backed by exact quote citations.
- **Personal Notes & Annotations**: In-line reader notes with custom color coding (Ochre, Terracotta, Sage, Bluegreen, Plum) and referenced quotation excerpts.
- **Markdown & PDF Export**: Instant client-side Markdown file download and dedicated, beautifully styled print window for PDF export.
- **Secure Public Sharing**: Cryptographically secure 24-byte hex share tokens allowing read-only public sharing of synthesized documents without exposing private account data.
- **One-Click Share Revocation**: Immediate revocation capability disabling public access tokens.
- **Persistent User Preferences**: MongoDB-backed user settings (default summary length, email notification flags, display name) synchronized across sessions.
- **Failure Recovery & Retry**: Resilient error capturing marking failed documents as `Needs attention` with one-click retry resuming from the appropriate pipeline stage.

---

## Tech Stack

### Frontend
- **Framework**: [React 19](https://react.dev/) with [Vite](https://vite.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) with `@tailwindcss/typography`
- **UI Components**: [Radix UI](https://www.radix-ui.com/) primitives & [Lucide Icons](https://lucide.dev/)
- **State Management & Data Fetching**: [TanStack React Query v5](https://tanstack.com/query/latest)
- **Routing**: [Wouter](https://github.com/molefrog/wouter)
- **Validation**: [Zod](https://zod.dev/)

### Backend
- **Runtime**: [Node.js](https://nodejs.org/) (ES Modules)
- **Server Framework**: [Express 4](https://expressjs.com/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Database**: [MongoDB](https://www.mongodb.com/) (Native Node.js Driver `mongodb` v6)
- **AI Engine**: [Ollama](https://ollama.com/) (Local HTTP API, e.g. `qwen2.5:3b`)
- **Authentication**: [JSON Web Tokens](https://github.com/auth0/node-jsonwebtoken) (`jsonwebtoken`), [Bcrypt.js](https://github.com/dcodeIO/bcrypt.js)
- **File Ingestion**: [Multer](https://github.com/expressjs/multer)
- **Text Extraction & OCR**: [pdf-parse](https://www.npmjs.com/package/pdf-parse), [mammoth](https://www.npmjs.com/package/mammoth), [tesseract.js](https://github.com/naptha/tesseract.js)
- **Security & Utilities**: `cookie-parser`, `cors`, `dotenv`, `zod`

---

## Architecture

### High-Level System Flow

```
User (Browser)
    │
    ▼
React Frontend (Vite / TanStack Query)
    │  [HTTP / REST with HttpOnly Cookie Credentials]
    ▼
Express API Layer (Routes & Middleware)
    ├── Auth Middleware (JWT Cookie Validation)
    ├── Upload Middleware (Multer Memory/Disk Storage & MIME Validation)
    └── Error Handler (Standardized API Error Responses)
    │
    ├──► MongoDB Database (Users, Documents, Notes, Preferences)
    │
    └──► Local Ollama Model (Structured Analysis & Document Q&A)
```

### Document Processing Lifecycle

```
[User Upload] (PDF / DOCX / TXT / PNG / JPG)
      │
      ▼
[Server Validation] (Size <= 25MB, MIME & Extension Checked)
      │
      ▼
[Storage & Initial Record] (Status: "Processing", Stage: "uploaded")
      │
      ▼
[Text Extraction / OCR] (pdf-parse / mammoth / tesseract.js)
      ├── Error ──► Status: "Needs attention", Stage: "failed" (One-click retry available)
      └── Success ─► (Extracted text saved, Stage: "extracting" ──► "analyzing")
            │
            ▼
      [Ollama Local Analysis] (System Prompt + JSON Schema)
            ├── Error ──► Status: "Needs attention", Stage: "failed"
            └── Success ─► Status: "Ready", Stage: "ready"
                  │
                  ▼
            [Interactive Reading Room] (Summary Tabs, Notes, Q&A, Export, Sharing)
```

### Document-Grounded Q&A Flow

```
[User Inquiry]
      │
      ▼
[Ownership Verification] (Ensure document belongs to authenticated user)
      │
      ▼
[Context Retrieval] (Full text or keyword-ranked paragraphs for large texts)
      │
      ▼
[Ollama Execution] (System prompt guardrails + JSON output schema)
      │
      ▼
[Grounded Response] (Direct answer + verbatim cited excerpts)
      │
      ▼
[Client UI] (Rendered conversation with optional "Save as Note" action)
```

---

## Security & Data Privacy

DocuMind AI adheres to security and data protection best practices:

- **HttpOnly JWT Session Storage**: Tokens are stored strictly in `HttpOnly`, `SameSite`-configured cookies to mitigate cross-site scripting (XSS) token theft.
- **Strict Ownership Isolation**: Every document endpoint verifies `userId: new ObjectId(req.user.id)` ensuring users cannot view, edit, delete, or query other users' data.
- **MongoDB ObjectId Validation**: All incoming route parameters are verified with `ObjectId.isValid()` prior to database queries, preventing BSON casting errors and server crashes.
- **Zero Paid AI / API Dependencies**: All document analysis and Q&A run locally through Ollama (`qwen2.5:3b`); no cloud AI subscription or external API keys are required.
- **Sanitized Public Sharing DTO**: The public share endpoint (`/api/shared/:token`) executes via a cryptographically random token (`crypto.randomBytes(24)`), returning only sanitized synthesis data (`title`, `summary`, `keyPoints`, `mainIdeas`, `suggestions`) and strictly excluding raw text, personal notes, Q&A dialogues, user IDs, emails, and internal storage paths.
- **Instant Revocation**: Document owners can revoke share links at any time, immediately invalidating the public token.
- **HTML Sanitization in Exports**: Dynamic document strings rendered into the print window are escaped to prevent malformed rendering or script execution.
- **File Upload Safeguards**: Multi-factor upload validation verifies file extensions, MIME types, non-empty buffers, and enforces a strict 25 MB file size limit.

---

## Project Structure

```
DocuMind-AI/
├── .gitignore
├── components.json
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── public/
│   ├── favicon.svg
│   └── robots.txt
├── src/
│   ├── App.tsx                    # Top-level application routing & query provider
│   ├── main.tsx                   # React root entry point
│   ├── index.css                  # Design tokens, typography & paper aesthetics
│   ├── components/
│   │   ├── documind.tsx           # Primary UNFOLD UI components & workspaces
│   │   ├── error-boundary.tsx     # Client-side React error boundary
│   │   └── ui/                    # Reusable Radix UI & design system components
│   ├── hooks/
│   │   ├── use-mobile.tsx         # Mobile viewport detection hook
│   │   └── use-toast.ts           # Toast notification hook
│   ├── lib/
│   │   ├── api-client.ts          # Typed API client & error handling
│   │   ├── auth-context.tsx       # Global authentication state provider
│   │   ├── export-utils.ts        # Markdown & PDF/print export utilities
│   │   └── utils.ts               # Class merging utilities
│   └── pages/
│       └── not-found.tsx          # 404 error page matching UNFOLD aesthetic
└── backend/
    ├── package.json
    ├── tsconfig.json
    ├── .env.example
    └── src/
        ├── server.ts              # HTTP server startup & graceful shutdown
        ├── app.ts                 # Express application configuration & middleware
        ├── config/
        │   └── env.ts             # Environment variable schema & validation
        ├── db/
        │   └── connection.ts      # MongoDB connection pool manager
        ├── middleware/
        │   ├── auth.middleware.ts # HttpOnly JWT cookie authentication guard
        │   ├── errorHandler.ts    # Centralized JSON error response handler
        │   ├── logger.ts          # Development request logging
        │   └── upload.middleware.ts # Multer file upload & validation configuration
        ├── models/
        │   ├── document.model.ts  # Document TypeScript schemas & DTO transforms
        │   └── user.model.ts      # User TypeScript schemas & DTO transforms
        ├── routes/
        │   ├── index.ts           # API route aggregator mounted at /api
        │   ├── auth.routes.ts     # /api/auth (register, login, logout, me, settings)
        │   ├── document.routes.ts # /api/documents (CRUD, retry, notes, export, share, ask)
        │   ├── health.routes.ts   # /api/health (service health probe)
        │   ├── shared.routes.ts   # /api/shared (unauthenticated public document view)
        │   └── user.routes.ts     # /api/user (user preferences)
        ├── controllers/
        │   ├── auth.controller.ts
        │   ├── document.controller.ts
        │   ├── healthController.ts
        │   └── shared.controller.ts
        └── services/
            ├── ai-analysis.service.ts   # Ollama local structured synthesis
            ├── ai-qa.service.ts         # Ollama local document-grounded Q&A
            ├── auth.service.ts          # Password hashing, JWT signing, cookie helper
            ├── document.service.ts      # Document database queries & mutations
            ├── export.service.ts        # Server-side Markdown export builder
            ├── extraction.service.ts    # File parsing (PDF, DOCX, TXT) & OCR
            ├── extraction-runner.service.ts # Asynchronous pipeline orchestrator
            └── user.service.ts          # User persistence & preference management
```

---

## Environment Variables

Configure the following variables in `backend/.env` (refer to `backend/.env.example`):

| Variable | Requirement | Default | Description |
| :--- | :--- | :--- | :--- |
| `PORT` | Optional | `5000` | Port for the Express backend server |
| `NODE_ENV` | Optional | `development` | Runtime environment (`development` \| `production`) |
| `CLIENT_URL` | **Required** | `http://localhost:5173` | Frontend origin URL for CORS policy |
| `MONGODB_URI` | **Required** | — | MongoDB Atlas / database connection URI |
| `MONGODB_DB_NAME` | Optional | `UNFOLD` | Target database name within MongoDB |
| `JWT_SECRET` | **Required** in Prod | *(dev fallback)* | Secret key used to sign and verify JWT tokens |
| `JWT_EXPIRES_IN` | Optional | `7d` | JWT session token lifespan |
| `COOKIE_SAMESITE` | Optional | `lax` (dev) / `none` (prod) | Cookie `SameSite` attribute (`lax` \| `none` \| `strict`) |
| `COOKIE_SECURE` | Optional | `false` (dev) / `true` (prod) | Require HTTPS for session cookie transmission |
| `OLLAMA_BASE_URL` | Optional | `http://localhost:11434` | Local Ollama HTTP server URL |
| `OLLAMA_MODEL` | Optional | `qwen2.5:3b` | Local Ollama model identifier |

---

## Local Development

### Prerequisites
- **Node.js**: v18.0.0 or later
- **npm**: v9.0.0 or later
- **MongoDB**: Local MongoDB instance or free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster
- **Ollama**: Free, local AI runtime ([Download Ollama](https://ollama.com/)) with model `qwen2.5:3b` (`ollama pull qwen2.5:3b`)

### 1. Clone the Repository
```bash
git clone https://github.com/Varsha-shekhawat/DocuMind-AI.git
cd DocuMind-AI
```

### 2. Configure Backend Environment
```bash
cd backend
cp .env.example .env
```
Supply your `MONGODB_URI` in `backend/.env`. (Default local Ollama URL `http://localhost:11434` and model `qwen2.5:3b` are preconfigured).

### 3. Install Dependencies & Start Backend
```bash
# From within backend/ directory
npm install
npm run dev
```
*The backend API will start at `http://localhost:5000`.*

### 4. Install Dependencies & Start Frontend
```bash
# Open a new terminal in the project root directory
npm install
npm run dev
```
*The frontend application will start at `http://localhost:5173`.*

---

## Verification

The codebase includes strict TypeScript type checking and production build configurations across both client and server:

### Frontend Verification
```bash
# Run from repository root
npm run typecheck    # Verifies TypeScript types with zero errors
npm run build        # Generates production bundle via Vite
```

### Backend Verification
```bash
# Run from backend/ directory
npm run typecheck    # Verifies backend TypeScript types with zero errors
npm run build        # Compiles backend TypeScript to dist/
```

> **Note on End-to-End Testing**: Full live document processing, local Ollama AI synthesis, and Q&A interactions require active MongoDB and local Ollama (`ollama serve`) running on your machine.

---

## Future Improvements

- **Streaming Responses**: Token-by-token streaming for conversational AI Q&A interactions.
- **Direct Citation Highlights**: Interactive UI links that highlight the corresponding paragraph within the document preview when clicking citation excerpts.
- **Cross-Document Synthesis**: Ability to select multiple documents and generate thematic comparative analyses.
- **Automated Integration Test Suite**: End-to-end integration tests using tools like Playwright or Vitest.

---

## License

This project is developed for educational and portfolio demonstration purposes. All rights reserved.
