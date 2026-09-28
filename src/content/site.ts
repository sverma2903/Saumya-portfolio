import { m } from '../lib/blocks';
import cloudflare from './cloudflare';
import pff from './pff';
import csbs from './csbs';
import uup from './u-up';
import orbit from './orbit';
import educademy from './educademy';

export const cases = [cloudflare, pff, csbs, uup, orbit, educademy];

export const links = {
  email: 'mailto:saumyaverma29@gmail.com',
  linkedin: 'https://www.linkedin.com/in/saumyaverma29/',
  resume: 'https://drive.google.com/file/d/1__Kwp4u1ETToSEOJoi-PcJXSP_l9Mfed/view?usp=sharing',
  architecture: 'https://issuu.com/saumyaverma7/docs/convert-jpg-to-pdf.net_2023-12-20_13-53-53_compres',
};

/** Her original labels, copied verbatim from her Framer pages (index, about, orbit, nav). */
export const labels = {
  selected: 'Selected Projects ↓',
  story: 'My Story ↓',
  loves: 'Things I love ↓',
  architecture: 'Architecture Portfolio',
  conceptAnalysis: 'Concept Analysis',
  nav: { about: 'About', play: 'Play', resume: 'Resume' },
};

export const home = {
  headline: '<span class="hl">Saumya Verma</span> is a <em>product designer</em> working on complex tools and AI-assisted workflows',
  sub: 'Currently at <strong>Fulcrum GT</strong>, leading design and front-end build for Accio, an AI delivery platform for enterprise software implementations.',
  connect: "I'd love to connect with you!",
  closing: "Let's build the next one together!",
  copyright: 'Saumya Verma © 2018-2026 All Rights Reserved',
};

/** The four selected projects shown on the home page, with their original cards' imagery. */
export const selected = [
  {
    slug: 'cloudflare',
    title: 'Cloudflare R2 Redesign',
    text: "Redesigned R2's configuration, management, and monitoring flows. Two of the gaps identified have since been shipped independently.",
    cover: m('xVY62d93p5rA2uqmmKmIQwjR8I.gif'),
    logo: m('CQBzyCCtXm6Sxa1H7rjdmW35A4.webp'),
    tone: 'linear-gradient(180deg, rgba(251, 172, 64, 0.7) -10%, rgba(255, 103, 51, 0.65) 108%)',
    fit: 'shot',
    tags: ['Personal Project', 'Mar 2026'],
  },
  {
    slug: 'pff',
    title: 'Auditable Approvals for Emergency Spending',
    text: 'Rebuilt a legacy budget platform into a system where AI accelerates the work but a named person signs off on every dollar.',
    cover: m('J2cpNxdkMPJ3EZmGxbCpvSfe6E.png'),
    logo: m('LLwKJhf5XlV3SWhOs3xldIRQFA.png'),
    tone: '#c3d4cd',
    fit: 'cover',
    tags: ['Product Designer, PFF LLC', 'Sep 2025 - May 2026'],
  },
  {
    slug: 'csbs',
    title: 'NMLS Resource Center Redesign',
    text: '50% reduction in navigation time by redesigning the Resource Center for the Nationwide Multistate Licensing System (NMLS).',
    cover: m('hc5LSNViBiB98sAACx272BNZYw.gif'),
    logo: m('o8ini5inZ7izIUkXDxD6Ryd890E.png'),
    tone: '#4878aa',
    fit: 'contain',
    tags: ['UX Design Intern, CSBS', 'May - Dec 2025'],
  },
  {
    slug: 'u-up',
    title: 'Winner, CMU XHacks',
    text: 'Won 1st Place + Social Innovation Prize at XHacks by Carnegie Mellon University by connecting people through shared experiences.',
    cover: m('y8vKVnSvce5bLvmSJjZXBbMPNWU.png'),
    logo: m('z9qKmfXnKpQ01CHNuHDM1KgY6aE.png'),
    tone: 'linear-gradient(180deg, rgb(103, 51, 80) 0%, rgb(57, 39, 63) 100%)',
    fit: 'contain',
    tags: ['🥇 Winner, CMU XHacks', '48 hours'],
  },
];

