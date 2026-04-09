import { ArrowLeft, FileText, GitFork, Mail } from 'lucide-react'
import { SITE_LINKS } from './siteConfig.js'

const PAPER_SECTIONS = [
  {
    title: 'Abstract',
    paragraphs: [
      'Rare-disease care is slowed less by a lack of raw data than by a lack of case structure. Patients arrive with years of reports, imaging, labs, genetics, pathology, and specialist notes spread across disconnected systems and file formats. Clinicians inherit a workup burden before they can even reason about the disease.',
      'Genovy is designed to address that failure mode. It combines a normalized rare-disease knowledge network with a case layer intended to reconcile fragmented records into an auditable clinical narrative. The live platform already exposes the knowledge backbone. The next product layer is focused on case ingestion, longitudinal timelines, clinician briefs, and guided next-step workup support.',
    ],
  },
  {
    title: '1. Problem',
    paragraphs: [
      'Rare-disease patients often spend years between specialists while the underlying case remains operationally illegible. Existing tools tend to cover only one fragment of that journey: document storage, phenotype search, variant interpretation, or trial discovery.',
      'Very few systems serve the handoff between the patient record and the clinical workup itself. That gap creates repeated history taking, repeated interpretation, and avoidable diagnostic delay.',
    ],
    note:
      'Genovy is aimed at the workup bottleneck: the point where fragmented evidence has to be turned into a clinically usable case view.',
  },
  {
    title: '2. System Overview',
    columns: [
      {
        heading: 'Knowledge layer',
        body:
          'The live backbone stores diseases, phenotypes, genes, variants, trials, evidence, source metadata, canonical concepts, aliases, memberships, and typed relationships in a graph-oriented schema.',
      },
      {
        heading: 'Case layer',
        body:
          'The planned case layer turns uploaded records into a structured patient timeline, normalized findings, unresolved workup questions, and a clinician-ready brief with traceability back to source documents.',
      },
      {
        heading: 'Product layer',
        body:
          'The output surface is intended to be readable and operational: case summaries, referral guidance, workup recommendations, future trial matching, and clinic-facing workflows.',
      },
      {
        heading: 'Public API layer',
        body:
          'The platform already exposes a versioned read-only API and a public platform overview so the backbone can be inspected without exposing admin controls or write paths.',
      },
    ],
  },
  {
    title: '3. Data Architecture',
    paragraphs: [
      'Genovy separates entities, relationships, and evidence instead of flattening everything into a single undifferentiated store. That distinction matters in rare disease because the same disease-gene link can have different evidentiary strength than a variant-disease link, and clinical findings may be supporting, excluding, age-dependent, or uncertain.',
    ],
    bullets: [
      'Entity families include diseases, phenotypes, genes, variants, trials, and source records.',
      'Canonical resolution sits above raw source entities so noisy source vocabularies can be reconciled without losing provenance.',
      'Structured clinical evidence keeps phenotype support, exclusions, natural history, and validity assertions typed instead of implicit.',
      'Source sync state is preserved so refreshes, backfills, and auditability remain first-class.',
    ],
  },
  {
    title: '4. Source Integration And Provenance',
    paragraphs: [
      'The current platform integrates a set of refreshable rare-disease and clinical sources, including MONDO, HPO, Orphadata, ClinGen, ClinVar, and ClinicalTrials.gov.',
      'These sources are not treated as static imports. Each connector has sync state, lineage, and a path into canonical concepts and downstream evidence layers. This design keeps the graph inspectable and makes future reprocessing possible without losing the original record of what was ingested and when.',
    ],
  },
  {
    title: '5. Current Live Capabilities',
    paragraphs: [
      'The live platform already provides a public website, a platform explorer, a read-only API, a source catalog, canonical concept summaries, knowledge search, typed clinical evidence, and a first phenotype-only diagnostic ranking layer.',
      'The important boundary is that the knowledge backbone is live now, while the patient case ingestion and clinician brief layer is the next product stage rather than something already finished.',
    ],
  },
  {
    title: '6. Product Direction',
    paragraphs: [
      'The intended operating model is patient-to-clinician, not patient-only and not researcher-only. Patients should be able to bring years of records into one place. Clinicians should inherit a workup surface that is already structured, source-linked, and legible.',
      'Downstream modules such as trial matching, eligibility workflows, therapy guidance, and clinic copilots depend on that case layer being correct first.',
    ],
  },
  {
    title: '7. Conclusion',
    paragraphs: [
      'Genovy is being built to solve a specific rare-disease infrastructure problem: the lack of a durable case layer between scattered patient records and meaningful clinical action.',
      'The live system already establishes the knowledge backbone and provenance model needed for that goal. The next stage is to turn that backbone into a practical case-intelligence workflow that reduces diagnostic friction and makes hard rare-disease cases easier to reason about, communicate, and move forward.',
    ],
  },
]

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
      {section.columns ? (
        <div className="grid md:grid-cols-2 gap-6 mt-6">
          {section.columns.map(column => (
            <div
              key={column.heading}
              className="rounded-2xl border p-6"
              style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}
            >
              <h3 className="text-lg font-medium outfit text-white mb-3">{column.heading}</h3>
              <p className="text-slate-300 leading-7">{column.body}</p>
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
      <header className="sticky top-0 z-40 border-b backdrop-blur-xl" style={{ background: 'rgba(3,4,7,0.84)', borderColor: 'rgba(255,255,255,0.05)' }}>
        <div className="max-w-6xl mx-auto px-6 lg:px-8 py-5 flex flex-wrap items-center justify-between gap-4">
          <a href={SITE_LINKS.home} className="inline-flex items-center gap-2 text-white font-medium outfit tracking-tight">
            <span className="text-teal-400">Genovy</span>
            <span className="mono text-[10px] px-2 py-1 rounded-full border" style={{ borderColor: 'rgba(20,184,166,0.22)', background: 'rgba(20,184,166,0.08)', color: 'var(--teal-400)' }}>
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
          <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full mono text-xs font-bold tracking-[0.16em]" style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--teal-400)' }}>
            <FileText size={14} />
            WORKING PAPER
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl leading-tight outfit font-medium text-white max-w-4xl">
            Genovy: a case-intelligence platform for rare-disease workups
          </h1>
          <p className="text-lg sm:text-xl leading-8 text-slate-300 mt-6 max-w-3xl">
            Genovy is being built as a patient-to-clinician rare-disease case layer. The platform combines a source-auditable knowledge backbone with a structured case-intelligence direction designed to turn fragmented records into a coherent workup, a clinician-ready brief, and a clearer next-step view.
          </p>
          <div className="flex flex-wrap gap-3 mt-8 text-sm text-slate-300">
            <span className="rounded-full px-4 py-2 border" style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>Author: Ahmed Elmorshedy</span>
            <span className="rounded-full px-4 py-2 border" style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>Status: active working paper</span>
            <span className="rounded-full px-4 py-2 border" style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>Scope: product, data architecture, workflow direction</span>
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
            <h2 className="text-2xl sm:text-3xl outfit text-white mb-3">Built independently. Ready for serious collaboration.</h2>
            <p className="text-slate-300 max-w-2xl leading-7">
              Genovy is being developed as clinician-grade rare-disease infrastructure. If you want to discuss product direction, research collaboration, or clinical deployment pathways, use the links here.
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
