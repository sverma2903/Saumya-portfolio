import { type CaseStudy, m, h, h3, lede, p, list, img, gallery, stats, cta, cards, feature, split, concept } from '../lib/blocks';

const cs: CaseStudy = {
  slug: 'orbit',
  eyebrow: 'Academic Project',
  title: 'Simplifying Faculty Workload Management',
  metaTitle: 'Simplifying Faculty Workload Management',
  description: 'UX Research X UMD',
  meta: [
    ['Timeline', 'MAR 2025 - JUN 2025'],
    ['Context', 'UX Research X UMD'],
  ],
  cover: [m('T8tenCXKluVSCNxnIJ2yBvycmw.jpg'), m('IJYwPa4qI0oYO2wGbVxyxwzlZOM.png')],
  accent: '#8C3F3F',
  accentSoft: '#F0DEDC',
  sections: [
    {
      id: 'overview',
      label: 'Overview',
      blocks: [
        img('UHWtZDl7VBaFhCnX2PHWVnA.webp', { frame: 'bare' }),
        h('Problem'),
        lede('Faculty at the UMD iSchool <mark>manage a range of responsibilities</mark>. Currently, there is <mark>no easy way to track</mark> everything they do, which makes it hard to showcase their contributions during promotions.'),
        cards(
          [
            { img: '8Oj19nTyi3TGaDlAbrh8XbRKFgQ.png', title: 'Teaching' },
            { img: '1XIqZxBq1JxP1ZsNmdwPLEVykA.png', title: 'Service' },
            { img: 'F4gh7ziTdTWaHThSc6cAFiFFr60.png', title: 'Research' },
          ],
          { cols: 3, variant: 'icon' },
        ),
        h('Process'),
        img('lmyeINAE6IwVaP6vGOdUrlN18s.jpg'),
        h('My Contribution'),
        p('During the research phase, <strong>I led three interviews and 2 participatory design sessions</strong> with faculty members to better understand their workload management and promotion planning strategies. During the ideation phase, three of my ideas were modified and developed into our five design visions. I then <strong>advocated </strong>for listing the advantages and disadvantages of each vision, which helped us narrow our ideas down. I solely <strong>led the information architecture design</strong> and was responsible for creating the wireframes. I <strong>independently led the creation of the user flow of the tool and an interactive prototype using Figma Make.</strong>', 'md'),
        h('Design Solution'),
        p('We designed a web-based tool that helps faculty track their workload, understand when to say yes to new commitments, and better balance teaching, service, and research. The platform streamlines previously manual tasks through AI-assisted activity logging and generates an editable, AI-powered year-end report.'),
        feature({ title: 'Workload Balance Dashboard', html: 'Helping faculty better balance their teaching, service, and research responsibilities, and supporting them in making informed decisions about which commitments to take on.', media: ['EvkBPiNQpqaxgYQO9KQBL5Oc0.jpg'] }),
        feature({ title: 'All Activities', html: 'Add activities from the mobile app or web, sync your connected sources, and let AI suggest items to include, then choose what goes into your final report.', media: ['4M9BD5r6146YwptlmP9ZPNgnjo.jpg'], flip: true }),
        feature({ title: 'Editable AI-generated Annual Report', html: 'Automating the time-consuming and repetitive task of creating a year-end report, crucial for evaluations during promotions.', media: ['EYLzkHZoL8LoHHGfMVXXnpsc.jpg'] }),
      ],
    },
    {
      id: 'empathize',
      label: 'Empathize',
      blocks: [
        h('Research Goals'),
        cards(
          [
            { kicker: 'GOAL 1', title: 'Understand how faculty manages their workload and plans for promotions' },
            { kicker: 'GOAL 2', title: 'Identify critical sources of frustration with the current processes' },
            { kicker: 'GOAL 3', title: 'Discover what users expect from a digital platform to help them succeed' },
          ],
          { cols: 3, variant: 'plain' },
        ),
        h('Methods'),
        stats([
          ['8', 'in-depth faculty interviews'],
          ['5', 'participatory design sessions'],
          ['1', 'identity model + journey map'],
        ]),
        h('Interviews'),
        lede('We conducted <mark>semi-structured interviews with 8 faculty members</mark> to understand their routines, delegation strategies, goals, and tools for promotion planning.'),
        split(
          [
            p('We <strong>structured our contextual interview guide around four major themes:</strong> <br><br>a. Daily Tasks<br>b. Tools Used to Manage Workload<br>c. Personal and Professional Goals<br>d. Documentation &amp; Promotion Preparation<br><br>Each section had <strong>open-ended questions</strong> <strong>and optional observational prompts</strong>, such as reviewing planners or calendars, observing workspace setups, or discussing templates used in promotions. These helped us gain a deeper understanding of how faculty organize their responsibilities.<br><br><em>On the right: Distribution of interviewed faculty members</em>', 'sm'),
          ],
          [img('sblhX1WvmByXfdiT4knIqM7fRU.jpg')],
          '1.2fr 1fr',
        ),
        cta('See User Interview Guide and Process', 'https://docs.google.com/document/d/1zGLs7Ui7FjtXf-z_ijR2PBEU1HhgdlowjDP3NwF35M8/edit?usp=sharing'),
        h('Participatory Design'),
        h3('Activity 1: Reflecting on the Week'),
        p('Participants <strong>mapped out a typical work week and annotated moments that felt particularly chaotic</strong> or organized. They shared emotional responses to specific tasks and tools, helping us uncover pain points, support gaps, and mismatches between their workflows and current systems.'),
        h3('Activity 2: Designing an Ideal System'),
        p('Participants created <strong>low-fidelity prototypes of a tool they wished existed</strong>. By arranging interface elements and explaining their choices, they articulated what functionalities, forms of recognition, and organisational structures would help them feel in control of their workload.'),
        img('aQryv3F4EswcDaR5tAFCeuNGU.png', { wide: true }),
      ],
    },
    {
      id: 'define',
      label: 'Define',
      blocks: [
        h('Understanding the Data'),
        p('Together as a team, we analysed the data we collected with our Qualitative Research Methods.'),
        gallery(['iBMHn5qPmspfDuv8fP6vt7VFVHQ.png', 'XedUWebLXaneTDTZAFNkGdIWp84.jpg'], { cols: 1, wide: true }),
        cta('See Detailed Affinity Map', 'https://miro.com/app/board/uXjVJGZPkjg=/?share_link_id=608364495380'),
        h('Key Findings'),
        img('XX56l1J495EmmGkWnaCMBqcH688.png', { wide: true }),
        h('User Journey Map'),
        img('iIUYidJuBXIurReX7guC3J0j5Ag.png'),
        h('Walk Walk'),
        p('The Wall Walk generated a wealth of innovative ideas that guided our visioning session. Our Wall Walk surfaced many key insights: a personalized tool can drive continuous self-improvement; need for a tool that can adapt to each user’s broader life context; and tools that effortlessly capture their achievements on the go.'),
        gallery(['GGfB63Xb1Z3iy0joEYLuy88Vidk.jpeg', 'EyGahOxuLSHOmD4RyV8aJ2KZpd8.jpeg', 'pJuumr2TDq9UOLw5zUyt7TWnUt0.jpeg', 'BAigcUUzXxmsWomL9aYKv5s0U.jpeg'], { cols: 2 }),
      ],
    },
    {
      id: 'ideate',
      label: 'Ideate',
      blocks: [
        h('Design Goals'),
        cards(
          [
            { img: 'J6I2NiR9ye7w6gvEWTAMG2hyYE.png', title: 'Decision Clarity', html: 'How might we help faculty decide which tasks to say “yes” to - and when?' },
            { img: 'Lfx4fx1nVaPrC9PoybLb4czBTHk.png', title: 'Balanced Commitments', html: 'How might we help faculty better balance teaching, service, and research?' },
            { img: '5yrgUfYpOPfqAvnKyb5YKyM5JA.png', title: 'Streamlined Updates', html: 'How might we make the CV and Faculty Success update less time-consuming?' },
            { img: '0YXilKZrJeZZKGqmbNs6IBwZ5o.png', title: 'Honouring Personal Life', html: 'How might we make personal life commitments valued in faculty reviews?' },
            { img: '53tjgJAqz0DezHRBvFLbdol8Cs.png', title: 'Peer Learning and Comparison', html: 'How might we foster shared learning?' },
            { img: 'ZnTpkzWDIzl1k12ZZLvo1l6cQRE.png', title: 'Career Growth', html: 'How might we better support faculty in advancing their careers?' },
          ],
          { cols: 3, variant: 'icon' },
        ),
        h('Ideation'),
        lede('We conducted an ideation session and produced <mark>five initial design concepts. </mark>'),
        cards(
          [
            { title: 'Concept 1: Annual Review Task Dashboard', html: 'A single dashboard aggregates teaching, research, and administrative activities drawn from existing tools (Canvas, Outlook, Faculty Success, etc.). At year-end, the professor can export a promotion-ready report.' },
            { title: 'Concept 2: Micro Diary Logger', html: 'A “diary” widget lets faculty jot quick notes about fragmented tasks (advising emails, committee work) throughout the day to make them easier to document for year-end reviews.' },
            { title: 'Concept 3: GenAI Assistant', html: 'An AI side-panel feature on Orbit that pulls data from various platforms used by faculty and drafts evidence statements, structures accomplishments, and suggests missing items.' },
            { title: 'Concept 4: Personality-Tuned Home Page', html: 'A configurable landing page adapts to the faculty member’s stated preferences. They can choose to include personal life as an element in the dashboard to discuss during year-end reviews.' },
            { title: 'Concept 5: Peer Discussion Board', html: 'The system gives faculty a lightweight place to share timely, career-relevant content (conferences, teaching hacks, service opportunities) with peers in similar roles.' },
          ],
          { cols: 1, variant: 'numbered' },
        ),
        h('Design Alternatives'),
        p('We began by sketching our five ideas on paper and used AI to generate quick prototypes. Then we evaluated each concept against our design goals and selected the one to take forward.'),
        gallery(['L2rNvBTpjcL8sFrG805usBfPg.png', 'AsmhYZ4yHfi7hGF0yfEI44gXUY.png', 'nEWiq0mcXzcoXwQIWAaNrTXvA4.png', 'tmypcLaZrlWiXDWV5IsQHRdIIs0.png'], { cols: 4 }),
        concept(
          'Concept 1: Annual Review Task Dashboard',
          ['Eh2EXOFWBTgTdHjWDMkZFfsPA.jpg', 'LVlCaT4vGgmI8bLkF2d377PWmw.jpg'],
          [
            'At the beginning of the semester, Maria sets her ideal target balance (40% research, 40% teaching, 20% service) as her decision anchor.',
            'She opens Orbit at any time of the semester to view her balance distribution so she can keep teaching, research, and service in balance.',
          ],
          [
            '+ The balance view helps faculty decide which tasks to say yes to and when.',
            '+ Logged activities are already organized, so year-end reviews and promotion documents are faster.',
            '- Manual input of information can become tedious for faculty.',
            '- The system depends on faculty adding items weekly/ biweekly, so nothing gets forgotten.',
          ],
        ),
        concept(
          'Concept 2: Micro Diary Logger',
          ['34zvVOLJJnfshfSOljrVF0VDwg.jpg', 'Sdi9fpuOtTfiQvOQArynv2SXDg.jpg', 'YzCRzNFsLxivDz0SfvWzny8I8Hc.jpg'],
          [
            'Maria opens Orbit Diary, a phone companion to the faculty workload web tool.',
            'She records her voice to add a new note, and tags it as teaching, service, or research.',
            'The Daily Review lets her select what to add to her activity log, a log she refers to while compiling her year-end report.',
          ],
          [
            '+ Easier for the faculty to document fragmented work.',
            '+ Smaller contributions can be collected easily at the end of the year and be recognised.',
            '+ Daily logging would reduce the strain on recalling and inputting the data during submission.',
            '- Frequent logging might be inconvenient for some faculty.',
            '- Might add to cognitive load during busy periods.',
          ],
        ),
        concept(
          'Concept 3: GenAI Assistant for FacultySuccess',
          ['zFeHeMhdpCY5I8R8Gg7WuSzEhkQ.jpg', 'IDfakCRKkHGHy1E4iUMx8hV6s.jpg', 'D5vdXTIvmJ5wU1ao09JFBPIxxEA.jpg'],
          [
            'Maria opens the AI Assistant and reviews connected sources (Email, Calendar, Drive, etc).',
            'The scan generates draft evidence statements with badges for Teaching, Research, and Service.',
            'The Suggestions tab lists what’s missing and shows a Structure preview of report completeness.',
          ],
          [
            '+ Integrates into the system that is already very familiar to faculty. So, entirely new learning of a software is not required.',
            '+ Makes it easier for the faculty to document and structure their work',
            "+ Helps in typing out 'evidence' and examples easily",
            '- Some may not be happy with the suggestions provided by AI.',
            '- AI might miss out on some important tasks. How to make sure it is trustworthy and comprehensive?',
          ],
        ),
        concept(
          'Concept 4: Personality-Tuned Home Page',
          ['dmYGKgeYLIofZCmef9ubUCKZ8eY.png', '0KlustOeYmkx23Qcnqh8xoS4GY.png'],
          [
            'The scan generates draft evidence statements with badges for Teaching, Research, and Service.',
            'The Suggestions tab lists what’s missing and shows a Structure preview of report completeness.',
          ],
        ),
        concept(
          'Concept 5: Peer Discussion Board',
          ['G6n17x2LiEnY7faXnSbt4FFxa4.png', 'SyBtpwdn4dwbeZx6CjoP7nobdA.png'],
          [
            'The scan generates draft evidence statements with badges for Teaching, Research, and Service.',
            'The Suggestions tab lists what’s missing and shows a Structure preview of report completeness.',
          ],
        ),
        h('Design Decisions'),
        p('For the final design vision, we prioritized four MVP features:'),
        cards(
          [
            { img: 'HtQY3Cbal8Ws9ZZfEDxvVVfoPU.png', title: 'Workload Dashboard' },
            { img: '5IKDzeOtXwhvsoIW2xjmC8afyOU.png', title: 'Gen-AI for Orbit' },
            { img: 'pwX0muATU08qMAJb30CFsOMnfs0.png', title: 'Diary Log' },
            { img: 'kFBAx3Dn8zVH0jsypgM1r2dfFc.png', title: 'Discussion Board' },
          ],
          { cols: 4, variant: 'icon' },
        ),
        p('We chose these because they most directly meet the core goals of decision clarity, workload balance, faster reporting, and peer learning while remaining <strong>technically feasible to ship in one term</strong>. Each choice <strong>scored high on meeting core design goals, technical feasibility, and privacy. </strong>We explicitly excluded the Personal aspect (personal-life bar) from MVP due to privacy and equity risks: potential admin visibility ambiguity, bias or stigma from sensitive disclosures, and social pressure to share context, none of which are necessary to achieve the core outcomes.'),
        h('Information Architecture'),
        p('I led the creation of the following Information Architecture:'),
        img('rtKR2XPIOtLs0SnLfWllCyBO0.jpg', { wide: true }),
      ],
    },
    {
      id: 'prototype',
      label: 'Prototype',
      blocks: [
        feature({
          n: '01',
          title: 'Workload Balance Dashboard',
          items: ['View workload balance summary and progress bars', 'Filter by day, week, semester, or year', 'Error notifications when the workload goes above the set target', 'Edit Targets'],
          media: ['EvkBPiNQpqaxgYQO9KQBL5Oc0.jpg'],
        }),
        feature({
          n: '02',
          title: 'Target Setting',
          items: ['Set targets for the semester', 'Tailored Recommendations and Tips'],
          media: ['4cDvhWA7JE4bextXrBLRBQdpEA.jpg'],
          flip: true,
        }),
        feature({
          n: '03',
          title: 'All Activities',
          items: ['AI Assistant suggests activities to log based on connected sources', 'Manually add activities via web tool or mobile application', 'Filter to view activities and select which ones to add in the final report'],
          media: ['ZVMS4gWWFcgYSxAXkq84aodtr4.jpg'],
        }),
        feature({
          n: '04',
          title: 'Add Activities to Report',
          items: ['Select key activities to add to the final report'],
          media: ['4M9BD5r6146YwptlmP9ZPNgnjo.jpg'],
          flip: true,
        }),
        feature({
          n: '05',
          title: 'Reports',
          items: ['The AI generated Annual Report based on selected activities', 'Add or remove activities from the "Evidence Library" to tailor the report in real time.'],
          media: ['EYLzkHZoL8LoHHGfMVXXnpsc.jpg'],
        }),
      ],
    },
    {
      id: 'reflection',
      label: 'Reflection',
      blocks: [
        h('Reflection'),
        list([
          "<strong>Participatory design surfaces what interviews can't: </strong>Leading the participatory design sessions was a turning point. Watching faculty map out their chaotic weeks and prototype their ideal tools revealed frustrations they couldn't articulate in interviews alone.",
          "<strong>More ideas means harder decisions, and that's the point:</strong> We generated five distinct design visions, and I pushed for systematically listing the advantages and disadvantages of each. It felt like extra work at first, but that rigor helped us defend our MVP choices with confidence.",
          "<strong>AI prototyping accelerates exploration, not just execution: </strong>Using Figma Make to rapidly prototype our visions let us think through making rather than just sketching ideas. It lowered the cost of exploring directions we ultimately didn't pursue, which paradoxically made us more willing to experiment.",
        ], true),
      ],
    },
  ],
};

export default cs;
