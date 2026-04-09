import { ArrowLeft, FileText, GitFork, Mail } from 'lucide-react'
import { SITE_LINKS } from './siteConfig.js'

const PAPER_TITLE =
  'Genovy: a graph-based rare-disease intelligence platform for diagnosis, case structuring, and translational discovery'

const PAPER_SUBTITLE =
  'This working paper describes the current Genovy knowledge graph, the phenotype-driven ranking methodology already in use, the benchmark evidence behind the system, and the product and learning layers planned for the next stage.'

const GRAPH_FACTS = [
  { value: '12,132', label: 'Diseases indexed' },
  { value: '5,705', label: 'Genes covered' },
  { value: '16,000+', label: 'HPO terms' },
  { value: '7', label: 'Authoritative source families' },
]

const DATA_SOURCES = [
  'MONDO',
  'HPO',
  'OMIM',
  'ClinGen',
  'ClinVar',
  'Orphadata',
  'ClinicalTrials.gov',
]

const BENCHMARK_HEADERS = ['Metric', 'Genovy', 'Exomiser']

const BENCHMARK_ROWS = [
  ['Found', '84%', '100%'],
  ['Top-1', '42%', '39%'],
  ['Top-3', '52%', '46%'],
  ['Top-5', '53%', '48%'],
  ['Top-10', '60%', '55%'],
  ['Median Rank', '1.5', '7.5'],
  ['MRR', '0.485974', '0.447212'],
]

