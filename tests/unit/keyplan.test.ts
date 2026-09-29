import { describe, expect, test } from 'vitest';
import { cases } from '@/content/site';
import { keyplan } from '@/lib/keyplan';
import { isVerbatim } from '@/lib/verbatim';

// SPEC SM5a "The resulting Key plans" — exact, with polish r1's three audited overrides (cloudflare/orbit Prototype,
// PFF Research: her sentence of what the level produced, where the rule gave feature names or a scene-setting line).
const TABLE: Record<string, string[]> = {
  cloudflare: [
    "R2's core strengths (zero egress fees, S3 compatibility, and deep platform integration) create an opportunity to make the dashboard as strong as the infrastructure behind it.",
    'I conducted semi-structured interviews with 4 users to understand their daily workflows, dashboard usage patterns, and friction points.',
    'Connecting a bucket to Workers and Queues required leaving R2 entirely, with no way to verify the connection.',
    'I condensed four steps into two by surfacing integrations inside the bucket.',
    'A new Integrations tab surfaces connected Workers, Queues, and other compute services with directional labels, a first across any storage dashboard.',
    'Design decisions must be rooted in data before any screen is opened.',
  ],
  pff: [
    'For their emergency management clients, we redesigned InCEP, a legacy budget planning platform, into Treasora, an AI-assisted system that streamlines how mission assignments, cost estimates, and transactions move through a multi-role approval chain.',
    'Instead of manually transcribing every field, the analyst uploads the source document and reviews what the system extracts.',
    'Beyond workflow pain points, we realized InCEP users have varying levels of tech literacy.',
    'Core Principle 1: AI informs, humans decide',
    'We built a comprehensive design system from scratch in Figma with 85+ reusable components, including buttons, tables, navigation, and form elements, so that every screen across web and mobile inherited a shared visual language.',
    'Testing focused on 4 tasks that mirror the full approval chain: create a Mission Assignment, create a Cost Estimate, approve the estimate, and create and approve a Transaction.',
    '~15 min → ~6 min to create a Mission Assignment.',
  ],
  csbs: [
    'In 2023, the call center received 320,000 calls from MLOs struggling to complete their licenses, with an average cost of $9.70 per call.',
    'We created a journey map from self-evaluation to guide 6 interviews with call-center agents.',
    'From there, I extracted user pain points and identified over 25 issues that directly informed six journey maps.',
    'Reduce Visual Clutter · Simplify Navigation · Improve Search · Clarify Language · Keep Content Current',
    'The New NMLS Resource Center launched on September 20, 2025.',
    '50% reduction in navigation time across 10 common searches',
  ],
  'u-up': [
    'The digital age promised connection but delivered isolation. During moments of anxiety or loneliness, people can’t find accessible, empathetic support.',
    'We began by understanding what “vulnerability” means to different people. Our goal was real human connection, not another app that leaves people lonelier.',
    'How might we connect people experiencing late-night distress with real-time empathetic support?',
    'We ultimately were interested in a digital tool to match people with shared vulnerabilities so they can find support from someone who’s been there.',
    'We defined an end to end, privacy first flow from late night trigger to consented matching and time boxed chat.',
    'Problem framing and ethics matter as much as features.',
  ],
  orbit: [
    'Faculty at the UMD iSchool manage a range of responsibilities. Currently, there is no easy way to track everything they do, which makes it hard to showcase their contributions during promotions.',
    'We conducted semi-structured interviews with 8 faculty members to understand their routines, delegation strategies, goals, and tools for promotion planning.',
    'The Wall Walk generated a wealth of innovative ideas that guided our visioning session.',
    'We conducted an ideation session and produced five initial design concepts.',
    'AI Assistant suggests activities to log based on connected sources',
    "Participatory design surfaces what interviews can't: Leading the participatory design sessions was a turning point.",
  ],
  educademy: [
    'The COVID-19 pandemic disrupted traditional schooling in India, revealing a lack of structured tools to support digital learning.',
    'User interviews revealed Microsoft Teams and School Canvas platforms as significant competitors and warranted further analysis.',
    'Parent · Teacher · Student',
    'User Stories · MoSCoW Method · Key Features',
    'The core feature I refined was the call scheduling feature for parents, making it easy for them to connect with instructors.',
    'Educademy taught me to turn multi-stakeholder research into clear user stories and high-impact features.',
  ],
};
const RULES: Record<string, (number | 'override')[]> = {
  cloudflare: [1, 1, 1, 1, 'override', 4],
  pff: ['override', 3, 'override', 1, 4, 4, 4],
  csbs: ['override', 1, 'override', 6, 1, 'override'],
  'u-up': [1, 1, 1, 4, 1, 'override'],
  orbit: [1, 1, 'override', 1, 'override', 4],
  educademy: [1, 1, 7, 8, 3, 1],
};

describe('keyplan() equals the SM5a table', () => {
  for (const cs of cases) {
    test(cs.slug, () => {
      const stops = keyplan(cs);
      expect(stops.map((s) => s.plain)).toEqual(TABLE[cs.slug]);
      expect(stops.map((s) => s.rule)).toEqual(RULES[cs.slug]);
      expect(stops.map((s) => s.label)).toEqual(cs.sections.map((s) => s.label));
    });
  }
  test('every stop is verbatim (parts individually; stat parts individually)', () => {
    for (const cs of cases) {
      for (const s of keyplan(cs)) {
        const pieces = s.kind === 'parts' ? s.parts! : s.kind === 'stat' ? [s.stat!.v, s.stat!.html] : [s.plain];
        for (const p of pieces) expect(isVerbatim({ src: cs.slug as never, text: p }), `${cs.slug} ${s.label}: ${p}`).toBe(true);
      }
    }
  });
});
