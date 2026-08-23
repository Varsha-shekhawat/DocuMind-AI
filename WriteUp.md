Approach

UNFOLD tackles document overload by turning dense files into structured, navigable insight. The core challenge was designing a pipeline that could handle heterogeneous inputs (PDF, DOCX, TXT, images) reliably, without blocking the user while processing happens.

I addressed this with an asynchronous, stage-based pipeline (uploaded → extracting → analyzing → ready), decoupling ingestion from analysis. Text-based formats use native parsers (pdf-parse, mammoth), while image formats route through local OCR (tesseract.js), keeping extraction logic isolated in a dedicated service layer. Each document polls its own status, so failures at any stage surface as "Needs attention" with one-click retry, rather than crashing the whole flow.

For analysis, I used Google Gemini with structured JSON schema output to guarantee consistent summary tiers (short/medium/long), key takeaways, and arguments — avoiding fragile free-text parsing. Q&A was built to be strictly document-grounded: responses cite verbatim excerpts from the source text, reducing hallucination risk.

Security was treated as a first-class concern from the start: HttpOnly JWT cookies, per-request ownership checks on every document endpoint, and sanitized public-share tokens that expose only synthesis data — never raw text or account details.

The result balances practical resilience with a clean, focused reading experience.