export const about = {
  headline: 'I blend business thinking, psychology, and systems design to create experiences that <em>move metrics</em>.',
  portrait: m('AIv5iYq94P5wgTfviYYCQf5ATw.png'),
  story: [
    "Growing up in India, I was always fascinated by design and how it could shape people's lives. This curiosity led me to pursue a <strong>Bachelor's in Architecture</strong> from NIT Bhopal. Through <strong>design competitions and studio work</strong>, I developed core skills that still guide my approach today: deep empathy for users, strategic problem-solving, and the ability to prioritize.",
    "With a <strong>Master's in Human-Computer Interaction</strong> from the University of Maryland, College Park, I bring that same human-centric approach to digital design. I'm still competing and pushing myself, recently <strong>winning XHacks (Carnegie Mellon University) and Usabilathon (Transurban).</strong>",
    'I have developed strong skills in user research, prototyping, and user testing. My goal has always been to help align the team around a common vision and ensure that the <strong>product is designed with a clear purpose</strong> and meets the needs of the target audience.',
  ],
  loves: {
    fiction: {
      title: 'Historical Fiction',
      text: 'I unwind with historical fiction - the kind that drops you into another era. I’ve devoured more WWII novels than I can count, and am drawn towards layered plots and complex characters.',
      books: [m('cHvLFjmkIVcEHSvBWg8yAPWPtmU.jpg'), m('ELriPrXDt52v8CseD2JrDCpM.jpg'), m('uWV8s87snrPxhjrBBSr2Y3boI.jpeg')],
    },
    writing: {
      title: 'Blog &amp; Writing',
      text: 'In college I launched a Medium blog to document what I was learning. Writing recaps and project notes deepened my understanding and helped me connect with other designers. I share reflections, case studies, and ideas-in-progress.',
      published:
        'My writings have been published at <a href="https://www.re-thinkingthefuture.com/author/saumyaverma-1/">Rethinking the Future</a> and <a href="https://www.novatr.com/learning-hub">Novatr</a> (Design Journals) as well.',
      posts: [
        { title: 'Cloudflare R2 Object Storage Redesign', href: 'https://medium.com/@saumyaverma29/cloudflare-r2-object-storage-redesign-ae5a1daf44f3' },
        { title: 'Making Visual Data Accessible', href: 'https://medium.com/@saumyaverma29/making-visual-data-accessible-04dd0b6c6ba2' },
        { title: 'Search SUGAR', href: 'https://medium.com/@saumyaverma29/search-sugar-33fc1c16fb16' },
      ],
    },
    meditation: {
      title: 'Meditation',
      text: 'Three years of daily(ish) meditation: better focus, lower noise.',
      img: m('B4i82MXuCijqdjx0mPV84ZzTM8M.jpg'),
    },
    sketching: {
      title: 'Sketching',
      text: 'Colored pencils and graphite help me explore form, light, and texture before pixels.',
      sketches: [
        'JDDLKVlZddaiHcGB3An7NlOd0Q.png',
        'RNUtuBnvNm3fdod5f4EpHfqBE.png',
        'uEhkOCukMrK1gyMJTTyB3rNCTYA.png',
        'DkdSjNwt9pSYJCwdEdmmN1Gic8.png',
        'TewBJLbc9qg8wFsOeqcZ5cPyKQ.png',
        'UwqDbCB0URUOaV1HtDtjuz9YzE.png',
        'L6lUNQG0zTeDkKzI3vmGnZwut4.png',
      ].map(m),
    },
  },
};

export const play = {
  headline: "Hackathons &amp; <em>side quests</em> that didn't make the case study cut",
  sub: "Builder by default. If something makes me curious, I usually end up prototyping it, whether or not there's a reason to.",
  items: [
    {
      title: 'Visualizing conversation health as flowing sand',
      tag: 'Hackathon X Figbuild 2026',
      href: 'https://devpost.com/software/conversense',
      media: [m('GHjG21Lo2f64p4k0y3obKTFGgck.mp4')],
      tone: 'linear-gradient(#fdd0a4 0%, #dccfff 100%)',
      fit: 'contain',
    },
    {
      title: 'ExpressLanes Website Redesign',
      tag: '1st Place X TransUrban Hackathon 2025',
      media: [m('sgdIeQ2FYc9vdl8NcEV3RS8g.jpg')],
      tone: '#f2f2f2',
      fit: 'contain',
    },
    {
      title: 'Using Teachable AI tool to help low-vision users locate lost glasses',
      tag: 'Inclusive Design X UMD',
      media: [m('6GwunOSeX0YVHJspIvJG7W3Q.mp4')],
      tone: '#dcebfb',
      fit: 'contain',
    },
    {
      title: 'Simplifying Faculty Workload Management',
      tag: 'UX Research X UMD',
      href: '/orbit',
      media: [m('T8tenCXKluVSCNxnIJ2yBvycmw.jpg'), m('IJYwPa4qI0oYO2wGbVxyxwzlZOM.png')],
      tone: '#a36563',
      fit: 'cover',
    },
    {
      title: 'Simplifying E-learning for COVID-era',
      tag: 'Education X Personal Project',
      href: '/educademy',
      media: [m('bDbWbcvql01Q5iZy5tdbwCEUt0.jpg')],
      tone: '#bbb4fa',
      fit: 'contain',
    },
  ],
};
