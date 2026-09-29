/**
 * decisions.ts · P0 creates → WP5 owns. The Decision schedule (SPEC SM5b), exactly as specified.
 * Each cell is a contiguous verbatim substring of the case's stripped text (tests/data/substrings.test.ts).
 * No evidence chips, no interpretive labels, no paraphrase. Editorial pairings → owner sign-off (§8.9).
 *
 * Anchor rule (build time): the first block, in order, whose stripped text contains `decided`;
 * fallback: the block containing `considered` (lib/verbatim.ts → findBlock()).
 * `plus: 'three-changes'`: render the three <strong> lead-ins of the following list, verbatim:
 *   "Surfacing the S3 API endpoint", "Adding a shortcut link to the token creation flow",
 *   "Make per-bucket token creation easy to find."
 */
import type { Block, CaseStudy } from '../lib/blocks';
import { blockId, splitChildId } from '../lib/ids';
import { boldPieces } from '../lib/planview';
import { normalize, stripHtml } from '../lib/text';
import { findBlock } from '../lib/verbatim';

export interface Decision {
  considered: string;
  decided: string;
  plus?: 'three-changes';
}

export const decisions: Record<string, Decision[]> = {
  cloudflare: [
    { considered: 'Looking at how Cloudflare already handles this on the Workers side, I asked myself, why doesn’t the bucket have the same?',
      decided: 'The proposed flow condenses four steps into two.' },
    { considered: 'Should bucket integrations be a separate tab or inline on the bucket page?',
      decided: "One developer noted that integrations aren't something you check daily. So, I opted for a dedicated tab to keep connections accessible without cluttering the primary workspace." },
    { considered: 'Should Queue connections and Worker bindings be shown in separate views or together?',
      decided: "I chose together. They represent different directions of the same relationship with the bucket, and separating them would force developers to check two places to understand a bucket's full dependency." },
    { considered: 'My first instinct was to bring per-bucket token creation directly into the bucket homepage. But that conflicts with a real technical constraint.',
      decided: 'Administrators need centralized token management on the homepage to oversee all credentials in one place. Instead, I focused on three targeted changes:',
      plus: 'three-changes' },
    { considered: 'My first instinct was to replace "Class A/B" with "Reads/Writes" entirely. But Class A includes writes, lists, and copies, not just writes.',
      decided: 'Instead, I kept the billing terms and added parenthetical translations.' },
  ],
  pff: [
    { considered: 'We planned to conduct primary interviews with emergency management staff, but a federal shutdown during our research phase made government employees inaccessible.',
      decided: "Instead, we worked from PFF's existing interview notes from prior client engagements." },
    // polish r1: her sentence that applies the principle, not the principle's heading (the Key plan's Ideate line)
    { considered: "If AI auto-approved a mission assignment or auto-submitted a cost estimate, there's no accountable human in the chain, and that breaks the audit trail the entire system depends on.",
      decided: 'AI recommends funding lines based on expense descriptions but never fills them out for the user.' },
    { considered: "Testing showed a confidence score alone wasn't enough; users wanted to see which past missions the estimate came from, since they're the ones signing off on it.",
      decided: 'Each suggestion links to the source assignments, allowing the analyst to review the comparison before accepting.' },
    { considered: "The MVP was desktop-first, but field operators don't always have a desk.",
      decided: 'The mobile experience is scoped to fast, confident decisions: review queues, single-decision approval views, and quick status checks, without trying to compress every desktop flow into a phone.' },
    { considered: 'AI is easiest to design when you stop asking "where can we add AI?" and start asking "where is a human doing work a machine should handle?"',
      decided: 'That reframe eliminated half our ideas and sharpened the rest. The features we cut were more important than the ones we kept.' },
  ],
  // polish r1: the context / scope pairing (was D-01) is not a decision; the schedule starts at the detour
  csbs: [
    { considered: 'We started with a vague goal of improving self-service for small company users, paused, and shifted to understanding their pain points.',
      decided: 'That detour uncovered insights that shaped key decisions and informed tree testing for the new NMLS Resource Center information architecture.' },
    { considered: 'Replaced static PDFs with XML-based content.',
      decided: 'Content editors can push changes instantly without regenerating and re-uploading entire documents.' },
  ],
  'u-up': [
    { considered: 'Our team sketched several concepts - one coached people to talk to strangers (a Duolingo for conversation), another offered group meditation to ease anxiety.',
      decided: 'We ultimately were interested in a digital tool to match people with shared vulnerabilities so they can find support from someone who’s been there.' },
    { considered: 'Connections on existing platforms have not experienced the same challenges.',
      decided: 'AI gets the context and analyzes the emotions to connect you with people who have been in your shoes.' },
    { considered: 'Unlimited chat could lead to unhealthy dependency, or boundary violations.',
      decided: 'Open up to people who have been through it in the past without the risk of identity exposure.' },
  ],
  orbit: [
    { considered: 'How might we make personal life commitments valued in faculty reviews?',
      decided: 'We explicitly excluded the Personal aspect (personal-life bar) from MVP due to privacy and equity risks: potential admin visibility ambiguity, bias or stigma from sensitive disclosures, and social pressure to share context, none of which are necessary to achieve the core outcomes.' },
    { considered: 'We generated five distinct design visions, and I pushed for systematically listing the advantages and disadvantages of each.',
      decided: 'It felt like extra work at first, but that rigor helped us defend our MVP choices with confidence.' },
    { considered: 'For the final design vision, we prioritized four MVP features:',
      decided: 'We chose these because they most directly meet the core goals of decision clarity, workload balance, faster reporting, and peer learning while remaining technically feasible to ship in one term.' },
  ],
  educademy: [
    { considered: 'Students worried how their doubts will be cleared',
      decided: 'A critical need identified in user interviews, this helps students stay engaged and overcome learning barriers.' },
    { considered: 'Parents felt underqualified to teach their kids at home',
      decided: 'Allows guardians to monitor student progress and provide support, helping reduce drop-off rates and maintain accountability.' },
    { considered: 'Seesaw and Homeschool Panda have complex interfaces. Simpler apps lack the tools needed to manage e-learning.',
      decided: 'There is a need for a simple app that supports the complexities of e-learning.' },
  ],
};

