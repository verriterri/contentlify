export interface VideoSeriesTemplate {
  id: string;
  name: string;
  description: string;
  structure: {
    episodeFormat: string;
    lessonStructure: string;
    progressionStyle: string;
  };
  content: {
    introStyle: string;
    outroStyle: string;
    callToAction: string;
    resourceInclusion: string;
  };
  organization: {
    seriesLength: string;
    episodeLength: string;
    moduleGrouping: string;
  };
  features: string[];
}

export const VIDEO_SERIES_TEMPLATES: VideoSeriesTemplate[] = [
  {
    id: 'structured-course',
    name: 'Structured Course',
    description: 'Multi-module course with clear progression. Each module builds on previous concepts.',
    structure: {
      episodeFormat: 'Introduction → Main Content → Practice → Summary',
      lessonStructure: 'Clear learning objectives, step-by-step instruction, examples, and exercises',
      progressionStyle: 'Linear progression with prerequisites',
    },
    content: {
      introStyle: 'Welcome message, course overview, learning objectives',
      outroStyle: 'Key takeaways, next lesson preview, homework/action items',
      callToAction: 'Subscribe for updates, join community, download resources',
      resourceInclusion: 'Downloadable worksheets, checklists, and reference materials',
    },
    organization: {
      seriesLength: '8-12 episodes organized into 3-4 modules',
      episodeLength: '10-20 minutes per episode',
      moduleGrouping: 'Related topics grouped into modules with clear themes',
    },
    features: [
      'Clear learning path',
      'Module-based organization',
      'Progressive difficulty',
      'Actionable exercises',
      'Resource downloads',
    ],
  },
  {
    id: 'tutorial-series',
    name: 'Tutorial Series',
    description: 'Step-by-step tutorials with hands-on demonstrations. Practical and actionable.',
    structure: {
      episodeFormat: 'Problem → Solution → Demonstration → Tips',
      lessonStructure: 'Real-world scenarios, live demonstrations, troubleshooting',
      progressionStyle: 'Standalone tutorials that can be watched in any order',
    },
    content: {
      introStyle: 'What you\'ll learn, what you\'ll need, episode overview',
      outroStyle: 'Quick recap, common mistakes to avoid, related tutorials',
      callToAction: 'Try it yourself, share your results, ask questions',
      resourceInclusion: 'Starter files, templates, code snippets, tool recommendations',
    },
    organization: {
      seriesLength: '5-10 focused tutorials',
      episodeLength: '5-15 minutes per tutorial',
      moduleGrouping: 'Optional grouping by topic or skill level',
    },
    features: [
      'Hands-on demonstrations',
      'Practical examples',
      'Troubleshooting tips',
      'Resource downloads',
      'Community engagement',
    ],
  },
  {
    id: 'masterclass',
    name: 'Masterclass',
    description: 'In-depth deep dives into advanced topics. Comprehensive and detailed.',
    structure: {
      episodeFormat: 'Concept Introduction → Deep Dive → Case Studies → Advanced Techniques',
      lessonStructure: 'Theory, real-world applications, advanced strategies, expert insights',
      progressionStyle: 'Comprehensive coverage with optional advanced paths',
    },
    content: {
      introStyle: 'Topic overview, why it matters, what makes this advanced',
      outroStyle: 'Key insights, further reading, advanced resources',
      callToAction: 'Join mastermind, access bonus content, one-on-one coaching',
      resourceInclusion: 'Advanced frameworks, case study analyses, expert interviews',
    },
    organization: {
      seriesLength: '6-10 comprehensive episodes',
      episodeLength: '20-40 minutes per episode',
      moduleGrouping: 'Thematic modules with advanced tracks',
    },
    features: [
      'Advanced content',
      'Expert insights',
      'Case studies',
      'Comprehensive coverage',
      'Bonus resources',
    ],
  },
];

export function getVideoSeriesTemplate(id: string): VideoSeriesTemplate | undefined {
  return VIDEO_SERIES_TEMPLATES.find((t) => t.id === id);
}

export function getDefaultVideoSeriesTemplate(): VideoSeriesTemplate {
  return VIDEO_SERIES_TEMPLATES[0];
}
