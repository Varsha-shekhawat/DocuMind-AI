# UNFOLD design decisions

## Why an editorial interface

UNFOLD is about helping people move from paper to understanding. The interface therefore borrows from the visual language of a reading room: paper surfaces, quiet borders, document annotations, and an editorial serif for moments that deserve attention. A document should feel like something the user can sit with, not just another item in an admin table.

The landing experience uses a layered document composition instead of abstract product imagery. The archive is presented as a library of knowledge, and analysis results are arranged as a workspace for reading, comparing, and returning to ideas.

## Why blue and purple were avoided

Blue and purple are common defaults for AI products, and they tend to make the product feel technical, interchangeable, or overly futuristic. UNFOLD is intentionally warmer and more human: parchment, paper white, deep ink, forest green, terracotta, ochre, and sage create a calm visual vocabulary that supports concentration without feeling clinical.

## Frontend-only milestone

This first milestone keeps authentication, uploads, processing, and analysis on local mock data. The component boundaries and route structure are intentionally ready for later API, OCR, AI, and MongoDB work without pretending those capabilities exist yet.