const PAPER_SECTIONS = [
  {
    title: 'Abstract',
    paragraphs: [
      'Genovy is being built as a graph-based rare-disease intelligence platform designed to sit between fragmented patient records and real clinical action. The current system already exposes a live knowledge backbone covering diseases, phenotypes, genes, variants, trials, canonical concepts, and typed evidence relationships with provenance preserved at the source level.',
      'On top of that backbone, Genovy runs a phenotype-driven ranking workflow that is already benchmarked against Exomiser on the official 100-case phenotype-only rare-disease benchmark. The current best real rule-based snapshot leads Exomiser on upper-rank quality while still trailing on total recall, which makes the main remaining bottleneck evidence completeness rather than pure ranking architecture.',
      'This paper is intentionally a mix of scientific and product writing. It explains the graph architecture, the current methodology, the benchmark evidence, the pharma and research relevance of the graph, and the planned case-intelligence and machine-learning layers that are not yet fully productized.',
    ],
  },
  {
    title: '1. Why This Exists',
    paragraphs: [
      'Rare-disease work is slowed not only by biological complexity, but by operational fragmentation. Patients often arrive with years of scattered notes, imaging, lab data, genetics, pathology, and specialist impressions. Before anyone can reason well about the disease, the case itself has to be made legible.',
      'Most tools cover only one layer of that problem. Some help with storage, some with phenotype search, some with variant interpretation, and some with trial discovery. Very few systems aim to connect the patient record, the disease graph, the workup logic, and the translational downstream paths in one stack.',
      'Genovy is aimed at that missing layer: a structured bridge between source-auditable rare-disease knowledge and the real-world case workflow.',
    ],
    note:
      'The practical goal is not just ranking. The goal is to make hard rare-disease cases easier to structure, inspect, explain, and move forward.',
  },
  {
    title: '2. Platform Overview',
    paragraphs: [
      'Genovy is built as a multi-layer system rather than a single diagnostic model. The live layer today is the knowledge graph and phenotype-driven ranking stack. The next product layer is the case-intelligence system that turns real patient records into a structured clinical workup.',
    ],
    subsections: [
      {
        heading: 'Knowledge graph layer',
        body:
          'The graph stores diseases, phenotypes, genes, variants, trials, canonical concepts, raw source records, and typed evidence relationships. These are not flattened into one surface. Entities, edges, and evidence stay separate so provenance, confidence, and update history remain inspectable.',
      },
      {
        heading: 'Phenotype-ranking layer',
        body:
          'The current diagnostic path is phenotype-first. It takes structured clinical findings, searches the graph, and produces a ranked gene list with an explainable evidence path rather than an opaque black-box score.',
      },
      {
        heading: 'Case-intelligence layer',
        body:
          'The planned next layer turns uploaded patient records into a longitudinal case representation: normalized findings, unresolved workup questions, a clinician-ready brief, and a clearer next-step surface.',
      },
      {
        heading: 'Translational layer',
        body:
          'Because the graph already links diseases, phenotypes, genes, variants, and trials, the same backbone can support diagnosis, target discovery, cohort discovery, and future eligibility workflows.',
      },
    ],
    facts: GRAPH_FACTS,
  },
  {
    title: '3. Data Foundation And Graph Design',
    paragraphs: [
      'The current graph is built from seven source families and keeps source lineage explicit rather than treating ingestion as a one-time import. This matters because rare-disease reasoning depends on being able to distinguish between raw source claims, canonical concepts, and downstream inferred relationships.',
    ],
    bullets: [
      'Canonical concepts sit above raw source entities so multiple vocabularies can be reconciled without losing provenance.',
      'Disease-gene, disease-phenotype, gene-phenotype, variant-disease, and trial-disease relationships remain typed rather than collapsed.',
      'Clinical evidence is preserved as evidence, not just absorbed into a final score.',
      'Source sync state is preserved so the graph can be refreshed and reprocessed without erasing what was previously ingested.',
    ],
    chips: DATA_SOURCES,
  },
  {
    title: '4. Methodology',
    paragraphs: [
      'The current Genovy methodology is best understood as a graph-and-scoring system rather than a foundation-model diagnostic system. The ranking path is intentionally explainable and still constrained by the quality of the evidence layer beneath it.',
    ],
    subsections: [
      {
        heading: '4.1 Source integration and normalization',
        body:
          'Upstream data from MONDO, HPO, OMIM, ClinGen, ClinVar, Orphadata, and ClinicalTrials.gov are normalized into a shared graph surface with canonical identifiers, aliases, memberships, and source-specific lineage retained.',
      },
      {
        heading: '4.2 Evidence modeling',
        body:
          'Genovy separates entities, typed relationships, and relationship evidence. This allows the system to preserve whether a signal comes from direct disease-phenotype support, propagated support, gene linkage, variant evidence, or another evidence tier instead of mixing them into one undifferentiated score.',
      },
      {
        heading: '4.3 Phenotype-driven ranking',
        body:
          'The current deployed ranking path is phenotype-first and explainable. It uses direct phenotype overlap, propagated support, disease-to-gene handoff geometry, and evidence-backed support selection to rank candidate genes. The benchmarked phenotype-only workflow does not require variant or sequencing input.',
      },
      {
        heading: '4.4 Benchmark protocol',
        body:
          'Current public benchmark evidence comes from the official 100-case phenotype-only rare-disease benchmark used for direct comparison with Exomiser. Metrics tracked include found rate, Top-1, Top-3, Top-5, Top-10, median rank, and mean reciprocal rank.',
      },
      {
        heading: '4.5 Planned learning layer',
        body:
          'Machine learning is planned as the next-ranking layer, but it is not being positioned as the current core of the system. The planned feature set includes exact direct overlap, propagated overlap, semantic similarity, support-disease quality, gene-level support density, source coverage, and future model-organism overlap features. Candidate model families include CatBoost, XGBoost, and ranking losses such as LambdaMART, but this layer is intentionally gated until the evidence surface is cleaner.',
      },
    ],
    note:
      'The intended ML direction is to learn over a stronger evidence surface, not to let a model compensate for thin or missing graph truth.',
  },
  {
    title: '5. Current Results',
    paragraphs: [
      'The strongest current real rule-based benchmark snapshot shows that Genovy is already competitive where rank quality matters most. The remaining deficit is total recall, which points back to evidence completeness and truth-branch depth rather than complete failure of the ranking architecture.',
    ],
    table: {
      caption:
        'Official 100-case phenotype-only benchmark. Current strongest real Genovy rule-based scorer snapshot compared with Exomiser.',
      headers: BENCHMARK_HEADERS,
      rows: BENCHMARK_ROWS,
    },
    bullets: [
      'Genovy currently leads Exomiser on Top-1, Top-3, Top-5, Top-10, median rank, and MRR in this snapshot.',
      'Exomiser still leads on total found rate, so recall and evidence completeness remain important open work.',
      'The benchmark is still small, which means the results are encouraging but should be interpreted with appropriate caution.',
    ],
  },
  {
    title: '6. Pharma And Translational Use Cases',
    paragraphs: [
      'The graph is not only useful for diagnosis. Because Genovy already links diseases, phenotypes, genes, variants, and trials in one inspectable structure, it also has clear translational value.',
    ],
    subsections: [
      {
        heading: 'Clinical diagnosis',
        body:
          'The current phenotype-driven ranking layer is already useful as an intake accelerator. It can take a structured phenotype profile and produce a ranked, inspectable candidate list before sequencing or downstream specialist review.',
      },
      {
        heading: 'Pharma and target discovery',
        body:
          'A graph that makes gene-disease-phenotype relationships queryable in one place can support target discovery, phenotype-based patient stratification, cross-disease overlap analysis, and indication-adjacent hypothesis generation. In practice, that means Genovy can function as a translational map rather than only a diagnostic engine.',
      },
      {
        heading: 'Research acceleration',
        body:
          'Computational biology and rare-disease research teams can use the graph as a source-auditable baseline for phenotype-to-gene reasoning, cohort framing, and reproducible comparison work without having to rebuild the same relationship surface from scratch.',
      },
    ],
  },
  {
    title: '7. Product Direction',
    paragraphs: [
      'The next stage of Genovy is not just better ranking. It is a full case-intelligence layer that can accept years of fragmented patient records and turn them into a structured, clinician-usable workup surface.',
      'That means case ingestion, timeline stitching, normalized findings, document-linked evidence, clinician briefs, next-step workup suggestions, and eventually trial and eligibility workflows. The graph remains the foundation, but the product expands from rare-disease search into workflow infrastructure.',
    ],
  },
  {
    title: '8. Limitations And Open Work',
    paragraphs: [
      'The current system is already meaningful, but it should not be presented as complete. Several important limitations remain explicit.',
    ],
    bullets: [
      'The official phenotype-only benchmark is only 100 cases, which limits how confidently small metric changes can be interpreted.',
      'The biggest remaining bottleneck is evidence completeness and truth-branch richness, not only scoring logic.',
      'The case-intelligence layer is planned, not yet complete.',
      'The future ML ranker is designed and scoped, but intentionally not presented as already production-defining.',
      'Model-organism and semantic-similarity channels remain part of planned sophistication rather than the current public core.',
    ],
  },
  {
    title: '9. Conclusion',
    paragraphs: [
      'Genovy already demonstrates that a graph-based rare-disease intelligence system can be both clinically useful and scientifically inspectable. The current platform has a real knowledge backbone, a real phenotype-first ranking workflow, and real benchmark evidence.',
      'What makes the project more interesting is that the same graph also supports the next layer: case structuring, translational discovery, and future learning-based ranking over a cleaner and richer evidence base. That is the direction this platform is being built toward.',
    ],
  },
]

