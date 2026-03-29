import fs from 'node:fs/promises';

const DEFAULTS = Object.freeze({
  inputJson: '/Users/ahmedelmorshedy/Genovy/output/shadow-stxbp1-discriminating-case-20260325.json',
  outputJson: '/Users/ahmedelmorshedy/Genovy/output/shadow-stxbp1-support-handoff-override-20260325.json',
  outputMd: '/Users/ahmedelmorshedy/Genovy/output/shadow-stxbp1-support-handoff-override-20260325.md',
  overrideWeightFloor: 0.9,
  comparisonWeights: [0.68, 0.8, 0.85, 0.9, 1.0]
});

function parseArgs(argv) {
  const flags = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      flags[key] = true;
      continue;
    }
    flags[key] = next;
    index += 1;
  }
  return flags;
}

function parseList(value, fallback) {
  if (!value) return fallback;
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map(Number)
    .filter((item) => Number.isFinite(item));
}

function roundScore(value) {
  return Number((value || 0).toFixed(6));
}

function buildScenario({
  label,
  supportWeight,
  diseaseScore,
  supportEvidenceWeight,
  baselineDirectGeneScore,
  baselineGeneScore
}) {
  const shadowDerivedDiseaseSupportScore = roundScore(diseaseScore * supportWeight * supportEvidenceWeight);
  const inferredShadowGeneScore = roundScore(Math.max(baselineDirectGeneScore, shadowDerivedDiseaseSupportScore));
  return {
    label,
    supportWeight,
    shadowDerivedDiseaseSupportScore,
    inferredShadowGeneScore,
    beatsBaselineDirectGeneScore: shadowDerivedDiseaseSupportScore > baselineDirectGeneScore,
    changesFinalGeneScore: inferredShadowGeneScore !== baselineGeneScore,
    inferredGeneScoreDelta: roundScore(inferredShadowGeneScore - baselineGeneScore)
  };
}

