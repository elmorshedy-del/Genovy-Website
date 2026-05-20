/**
 * Agent registry — maps each section lane to its prompt file and agent_id.
 *
 * The id pattern is `<lane>.v1`. Bumping a prompt's version means a new
 * agent_id so old extractions can be replayed without confusion.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SECTION_LANES, getLaneById } from '../sections.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROMPT_DIR = path.resolve(__dirname, '..', '..', 'prompts');

const AGENT_VERSION = Object.freeze({
  header: 1,
  clinical_description: 1,
  penetrance_prevalence: 1,
  genotype_phenotype: 1,
  diagnosis: 1,
  differential_related: 1,
  management_treatment: 1,
  surveillance: 1,
  contraindications: 1,
  therapies_investigation: 1,
  molecular_pathogenesis: 1,
  genetic_counseling: 1,
  unassigned: 1
});

const PROMPT_FILE = Object.freeze({
  header: 'header.md',
  clinical_description: 'clinical_description.md',
  penetrance_prevalence: 'penetrance_prevalence.md',
  genotype_phenotype: 'genotype_phenotype.md',
  diagnosis: 'diagnosis.md',
  differential_related: 'differential_related.md',
  management_treatment: 'management_treatment.md',
  surveillance: 'surveillance.md',
  contraindications: 'contraindications.md',
  therapies_investigation: 'therapies_investigation.md',
  molecular_pathogenesis: 'molecular_pathogenesis.md',
  genetic_counseling: 'genetic_counseling.md',
  unassigned: 'unassigned_triage.md'
});

const cache = new Map();

async function readPrompt(file) {
  if (cache.has(file)) return cache.get(file);
  const text = await fs.readFile(path.join(PROMPT_DIR, file), 'utf8');
  cache.set(file, text);
  return text;
}

export async function loadAgent(laneId) {
  const lane = getLaneById(laneId);
  if (!lane) throw new Error(`Unknown lane ${laneId}`);
  const version = AGENT_VERSION[laneId] || 1;
  const promptFile = PROMPT_FILE[laneId];
  if (!promptFile) throw new Error(`No prompt file registered for lane ${laneId}`);
  const [systemBase, lanePrompt] = await Promise.all([
    readPrompt('system.base.md'),
    readPrompt(promptFile)
  ]);
  return {
    agentId: `${laneId}.v${version}`,
    laneId,
    laneTitle: lane.title,
    allowedKinds: lane.emits.slice(),
    systemPrompt: systemBase,
    lanePrompt,
    isTriage: laneId === 'unassigned'
  };
}

export function listAgentLanes() {
  return SECTION_LANES.map((lane) => lane.id);
}
