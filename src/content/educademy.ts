import { type CaseStudy, m, h, lede, p, list, img, gallery, stats, cards, feature, tabs } from '../lib/blocks';

const cs: CaseStudy = {
  slug: 'educademy',
  eyebrow: 'Personal Project',
  title: 'Simplifying e-learning for COVID-era',
  metaTitle: 'Simplifying E-learning for COVID-era',
  description: 'Education X Personal Project',
  meta: [
    ['Timeline', 'AUG 2023'],
    ['Context', 'Education X Personal Project'],
  ],
  cover: [m('J07qObGcr5c64oNlhZc7sblQE.png')],
  accent: '#6A55D8',
  accentSoft: '#E6E1FA',
  coverBg: '#bbb3fa',
  coverContain: true,
  sections: [
    {
      id: 'overview',
      label: 'Overview',
      blocks: [
        h('Problem'),
        lede('The COVID-19 pandemic disrupted traditional schooling in India, revealing a lack of structured tools to support digital learning.'),
        stats([
          ['~ 320 M', 'learners and students in India adversely affected by the pandemic'],
          ['&gt; 80%', 'teachers reported facing challenges in teaching online'],
          ['195%', 'increase in the national dropout rate for students in India'],
        ]),
        h('Design Outcome'),
        feature({ title: 'Personalised Dashboards', html: 'Separate dashboards tailored for parents, students, and instructors to address their unique needs.', media: ['so2bh2Z1W0CGtqzMd31ce39P24g.gif'] }),
        feature({ title: 'Real-Time Assignment Tracking', html: 'Allows guardians to monitor student progress and provide support, helping reduce drop-off rates and maintain accountability.', media: ['n8B6UjNXYmQuUj8qsFbQGT75Vdo.gif'], flip: true }),
        feature({ title: 'Live Doubt-Clearing Feature', html: 'A critical need identified in user interviews, this helps students stay engaged and overcome learning barriers.', media: ['so2bh2Z1W0CGtqzMd31ce39P24g.gif'] }),
      ],
    },
    {
      id: 'empathize',
      label: 'Empathize',
      blocks: [
        h('Secondary Research'),
        p('To kick-off the research, I sought answers to initial key questions. What is E-learning? Why is it needed? How is it carried out? Who are the stakeholders involved? What are the key benefits and challenges of E-learning?'),
        img('RlPGi8dBexCCwbkfYyJqLig.jpg', { wide: true }),
        h('Competitive Analysis'),
        img('EnflUwK2tHqWS9f8tbvihmxNiCI.png', { wide: true }),
        p('I began with a competitive analysis to understand existing solutions in the online education space. For this, I analyzed popular apps such as Khan Academy, SeeSaw, KidCoach, and Homeschool Panda.'),
        img('f4jVXJVhm4E8To2iuCZB37BCA.jpg', { caption: 'See Detailed Competitive Analysis' }),
        p('From the analysis, I learned that:'),
        list([
          'There is a need for <strong>a simple app that supports the complexities of e-learning.</strong> Seesaw and Homeschool Panda have complex interfaces. Simpler apps lack the tools needed to manage e-learning.',
          'Existing solutions are not engaging for students.<strong> Most apps fail to make the experience engaging for students. </strong>There is a need for features that promote their active participation.',
          '<strong>The importance of live notifications. </strong>Live notifications ensure tasks and lessons stay on track. They help students and parents avoid procrastination at home.',
        ]),
        h('Interviews'),
        p('I conducted <strong>semi-structured interviews</strong> with teachers, students, and parents at Adarsh Vidhya Bhawan (AVB) Public School, New Delhi, to gain a high-level understanding of their pain points during COVID-19.'),
        gallery(['nncmf0aDfyRTtrUu16t50q7ETQ.jpeg', '7GOICdzY8dHcrCEUh9Jumltudy8.jpeg', 'c7QUHWI535d2YRhYeWXvT1TpMkE.jpeg', 'SsgOhVsFHWXh4MzwkXVXNQXbfd4.jpeg', 'ls0doisVOwAu8WetYy3tBIQrjw.jpeg', 'utuWOArvvGix4UPlu2q0C9H0f8.jpeg'], { cols: 3 }),
        p('From the interviews, I learned that:'),
        cards(
          [
            { title: 'Parents felt underqualified to teach their kids at home' },
            { title: 'Students worried how their doubts will be cleared' },
            { title: 'Teachers struggled with low student engagement' },
          ],
          { cols: 3, variant: 'numbered' },
        ),
        cards(
          [
            { img: 'JG0gllebG6BWvIR6mQCbi6wvO8.png', title: 'Students were largely satisfied with Microsoft Teams' },
            { img: 'zpmUnLauSeryOGhF1X3e0vDz9TE.png', title: "Parents were updated through a parent's alarm app" },
          ],
          { cols: 2, variant: 'icon' },
        ),
        h('Revisiting Competitor Analysis'),
        lede('User interviews revealed Microsoft Teams and School Canvas platforms as significant competitors and warranted further analysis.'),
        img('oOEAJ5v9rudf7Fy0AmwE5gQ4vWo.jpg', { caption: 'See Detailed Competitive Analysis' }),
        p('From the analysis, I learned that:'),
        cards(
          [
            { title: 'Class Channels streamline setup and join', html: 'Class Channels simplify class creation. Integration with PowerPoint and Microsoft tools enhances usability.' },
            { title: 'Engagement Boosters - Breakouts, Whiteboards, Gamification', html: 'Breakout rooms, virtual whiteboards, and gamification features (e.g., reward systems) can enhance motivation.' },
            { title: 'Assignment Tracking for parents', html: 'An assignment-tracking feature would help parents see when their child submits work. Engagement analytics can offer deeper insights.' },
          ],
          { cols: 3, variant: 'plain' },
        ),
      ],
    },
    {
      id: 'define',
      label: 'Define',
      blocks: [
        h('Personas'),
        tabs([
          ['Parent', 'SR92rsFv2mwGtYauUhM7q4zcSRo.png'],
          ['Teacher', 'bEYYaQ2rP0W4LbMDdGab9xD20.png'],
          ['Student', 'tSqWABfYzM3XJmOL7gzxwOEw98.png'],
        ]),
      ],
    },
    {
      id: 'ideate',
      label: 'Ideate',
      blocks: [
        img('j4fkcHZSxtz9sKarh0MRGWViPhA.png', { wide: true }),
        h('User Stories'),
        img('jR7JYhIIKpIWHYVoUe395Pn004M.png'),
        h('MoSCoW Method'),
        img('PYYsZbUL5gcoIfOPWuyuPgIgMMI.png'),
        h('Key Features'),
        img('MUc9Twv4Yw1Rk3YoDkkbfgeMzzw.jpg', { wide: true }),
      ],
    },
    {
      id: 'prototype',
      label: 'Prototype',
      blocks: [
        h('Sketching'),
        p('After defining these core features, I began ideating on paper, starting with the parent dashboard and home-screen. I ensured that live notifications and call scheduling were prominent features to improve communication and keep users accountable.'),
        img('hmlzg7L1Vy0H0jcvjxR2FalwHQ.png'),
        h('Low-Fi Prototypes'),
        p('The design process progressed from initial sketches and paper wireframes to digital wireframes, with multiple iterations leading to a polished final prototype.'),
        p('I began by creating the full user flow for the parent dashboard, focusing on key features like live notifications and performance updates. Once the parent dashboard was finalized, I moved on to designing the student and instructor dashboards to ensure a consistent experience across all stakeholders.'),
        feature({ lede: 'The core feature I refined was the call scheduling feature for parents, making it easy for them to connect with instructors.', media: ['xq6jjMhcBPxaPBxsWQvIzUwjxTg.png'] }),
        h('Final Mockups'),
        gallery(['B5NFx69klzps0NHhxXZVA4uQXw.png', 'fxIJ8TfkoshCTou03ZrJkLpGKk.png', 'UIK9IKjA2htGfz3i3mnqSJa0s8.png'], { cols: 1, wide: true }),
      ],
    },
    {
      id: 'reflection',
      label: 'Reflection',
      blocks: [
        lede('Educademy taught me to turn multi-stakeholder research into clear user stories and high-impact features.'),
        p('The "Educademy" project enhanced my ability to <strong>balance user needs with functional goals</strong>, ensuring the solution aligns with real-world challenges in E-learning. Conducting extensive research, creating personas, and mapping user journeys emphasized the importance of <strong>understanding diverse stakeholders.</strong><br><br>The project taught me the value of leveraging user stories to identify and prioritize features effectively. By stepping into the users’ perspectives, I was able to clearly define their needs and objectives, which helped guide the design process. Using the MoSCoW method, I classified features into categories, ensuring a <strong>strategic approach to resource allocation and feature implementation.</strong> This process honed my ability to focus on high-impact features first, balancing user needs with project constraints.'),
      ],
    },
  ],
};

export default cs;
