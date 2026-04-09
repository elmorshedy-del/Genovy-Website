# Genovy Website Project Log

Last updated: 2026-04-09

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