function PaperFactGrid({ facts }) {
  if (!facts?.length) return null

  return (
    <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-6">
      {facts.map(fact => (
        <div
          key={fact.label}
          className="rounded-2xl border p-5"
          style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}
        >
          <div className="text-2xl sm:text-3xl font-semibold outfit text-teal-400">{fact.value}</div>
          <div className="text-sm text-slate-400 mt-2">{fact.label}</div>
        </div>
      ))}
    </div>
  )
}

function PaperChipRow({ chips }) {
  if (!chips?.length) return null

  return (
    <div className="flex flex-wrap gap-3 mt-6">
      {chips.map(chip => (
        <span
          key={chip}
          className="rounded-full px-4 py-2 text-sm border text-slate-300"
          style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}
        >
          {chip}
        </span>
      ))}
    </div>
  )
}

function PaperTable({ table }) {
  if (!table) return null

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
      <div className="px-5 py-4 text-sm text-slate-300 border-b" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}>
        {table.caption}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead style={{ background: 'rgba(255,255,255,0.02)' }}>
            <tr>
              {table.headers.map(header => (
                <th key={header} className="px-5 py-4 text-xs uppercase tracking-[0.16em] mono text-slate-400">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map(row => (
              <tr key={row[0]} className="border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                {row.map((cell, index) => (
                  <td key={`${row[0]}-${index}`} className="px-5 py-4 text-sm sm:text-base text-slate-200">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PaperSection({ section }) {
  return (
    <section
      className="rounded-3xl border p-8 sm:p-10"
      style={{
        background: 'rgba(10,12,18,0.92)',
        borderColor: 'rgba(255,255,255,0.06)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02), 0 24px 64px rgba(0,0,0,0.24)',
      }}
    >
      <h2 className="text-2xl sm:text-3xl font-medium mb-5 outfit text-white">{section.title}</h2>

      {section.paragraphs?.map(paragraph => (
        <p key={paragraph} className="text-base sm:text-lg leading-8 text-slate-300 mb-4 last:mb-0">
          {paragraph}
        </p>
      ))}

      {section.subsections ? (
        <div className="grid gap-5 mt-6">
          {section.subsections.map(subsection => (
            <div
              key={subsection.heading}
              className="rounded-2xl border p-6"
              style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}
            >
              <h3 className="text-lg sm:text-xl font-medium outfit text-white mb-3">{subsection.heading}</h3>
              <p className="text-slate-300 leading-7">{subsection.body}</p>
            </div>
          ))}
        </div>
      ) : null}

      {section.bullets ? (
        <ul className="mt-6 space-y-3 text-slate-300">
          {section.bullets.map(bullet => (
            <li key={bullet} className="flex gap-3 leading-7">
              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-teal-400 shrink-0" />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <PaperFactGrid facts={section.facts} />
      <PaperChipRow chips={section.chips} />
      <PaperTable table={section.table} />

      {section.note ? (
        <div
          className="mt-6 rounded-2xl border px-5 py-4 text-sm sm:text-base leading-7 text-slate-200"
          style={{ background: 'rgba(20,184,166,0.08)', borderColor: 'rgba(20,184,166,0.18)' }}
        >
          {section.note}
        </div>
      ) : null}
    </section>
  )
}

export default function PaperPage() {
  return (
    <div style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <header
        className="sticky top-0 z-40 border-b backdrop-blur-xl"
        style={{ background: 'rgba(3,4,7,0.84)', borderColor: 'rgba(255,255,255,0.05)' }}
      >
        <div className="max-w-6xl mx-auto px-6 lg:px-8 py-5 flex flex-wrap items-center justify-between gap-4">
          <a href={SITE_LINKS.home} className="inline-flex items-center gap-2 text-white font-medium outfit tracking-tight">
            <span className="text-teal-400">Genovy</span>
            <span
              className="mono text-[10px] px-2 py-1 rounded-full border"
              style={{ borderColor: 'rgba(20,184,166,0.22)', background: 'rgba(20,184,166,0.08)', color: 'var(--teal-400)' }}
            >
              Paper
            </span>
          </a>
          <nav className="flex flex-wrap items-center gap-6 text-sm text-slate-400">
            <a href={SITE_LINKS.home} className="inline-flex items-center gap-2 hover:text-white transition-colors">
              <ArrowLeft size={15} />
              Home
            </a>
            <a href={`${SITE_LINKS.home}#platform`} className="hover:text-white transition-colors">
              Platform
            </a>
            <a href={SITE_LINKS.github} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 hover:text-white transition-colors">
              <GitFork size={15} />
              GitHub
            </a>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 lg:px-8 py-16 sm:py-20">
        <section
          className="rounded-[32px] border px-8 py-10 sm:px-12 sm:py-14 mb-10"
          style={{
            background:
              'linear-gradient(180deg, rgba(20,184,166,0.1) 0%, rgba(10,12,18,0.96) 26%, rgba(10,12,18,0.98) 100%)',
            borderColor: 'rgba(20,184,166,0.18)',
            boxShadow: '0 24px 72px rgba(0,0,0,0.34)',
          }}
        >
          <div
            className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full mono text-xs font-bold tracking-[0.16em]"
            style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--teal-400)' }}
          >
            <FileText size={14} />
            WORKING PAPER
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl leading-tight outfit font-medium text-white max-w-4xl">
            {PAPER_TITLE}
          </h1>
          <p className="text-lg sm:text-xl leading-8 text-slate-300 mt-6 max-w-4xl">{PAPER_SUBTITLE}</p>
          <div className="flex flex-wrap gap-3 mt-8 text-sm text-slate-300">
            <span className="rounded-full px-4 py-2 border" style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
              Author: Ahmed Elmorshedy
            </span>
            <span className="rounded-full px-4 py-2 border" style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
              Status: active working paper
            </span>
            <span className="rounded-full px-4 py-2 border" style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
              Scope: methods, benchmark evidence, product direction
            </span>
          </div>
        </section>

        <div className="space-y-8">
          {PAPER_SECTIONS.map(section => (
            <PaperSection key={section.title} section={section} />
          ))}
        </div>

        <section
          className="mt-10 rounded-[28px] border px-8 py-8 sm:px-10 sm:py-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6"
          style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}
        >
          <div>
            <p className="text-xs font-bold mono tracking-[0.16em] text-teal-400 mb-3">DISCUSS GENOVY</p>
            <h2 className="text-2xl sm:text-3xl outfit text-white mb-3">Independent build. Ready for strategic partnerships.</h2>
            <p className="text-slate-300 max-w-2xl leading-7">
              Genovy was built independently by Ahmed Elmorshedy as a phenotype-driven rare-disease intelligence platform with strong benchmark performance. We are now seeking clinical partners, research collaborators, and aligned funding to accelerate deployment, product development, and real-world adoption.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href={SITE_LINKS.founderEmail}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm text-white"
              style={{ background: 'var(--teal-500)', border: '1px solid var(--teal-400)' }}
            >
              <Mail size={16} />
              Contact Ahmed
            </a>
            <a
              href={SITE_LINKS.github}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm border text-slate-200 hover:text-white transition-colors"
              style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}
            >
              <GitFork size={16} />
              View GitHub
            </a>
          </div>
        </section>
      </main>
    </div>
  )
}
