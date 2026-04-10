# Genovy Website Project Log

Last updated: 2026-04-10

## Purpose
This file preserves the website-specific implementation thread for the public Genovy site so copy, routing, paper-page work, and deployment-facing changes are not lost across sessions.

## 2026-04-09
- Corrected the repo target after the earlier push went to `/Users/ahmedelmorshedy/Genovy` instead of `/Users/ahmedelmorshedy/Genovy-Website`.
- Updated the landing page closing section in `website/src/App.jsx` to use more professional collaboration-oriented copy.
- Replaced footer placeholder links with real links for the paper page and GitHub repository.
- Added a dedicated paper page in `website/src/PaperPage.jsx`.
- Added path-based entry routing in `website/src/main.jsx` so Railway SPA serving can render `/paper` correctly under `serve dist -s`.
- Centralized external links and page metadata in `website/src/siteConfig.js` so future copy/link changes do not require hunting through multiple components.
- Tightened the closing section again to explicitly signal clinical partnerships, research collaboration, and aligned funding without dropping the institutional tone.
- Reframed the paper from a simple high-level overview into a mixed scientific/product working paper with explicit graph architecture, methodology, benchmark table, pharma/research applications, limitations, and planned ML direction.

## 2026-04-10
- Updated the paper page benchmark text and table in `website/src/PaperPage.jsx` from the older `84%` handoff-floor scorer slice to the locked headline benchmark reference: `92%` found, `42%` Top-1, `53%` Top-3, `57%` Top-5, `65%` Top-10, median rank `2`, and MRR `0.503832`.
- Used `/Users/ahmedelmorshedy/Genovy-phenotype-enrichment-20260316-0914/docs/benchmark-source-of-truth-20260409.md` as the benchmark source of truth.
