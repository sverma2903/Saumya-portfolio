export interface Project {
  id: string;
  slug: string;
  title: string;
  shortProblem: string;
  shortOutcome: string;
  tags: string[];
  methods: string[];
  featured: boolean;
  archived: boolean;
  imageUrl?: string;
  caseStudy: CaseStudy;
}
export interface CaseStudy {
  hero: {
    title: string;
    subtitle: string;
  };
  summary: {
    scope: string;
    evidence: string;
    decisions: string;
    outcomes: string;
  };
  sections: CaseStudySection[];
}
export interface CaseStudySection {
  title: string;
  content: string | string[];
  visual?: {
    type: 'image' | 'chart' | 'gallery';
    data: any;
    alt: string;
  };
}
export const projects: Project[] = [
  {
    id: 'csbs',
    slug: 'csbs',
    title: 'CSBS - NMLS Resource Center',
    shortProblem: 'Clarifying complex licensing workflows for state agencies and financial firms.',
    shortOutcome: 'Delivered 6 end-to-end journey maps and prioritized recommendations to reduce user confusion and support tickets.',
    tags: ['UX Research', 'Product Design', 'GovTech'],
    methods: ['Journey Mapping', 'Data Analysis', 'Stakeholder Interviews', 'Qualitative Coding'],
    featured: true,
    archived: false,
    imageUrl: '/images/projects/csbs.png',
    caseStudy: {
      hero: {
        title: 'Reducing Friction in a Regulated Environment',
        subtitle: 'A deep dive into the NMLS Resource Center to untangle complex user workflows for the Conference of State Bank Supervisors (CSBS).'
      },
      summary: {
        scope: 'Six end-to-end user journey maps across major workflows (Account Creation, MU1, MU2, Financial Statements, Form Payment, Account Management).',
        evidence: '6 call-center agent interviews; analysis of ~2,400 ServiceNow tickets; a random sample of 150 tickets hand-coded to themes (95% confidence); 6 follow-up stakeholder interviews.',
        decisions: 'A set of prioritized fixes, clearer steps, and concrete content/design recommendations tied to the most painful breakpoints.',
        outcomes: 'Three high-leverage recommendations ready for validation, expected reductions in support burden, and a shared mental model for teams via journey maps.'
      },
      sections: [
        {
          title: 'The Challenge: A High-Stakes, Low-Clarity System',
          content: 'The Nationwide Multistate Licensing System (NMLS) is critical infrastructure for financial regulation. However, its resource center was a source of frequent user confusion, leading to high support volume and frustrated users. My task was to identify the most critical pain points and provide evidence-based recommendations.'
        },
        {
          title: 'My Role & Approach',
          content: 'As the lead UX Researcher, I designed and executed a mixed-methods study to diagnose the core issues. I blended qualitative depth from interviews with quantitative rigor from support ticket analysis to build a comprehensive picture of the user experience.'
        },
        {
          title: 'Synthesizing Quantitative and Qualitative Data',
          content: [
            'I began by interviewing six call-center agents to gather anecdotal evidence and form initial hypotheses.',
            'Next, I analyzed a dataset of ~2,400 ServiceNow tickets, performing a thematic analysis on a statistically significant random sample of 150 tickets. This converted unstructured user complaints into structured, quantifiable evidence.',
            'The ticket analysis confirmed several key pain points, particularly around account management and form submissions. With these insights, I conducted follow-up interviews with stakeholders to validate findings and align on problem statements.'
          ],
          visual: {
            type: 'image',
            data: '/images/placeholders/csbs-journeymap.png',
            alt: 'A snapshot of a user journey map, showing key user actions, thoughts, and pain points.'
          }
        },
        {
          title: 'Key Deliverable: Six End-to-End Journey Maps',
          content: 'The primary output was a set of six detailed journey maps, visualizing every step, pain point, and opportunity in core workflows. These maps became a critical tool for building a shared understanding across product, engineering, and support teams.'
        },
        {
          title: 'Recommendations & Next Steps',
          content: 'Based on the research, I delivered three high-priority recommendations with clear rationale and expected impact. These included simplifying content, redesigning key forms, and improving error messaging. The next step is to prototype and validate these changes with usability testing.'
        },
        {
          title: 'What I\'d Test Next',
          content: 'If I were to continue on this project, I would focus on A/B testing the proposed content changes to measure their impact on task completion rates and user satisfaction. I would also explore proactive guidance within the UI to prevent common errors before they occur.'
        }
      ]
    }
  },
  {
    id: 'smart-story',
    slug: 'smart-story',
    title: 'Smart Story Suite - UMD Digital Engagement Lab',
    shortProblem: 'Exploring how content structure affects news comprehension and satisfaction.',
    shortOutcome: 'Designed and tested interactive prototypes, achieving a double-digit lift in usability scores and reduced time-on-task.',
    tags: ['UX Research', 'Prototyping', 'A/B Testing'],
    methods: ['Experiment Design', 'Interactive Prototyping', 'Usability Testing', 'Quantitative Analysis'],
    featured: true,
    archived: false,
    imageUrl: '/images/projects/smart-story.png',
    caseStudy: {
      hero: {
        title: 'Does Smarter Formatting Lead to Smarter Readers?',
        subtitle: 'An experimental approach to improving news engagement by testing how different content structures impact user comprehension and satisfaction.'
      },
      summary: {
        scope: 'Designed and built interactive prototypes of alternate news story formats. Conducted lightweight A/B comparisons and think-aloud sessions.',
        evidence: 'Usability testing sessions with 12 participants, System Usability Scale (SUS) scores, and time-on-task measurements for key information retrieval tasks.',
        decisions: 'The "structured summary" format significantly outperformed the traditional long-form article, leading to a decision to recommend it for further development.',
        outcomes: 'A 15-point increase in average SUS scores (from 65 to 80), a 25% reduction in average time-on-task, and a clear, data-backed recommendation for the product team.'
      },
      sections: [
        {
          title: 'The Hypothesis',
          content: 'We hypothesized that by presenting news content in more structured, scannable formats (e.g., with key takeaways, expandable sections), we could improve both the speed of comprehension and the user\'s subjective satisfaction.'
        },
        {
          title: 'Designing the Experiment',
          content: 'I created two interactive prototypes in Framer: Version A was a traditional, long-form news article. Version B, the "Smart Story," included a scannable summary, collapsible sections, and interactive data visualizations. We then recruited 12 participants and had them perform identical information-finding tasks with both versions.'
        },
        {
          title: 'Quantitative Results',
          content: 'The results were clear. The Smart Story format showed a significant usability lift.',
          visual: {
            type: 'chart',
            data: [
              { name: 'Traditional Article', 'SUS Score': 65, 'Time on Task (s)': 120 },
              { name: 'Smart Story', 'SUS Score': 80, 'Time on Task (s)': 90 },
            ],
            alt: 'Bar chart comparing the traditional article and the Smart Story. The Smart Story has a higher SUS score (80 vs 65) and a lower time on task (90s vs 120s).'
          }
        },
        {
          title: 'Qualitative Insights',
          content: 'During think-aloud sessions, users consistently praised the scannability of the Smart Story. One user noted, "I felt like I understood the key points immediately, and then I could choose where to dive deeper." This highlighted the value of giving users control over their reading experience.'
        },
        {
          title: 'What I\'d Test Next',
          content: 'The next logical step is to test these formats with a wider range of content types (e.g., opinion pieces, investigative reports) and on a larger scale to see if the engagement benefits hold true. I would also explore personalization, allowing users to set their preferred format.'
        }
      ]
    }
  },
  {
    id: 'mumbai-transit',
    slug: 'mumbai-transit',
    title: 'Mumbai Transit Accessibility - IIT Roorkee',
    shortProblem: 'Identifying and addressing accessibility pain points in a major public transit system.',
    shortOutcome: 'Produced over 20 technical visuals for a government handbook, providing clear, inclusive design recommendations grounded in user needs.',
    tags: ['Inclusive Design', 'Visual Communication', 'Public Good'],
    methods: ['Contextual Inquiry', 'Human-Centered Design', 'Technical Illustration'],
    featured: true,
    archived: false,
    imageUrl: '/images/projects/mumbai-transit.png',
    caseStudy: {
      hero: {
        title: 'Designing for Everyone: Improving Mumbai\'s Transit Accessibility',
        subtitle: 'A human-centered look at public transit, focusing on creating a more inclusive experience for riders with diverse needs.'
      },
      summary: {
        scope: 'Identified five recurring pain points for riders with diverse needs, from ticketing to boarding. Developed tangible, inclusive design solutions.',
        evidence: 'Field observations, contextual interviews with riders with disabilities, and analysis of existing infrastructure.',
        decisions: 'Focused on creating precise, easy-to-understand technical visuals that could be directly implemented by transit authorities.',
        outcomes: 'Contributed over 20 technical visuals to a government handbook on public transit accessibility, influencing future design standards.'
      },
      sections: [
        {
          title: 'The Goal: A More Inclusive Journey',
          content: 'Public transit is a lifeline, but for many, it\'s filled with obstacles. Working with the Laboratory of Inclusive Design, my goal was to identify these barriers and propose practical, respectful design solutions for Mumbai\'s transit system.'
        },
        {
          title: 'Five Recurring Pain Points',
          content: [
            '1. **Ticketing:** Complex interfaces and physical barriers at ticket counters.',
            '2. **Wayfinding:** Lack of clear, multi-modal signage (e.g., audio, tactile).',
            '3. **Platform Gaps:** Dangerous gaps between platforms and trains.',
            '4. **Onboard Experience:** Insufficient space for mobility devices and lack of clear announcements.',
            '5. **Information Access:** Difficulty accessing real-time information for trip planning.'
          ]
        },
        {
          title: 'Contribution: Clarity Through Visuals',
          content: 'My primary contribution was creating over twenty technical visuals. These illustrations weren\'t just decorative; they were precise design specifications for things like accessible ticketing machines, tactile paving patterns, and improved grab-bar placement. The goal was to create a visual language that was both empathetic to user needs and practical for engineers and planners to implement.',
          visual: {
            type: 'gallery',
            data: [
                { src: '/images/placeholders/mumbai-1.png', alt: 'Technical illustration of accessible ticketing machine.' },
                { src: '/images/placeholders/mumbai-2.png', alt: 'Illustration of tactile paving patterns for wayfinding.' },
                { src: '/images/placeholders/mumbai-3.png', alt: 'Diagram showing improved grab-bar placement on a train.' }
            ],
            alt: 'A gallery of technical illustrations for transit accessibility.'
          }
        },
        {
          title: 'Impact and Reflection',
          content: 'This project reinforced my belief that good design is inclusive design. By grounding our work in the lived realities of users, we were able to create recommendations that were not just technically sound but also human-centered. Seeing these visuals incorporated into an official handbook was a powerful reminder of design\'s potential for public good.'
        }
      ]
    }
  },
  {
    id: 'educademy',
    slug: 'educademy',
    title: 'Educademy - AI Learning Platform',
    shortProblem: 'Students struggled with generic learning paths and finding relevant course materials.',
    shortOutcome: 'Designed a personalized dashboard and AI recommendation engine, boosting user engagement by 20%.',
    tags: ['UX Design', 'AI', 'EdTech'],
    methods: ['User Interviews', 'Persona Development', 'Wireframing', 'Prototyping'],
    featured: false,
    archived: false,
    imageUrl: '/images/projects/educademy.png',
    caseStudy: {
      hero: {
        title: 'Personalizing Education with AI',
        subtitle: 'A UX design project for Educademy focused on creating a more adaptive and engaging learning experience through a new dashboard and AI-powered recommendations.'
      },
      summary: {
        scope: 'Redesign of the student dashboard and the creation of a new, AI-driven content recommendation engine.',
        evidence: '20 user interviews with students and educators, competitive analysis of 5 leading EdTech platforms, and 3 rounds of iterative prototype testing.',
        decisions: 'Prioritized a modular dashboard design and a "just-in-time" recommendation algorithm based on user feedback, focusing on an MVP for initial launch.',
        outcomes: 'The new design led to a 20% increase in weekly active users and a 15% improvement in course completion rates in post-launch analytics.'
      },
      sections: [
        {
          title: 'The Challenge: One Size Fits None',
          content: 'Educademy\'s platform was powerful but generic. Users reported feeling overwhelmed by the content library and unmotivated by the linear learning paths. The goal was to create a more personal and adaptive experience that catered to individual learning styles and goals.'
        },
        {
          title: 'Research and Discovery',
          content: 'Through interviews, we identified two key user personas: the "Goal-Oriented Go-Getter" who wants a clear path to a specific skill, and the "Curious Explorer" who enjoys discovering new topics. The existing platform served neither well. This insight became the foundation of our design strategy.'
        },
        {
          title: 'Design and Prototyping',
          content: 'I led the design of a new modular dashboard that users could customize. I created low-fidelity wireframes to map out core user flows and then developed high-fidelity interactive prototypes in Figma for usability testing. The feedback from testing was crucial in refining the recommendation logic to be helpful without being intrusive.'
        },
        {
          title: 'What I\'d Test Next',
          content: 'I would love to run a long-term study to measure the impact of the personalized dashboard on learner confidence and skill retention. Additionally, I\'d explore more proactive interventions, such as AI-powered tutors or study schedule suggestions, to further support student success.'
        }
      ]
    }
  },
  {
    id: 'cmu-xhacks',
    slug: 'cmu-xhacks',
    title: 'CMU XHacks 2025',
    shortProblem: 'A hackathon project focused on social innovation.',
    shortOutcome: 'Won First Place & Social Innovation Prize for a novel solution.',
    tags: ['Hackathon', 'Social Innovation'],
    methods: ['Rapid Prototyping', 'Pitching'],
    featured: false,
    archived: true,
    imageUrl: '/images/projects/cmu-xhacks.png',
    caseStudy: {
      hero: { title: '', subtitle: '' },
      summary: { scope: '', evidence: '', decisions: '', outcomes: '' },
      sections: []
    }
  },
  {
    id: 'usabilathon-2025',
    slug: 'usabilathon-2025',
    title: 'Usabilathon 2025 (Transurban)',
    shortProblem: 'A 24-hour design challenge to improve a toll-payment platform.',
    shortOutcome: 'Winning proposal for validated improvements to the user flow.',
    tags: ['Design Challenge', 'UX Design'],
    methods: ['Heuristic Evaluation', 'Wireframing'],
    featured: false,
    archived: true,
    imageUrl: '/images/projects/usabilathon-2025.png',
    caseStudy: {
      hero: { title: '', subtitle: '' },
      summary: { scope: '', evidence: '', decisions: '', outcomes: '' },
      sections: []
    }
  }
];