/** The three verbatim <strong> lead-ins rendered under Cloudflare D-04 (`plus: 'three-changes'`). */
export const THREE_CHANGES = [
  'Surfacing the S3 API endpoint',
  'Adding a shortcut link to the token creation flow',
  'Make per-bucket token creation easy to find.',
] as const;

// ─────────────────────────── build-time resolution (WP5) ───────────────────────────

/** Where a decision lives: the block its `decided` half is in (else its `considered` half), SPEC SM5b. */
export interface DecisionAnchor {
  id: string;            // block id (lib/ids.ts) — the LEVEL link's target
  sectionId: string;
  sectionIndex: number;  // 0-based
  sectionLabel: string;  // her label, the LEVEL cell's text
}
export interface ResolvedDecision extends Decision {
  no: number;                 // 1-based (D-01…)
  anchor: DecisionAnchor | null;
  /** `plus: 'three-changes'`: her <strong> lead-ins of the list that follows the decided sentence, read from her content */
  plusItems: string[];
}

/** Every top-level block and split child of a case, by id, in document order. */
function blockIndex(cs: CaseStudy): Map<string, { block: Block; sectionIndex: number; i: number }> {
  const out = new Map<string, { block: Block; sectionIndex: number; i: number }>();
  cs.sections.forEach((s, si) => s.blocks.forEach((b, i) => {
    const id = blockId(s.id, i);
    out.set(id, { block: b, sectionIndex: si, i });
    if (b.t === 'split') {
      b.left.forEach((c, j) => out.set(splitChildId(id, 'l', j), { block: c, sectionIndex: si, i }));
      b.right.forEach((c, j) => out.set(splitChildId(id, 'r', j), { block: c, sectionIndex: si, i }));
    }
  }));
  return out;
}

/** Her first qualifying bold piece of each item of the first `list` after `id` in the same chapter (normalised). */
function leadIns(cs: CaseStudy, id: string): string[] {
  const at = blockIndex(cs).get(id);
  if (!at) return [];
  const blocks = cs.sections[at.sectionIndex].blocks;
  const list = blocks.slice(at.i + 1).find((b): b is Extract<Block, { t: 'list' }> => b.t === 'list');
  if (!list) return [];
  return list.items.map((item) => normalize(stripHtml(boldPieces(item)[0] ?? ''))).filter(Boolean);
}

/** The case's Decision schedule with anchors and plus items resolved at build time (SPEC SM5b). */
export function resolveDecisions(cs: CaseStudy): ResolvedDecision[] {
  return (decisions[cs.slug] ?? []).map((row, k) => {
    const at = findBlock(cs, row.decided) ?? findBlock(cs, row.considered);
    const anchor = at ? { id: at.id, sectionId: at.sectionId, sectionIndex: at.sectionIndex, sectionLabel: at.sectionLabel } : null;
    let plusItems: string[] = [];
    if (row.plus === 'three-changes') {
      const derived = at ? leadIns(cs, at.id) : [];
      plusItems = derived.length ? derived : [...THREE_CHANGES];
    }
    return { ...row, no: k + 1, anchor, plusItems };
  });
}
