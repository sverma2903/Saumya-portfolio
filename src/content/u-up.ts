import { type CaseStudy, m, h, lede, p, list, img, gallery, stats, cta, cards, feature, split } from '../lib/blocks';

const cs: CaseStudy = {
  slug: 'u-up',
  eyebrow: '🥇 WINNER, CMU XHACKS',
  title: 'Connecting People Through Shared Experience',
  metaTitle: 'Winner, CMU XHacks',
  description: 'Won 1st Place + Social Innovation Prize at XHacks by Carnegie Mellon University by connecting people through shared experiences.',
  meta: [
    ['Role', 'UX Designer, 48 hours'],
    ['Team', 'Jay Moon, Min Kyung Jeong, Bill Guo'],
    ['Skills', 'User Research, Competitive Analysis, Prototyping, Presentation'],
  ],
  cover: [m('y8vKVnSvce5bLvmSJjZXBbMPNWU.png')],
  accent: '#8A3F72',
  accentSoft: '#EEDDE8',
  coverBg: 'linear-gradient(#61324e 0%, #3c2841 100%)',
  coverContain: true,
  sections: [
    {
      id: 'overview',
      label: 'Overview',
      blocks: [
        h('Problem'),
        lede('The digital age promised connection but delivered isolation. During <mark>moments of anxiety or loneliness</mark>, people can’t find accessible, empathetic support.'),
        stats([
          ['~61%', 'Americans <strong>report feeling lonely </strong>sometimes or always (2020 report from Cigna’s U.S. Loneliness Index)'],
          ['~ 73%', 'felt that platforms like <strong>Instagram negatively affected their self-esteem</strong> <em>(Royal Society for Public Health, UK)</em>'],
          ['~20%', 'of Americans adults <strong>experience some form of mental illness</strong> each year <em>(National Institute of Mental Health)</em>'],
        ]),
        h('My Role'),
        p('I led the full design process, from research to final prototype, including surveys, competitor analysis, usability testing, and the presentation video. I <strong>pushed for a user-centered approach</strong> from the start, grounding every decision in real user insight.', 'md'),
        h('Design Solution'),
        p('We designed a digital platform that fosters human connection by matching individuals who share or have shared similar vulnerabilities. By sharing experiences, empathetic conversations, we aim to provide a comforting space where users can express their feelings, feel understood, and find reassurance in knowing that they are not alone.'),
        feature({ title: 'Matching users through AI interactions', html: 'AI gets the context and analyzes the emotions to connect you with people who have been in your shoes.', media: ['fvgOb7paqb8aI3RLh9ZvVpZoU8.gif'] }),
        feature({ title: 'Visualising Regional Connections', html: 'Choose your location to share your struggles with people near you.', media: ['sXzdMl4SEFeL4sF51iLLjSHVoDo.gif'], flip: true }),
        feature({ title: 'Anonymous Time-Restricted Chat', html: 'Open up to people who have been through it in the past without the risk of identity exposure.', media: ['LDyuw9DTp9W6eRcAL624pBSTJHU.gif'] }),
        cta('Jump to Prototype', 'https://www.figma.com/proto/otkst2HCF5IChSST5g80VM/Design?node-id=37-198&t=atGEjN3TPoLc1lKU-1&scaling=scale-down&content-scaling=fixed&page-id=0%3A1&starting-point-node-id=215%3A267&show-proto-sidebar=1'),
      ],
    },
    {
      id: 'empathize',
      label: 'Empathize',
      blocks: [
        h('Secondary Research'),
        lede('We began by understanding what “vulnerability” means to different people. Our goal was <mark>real human connection</mark>, not another app that leaves people lonelier.'),
        img('YihqD9mWB3fEEvHT9bGhpIJWcE.png'),
        h('Survey'),
        p('We surveyed 35 participants to understand their distressing feelings and gauge interest in support from someone who’s overcome similar challenges.'),
        stats([
          ['80%', 'experienced feelings of anxiety, nervousness, or loneliness on  a <strong>daily or weekly basis</strong>'],
          ['77%', 'are either <strong>comfortable</strong> or neutral  about talking to someone who gone through the same experience'],
          ['55%', 'reported that they feel this during  <strong>evening and late at night</strong>'],
        ]),
        split(
          [lede('<strong>80%</strong><br>are interested in using a platform to <strong>connect with others who have shared experiences</strong>', 'lg')],
          [img('MSXXSFArimIHXfSG04aBaXtykFs.png', { frame: 'bare' })],
          '1.3fr 1fr',
        ),
        h('Competitive Analysis'),
        gallery(['yN6VtOwfgmxIVENvwQ1f7rb1pjM.png', 'UV3USwlcgfzLNdnhdzpm5TqHvY.png', 'MX3JSFGhhYN0HuZIDQpvCxO9SE.png', 'FYlsVfQKHJebVVMGXXTrLPHQIwA.png'], { cols: 4, frame: 'soft' }),
        p('Then, we conducted a competitive analysis to understand existing solutions in the space. For this, we analyzed popular apps such as 7 Cups, Reddit, Supportgroups.com, and The Mighty.'),
        img('gxh5qD2sWWaKpuY3yqtN0bPLGnk.jpg', { caption: 'See Detailed Competitive Analysis', wide: true }),
        p('Some insights include:'),
        list([
          'Connections on existing platforms <strong>have not experienced the same challenges.</strong> This can hinder empathetic support.',
          'No current app that displays how many people in the user’s vicinity are <strong>going through similar experiences</strong>, this can help users feel less isolated in their vulnerabilities.',
          'Some platforms rely on asynchronous forum posts or story-sharing, but none facilitate <strong>real-time interactions.</strong>',
          'No dedicated app that <strong>gamifies</strong> the entire experience.',
        ]),
      ],
    },
    {
      id: 'define',
      label: 'Define',
      blocks: [
        h('Key Insights'),
        img('KKvm6krXIbAvSwPSwuIhsEy984.png', { wide: true }),
        h('Product Goals'),
        lede('How might we connect people experiencing late-night distress with real-time empathetic support?'),
        cards(
          [
            { img: 'A31flALfbLhpLOnxkzSZKXz0nI.png', title: 'Privacy-first', html: 'Allow users to share vulnerabilities without revealing identity.' },
            { img: 'yAi9JKE3Kkwcii4bwToozGaif7g.png', title: 'Consent-driven', html: 'Allow users to maintain full control over every interaction. No match happens without explicit opt-in.' },
            { img: 'hOh9LthZaJQtoDxfOFGNMN1Eac.png', title: 'Time-bounded for safety', html: 'Unlimited chat could lead to unhealthy dependency, or boundary violations.' },
          ],
          { cols: 3, variant: 'icon' },
        ),
      ],
    },
    {
      id: 'ideate',
      label: 'Ideate',
      blocks: [
        h('Ideating and Concepting'),
        p('Our team sketched several concepts - one coached people to talk to strangers (a Duolingo for conversation), another offered group meditation to ease anxiety. We ultimately were interested in a digital tool to <strong>match people with shared vulnerabilities so they can find support from someone who’s been there.</strong> From there, we asked the core questions: Who will be our users, when will they turn to this tool, and what should the experience feel like?'),
        img('q6ExA1YGniMFZ8vEpgzUa8GhHf4.jpg', { wide: true }),
      ],
    },
    {
      id: 'prototype',
      label: 'Prototype',
      blocks: [
        h('Wireframes'),
        img('mohqTNO60PBewaVBPAyBDIWh4.jpg', { wide: true }),
        h('User Flow'),
        lede('We defined an end to end, privacy first flow from late night trigger to consented matching and time boxed chat.'),
        img('cey9L4IrjUQGf2l6HVXyuOEHDC8.jpg'),
        h('Main Features'),
        img('Jj6mtgIdKZx8m8Fd6sdljCij8.jpg', { wide: true }),
        h('Presentation'),
        gallery(['DGP887lSg3BslXC1WqoKLaW5uuQ.jpeg', 'UmkbMjWKivVXxVMFaytrWezqXkQ.jpeg', 'n96Sk7QIJq1r0JSEj6iQOepFc.jpeg', 'qdrBaCdP4ouf5D5dpXXBsJvU.jpeg'], { cols: 2 }),
        p('Presentation day ran in two rounds: judges first went desk-to-desk scoring prototypes and research. The top five then pitched on stage with live Q&amp;A. Every team was strong, and the room was electric!!'),
        cta('See Final Presentation', 'https://www.figma.com/proto/otkst2HCF5IChSST5g80VM/Design?node-id=10-142&t=P8aQtigWcFzBeKMA-1'),
      ],
    },
    {
      id: 'reflection',
      label: 'Reflection',
      blocks: [
        p('Winning <strong>First Place + Social Innovation at CMU XHacks 2025</strong> with a four-person, cross-college team reinforced a few truths for me:', 'md'),
        list([
          '<strong>Problem framing</strong> and ethics matter as much as features. Designing for late-night anxiety demanded privacy, consent, and safety baked into every step.',
          '<strong>Evidence beats opinion.</strong> Rapid desk research and guerrilla surveys shaped our matching model and kept scope focused.',
          '<strong>Less is more.</strong> By concentrating on a mindful onboarding, consented matching, time-boxed chat, and reflective wrap-up, we told a clear story that judges and users could grasp immediately.',
          '<strong>The sprint also</strong> <strong>sharpened my collaboration muscles</strong>: divide by strengths, prototype early, narrate outcomes, not interfaces.',
        ], true),
      ],
    },
  ],
};

export default cs;
