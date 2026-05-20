/**
 * Deterministic mock provider for tests and dry runs.
 *
 * Behavior:
 *   - If the user passes an `atomsByLane` table, the mock returns a copy of
 *     atomsByLane[laneId] verbatim. This is how tests drive the orchestrator
 *     with a known fixture.
 *   - Otherwise, the mock returns a single trivially-grounded atom whose
 *     verbatim_quote is the first ~40 characters of the slice. This is
 *     enough for the validator/grounding pipeline to exercise its real code
 *     paths without an LLM.
 */

export function createMockProvider({ atomsByLane = null } = {}) {
  return {
    name: 'mock',
    model: 'mock-1',
    async complete({ laneId, sliceText, allowedKinds, chapterId, sectionPath, retrievedAt }) {
      if (atomsByLane && Object.prototype.hasOwnProperty.call(atomsByLane, laneId)) {
        return { atoms: cloneAtoms(atomsByLane[laneId]) };
      }
      if (laneId === 'unassigned') {
        return { triage: [] };
      }
      const trimmed = sliceText.trim();
      if (trimmed.length < 8 || allowedKinds.length === 0) {
        return { atoms: [] };
      }
      const quote = trimmed.slice(0, Math.min(40, trimmed.length));
      const start = sliceText.indexOf(quote);
      const atom = {
        atom_id: `${chapterId.toLowerCase()}-${laneId}-001`,
        kind: allowedKinds[0],
        subject: { kind: 'disease', curie: null, label: 'Mock disease', synonyms: [], xrefs: [] },
        predicate: defaultPredicateFor(allowedKinds[0]),
        object: { kind: defaultObjectKindFor(allowedKinds[0]), curie: null, label: 'Mock object', synonyms: [], xrefs: [] },
        qualifiers: {
          presence_status: 'present',
          frequency_tier: 'not_stated',
          frequency_text: null,
          onset_class: 'not_stated',
          onset_curie: null,
          severity: 'not_stated',
          laterality: 'not_stated',
          progression: 'not_stated',
          modifier: null,
          sex: 'not_stated',
          aspect: 'not_stated',
          n_referenced: null
        },
        grounded_sentence: 'Mock disease has mock object (mock provider, test fixture).',
        verbatim_quote: quote,
        evidence: { strength: 'not_stated', n_cases_referenced: null, cited_pmids: [] },
        provenance: {
          chapter_id: chapterId,
          chapter_title: 'Mock chapter',
          chapter_version: null,
          section_lane: laneId,
          section_path: sectionPath,
          char_span: { start, end: start + quote.length },
          retrieved_at: retrievedAt,
          agent_id: `${laneId}.v1`,
          model_id: 'mock-1',
          retrieval_url: null
        },
        qc: { grounded: false, needs_mapping: true, review_required: false, review_reasons: [] }
      };
      return { atoms: [atom] };
    }
  };
}

function cloneAtoms(atoms) {
  return atoms.map((atom) => JSON.parse(JSON.stringify(atom)));
}

function defaultPredicateFor(kind) {
  switch (kind) {
    case 'phenotype': return 'has_phenotype';
    case 'penetrance': return 'has_penetrance';
    case 'prevalence': return 'has_prevalence';
    case 'synonym': return 'has_synonym';
    case 'nomenclature': return 'has_nomenclature_note';
    case 'mode_of_inheritance': return 'has_mode_of_inheritance';
    case 'recurrence_risk': return 'has_recurrence_risk';
    case 'reproductive_option': return 'has_reproductive_option';
    case 'suggestive_finding': return 'is_suggestive_finding_of';
    case 'diagnostic_criterion': return 'is_diagnostic_criterion_of';
    case 'testing_strategy': return 'is_tested_by';
    case 'differential_diagnosis': return 'differential_diagnosis_with';
    case 'related_disorder': return 'allelic_with';
    case 'evaluation_at_diagnosis': return 'evaluation_recommended_at_diagnosis';
    case 'treatment': return 'treated_with';
    case 'supportive_care': return 'supportive_care_with';
    case 'surveillance': return 'monitored_by';
    case 'contraindication': return 'contraindicated_with';
    case 'investigational_therapy': return 'under_investigation_with';
    case 'mechanism': return 'has_mechanism';
    case 'variant_class': return 'has_variant_class';
    case 'pathway': return 'participates_in_pathway';
    case 'genotype_phenotype': return 'has_genotype_phenotype_correlation';
    case 'identity': return 'has_identity';
    default: return 'has_identity';
  }
}

function defaultObjectKindFor(kind) {
  switch (kind) {
    case 'phenotype': return 'phenotype';
    case 'treatment':
    case 'contraindication':
    case 'investigational_therapy':
      return 'drug';
    case 'surveillance':
    case 'evaluation_at_diagnosis':
      return 'procedure';
    case 'pathway': return 'pathway';
    case 'mode_of_inheritance': return 'inheritance_pattern';
    default: return 'concept';
  }
}