function buildMarkdownReport(report) {
  const lines = [];
  lines.push('# STXBP1 Support-Handoff Override Shadow');
  lines.push('');
  lines.push(`- Source artifact: \`${report.sourceArtifact}\``);
  lines.push(`- Truth gene: \`${report.truthGene}\``);
  lines.push(
    `- Target disease: \`${report.targetDisease.disease_label}\` (\`${report.targetDisease.disease_curie}\`)`
  );
  lines.push('');
  lines.push('## Baseline');
  lines.push('');
  lines.push(`- Baseline gene score: \`${report.baseline.baselineGeneScore}\``);
  lines.push(`- Baseline direct gene score: \`${report.baseline.baselineDirectGeneScore}\``);
  lines.push(`- Enriched disease score: \`${report.baseline.shadowDiseaseScore}\``);
  lines.push(`- Disease support evidence weight: \`${report.baseline.supportEvidenceWeight}\``);
  lines.push(`- Current support weight: \`${report.baseline.currentSupportWeight}\``);
  lines.push(`- Current handoff score: \`${report.baseline.currentShadowDerivedDiseaseSupportScore}\``);
  lines.push('');
  lines.push('## Threshold');
  lines.push('');
  lines.push(
    `- Minimum support weight to beat the current direct STXBP1 gene score: \`${report.threshold.minOverrideWeightToBeatDirectGeneScore}\``
  );
  lines.push('');
  lines.push('## Scenarios');
  lines.push('');
  for (const scenario of report.scenarios) {
    lines.push(
      `- ${scenario.label}: weight \`${scenario.supportWeight}\`, handoff \`${scenario.shadowDerivedDiseaseSupportScore}\`, gene \`${scenario.inferredShadowGeneScore}\`, changes final gene score: \`${scenario.changesFinalGeneScore}\``
    );
  }
  lines.push('');
  lines.push('## Conclusion');
  lines.push('');
  lines.push(`- Current rule changes gene score: \`${report.conclusion.currentRuleChangesGeneScore}\``);
  lines.push(`- Floor override (${report.overridePolicy.weightFloor}) changes gene score: \`${report.conclusion.floorOverrideWorks}\``);
  lines.push(`- Interpretation: ${report.conclusion.interpretation}`);
  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  const config = {
    inputJson: flags['input-json'] || DEFAULTS.inputJson,
    outputJson: flags['output-json'] || DEFAULTS.outputJson,
    outputMd: flags['output-md'] || DEFAULTS.outputMd,
    overrideWeightFloor: Number(flags['override-weight-floor'] || DEFAULTS.overrideWeightFloor),
    comparisonWeights: parseList(flags['comparison-weights'], DEFAULTS.comparisonWeights)
  };

  const report = JSON.parse(await fs.readFile(config.inputJson, 'utf8'));
  const baselineGeneScore = report.baselineTruthFromLiveAudit?.normalizedScore ?? null;
  const baselineDirectGeneScore = report.baselineTruthFromLiveAudit?.directNormalizedScore ?? null;
  const diseaseScore = report.shadowTargetDisease?.normalizedScore ?? null;
  const supportEvidenceWeight = report.shadowTargetDisease?.supportEvidenceWeight ?? null;
  const currentSupportWeight = report.inferredShadow?.assumedTruthSupportWeight ?? null;

  if ([baselineGeneScore, baselineDirectGeneScore, diseaseScore, supportEvidenceWeight, currentSupportWeight].some((value) => value == null)) {
    throw new Error('Missing required baseline fields in the source shadow artifact.');
  }

  const thresholdWeight = roundScore(baselineDirectGeneScore / (diseaseScore * supportEvidenceWeight));
  const comparisonWeights = [...new Set([...config.comparisonWeights, thresholdWeight])].sort((left, right) => left - right);

  const scenarios = comparisonWeights.map((supportWeight) =>
    buildScenario({
      label: supportWeight === thresholdWeight ? 'exact threshold' : `support weight ${supportWeight}`,
      supportWeight,
      diseaseScore,
      supportEvidenceWeight,
      baselineDirectGeneScore,
      baselineGeneScore
    })
  );

  const floorOverrideWeight = Math.max(currentSupportWeight, config.overrideWeightFloor);
  const floorOverrideScenario = buildScenario({
    label: `floor override ${floorOverrideWeight}`,
    supportWeight: floorOverrideWeight,
    diseaseScore,
    supportEvidenceWeight,
    baselineDirectGeneScore,
    baselineGeneScore
  });

  const output = {
    createdAt: new Date().toISOString(),
    sourceArtifact: config.inputJson,
    caseId: report.caseId,
    truthGene: report.truthGene,
    targetDisease: report.targetDisease,
    targetTermsRequested: report.targetTermsRequested,
    addedShadowTerms: report.addedShadowTerms,
    baseline: {
      baselineGeneScore,
      baselineDirectGeneScore,
      shadowDiseaseScore: diseaseScore,
      supportEvidenceWeight,
      currentSupportWeight,
      currentShadowDerivedDiseaseSupportScore: report.inferredShadow?.shadowDerivedDiseaseSupportScore ?? null,
      currentInferredShadowGeneScore: report.inferredShadow?.inferredShadowGeneScore ?? null
    },
    threshold: {
      minOverrideWeightToBeatDirectGeneScore: thresholdWeight
    },
    overridePolicy: {
      description:
        'If a specific direct disease has exact direct overlaps after enrichment, raise its disease-to-gene handoff weight to at least the configured floor.',
      weightFloor: floorOverrideWeight
    },
    scenarios,
    floorOverrideScenario,
    conclusion: {
      currentRuleChangesGeneScore: report.inferredShadow?.wouldChangeGeneScore ?? null,
      floorOverrideWorks: floorOverrideScenario.changesFinalGeneScore,
      interpretation: floorOverrideScenario.changesFinalGeneScore
        ? 'The enriched specific disease is already strong enough; the current handoff weight is what suppresses it below the existing direct STXBP1 gene score.'
        : 'Even with the override floor, the enriched specific disease still does not beat the current direct STXBP1 gene score.'
    }
  };

  await fs.writeFile(config.outputJson, `${JSON.stringify(output, null, 2)}\n`);
  await fs.writeFile(config.outputMd, buildMarkdownReport(output));
  console.log(JSON.stringify(output, null, 2));
}

main().catch((error) => {
  console.error('[shadow-stxbp1-support-handoff-override] failed:', error);
  process.exit(1);
});
