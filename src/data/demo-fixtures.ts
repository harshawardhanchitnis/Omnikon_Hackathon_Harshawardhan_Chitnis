import type {
  AppSettings,
  AssessmentQuestion,
  Appointment,
  CheckIn,
  ClassroomProfile,
  CommunityPublication,
  CommunityPlanSummary,
  Expert,
  GuidancePlan,
  Invitation,
  InstructionalBlock,
  LessonPlan,
  Notification,
  PlanVersion,
  QuickCheckResult,
  Reflection,
  ShareSnapshot,
  SyncConflict,
  TeachingSession,
  UserProfile,
  Worksheet
} from "@chalkbox/contracts";
import { photosynthesisDemoPlan } from "./photosynthesis-demo";

export const DEMO_TEACHER_ID = "teacher_meera_demo";

export const demoTeacher: UserProfile = {
  id: DEMO_TEACHER_ID,
  role: "teacher",
  fullName: "Meera Patil",
  email: "meera.demo@chalkbox.education",
  schoolName: "Zilla Parishad Primary School, Khed",
  district: "Pune",
  state: "Maharashtra",
  preferredLanguage: "Marathi",
  grades: ["5", "6", "7"],
  subjects: ["Science", "Mathematics", "English"],
  onboardingComplete: true,
  createdAt: "2026-07-28T08:30:00.000Z",
  lastActiveAt: "2026-08-21T06:15:00.000Z"
};

type DemoPlanSeed = Omit<LessonPlan, "classroomBlocks" | "grounding"> &
  Partial<Pick<LessonPlan, "classroomBlocks" | "grounding">>;

const demoPlanSeeds: DemoPlanSeed[] = [
  photosynthesisDemoPlan,
  {
    id: "plan_water_cycle",
    ownerId: DEMO_TEACHER_ID,
    title: "The Water Cycle Around Us",
    subject: "Science",
    grade: "6",
    board: "CBSE/NCERT",
    language: "Bilingual English–Hindi",
    topic: "Water cycle and changes of state",
    durationMinutes: 45,
    classSize: 38,
    availableMaterials: ["Blackboard", "Steel plate", "Cup", "Water", "Chalk"],
    constraints: ["No projector", "Mixed reading levels", "Intermittent electricity"],
    objectives: [
      {
        id: "obj_water_1",
        text: "Sequence evaporation, condensation, precipitation and collection using a labelled cycle.",
        bloomLevel: "understand"
      },
      {
        id: "obj_water_2",
        text: "Connect one local weather observation to a stage of the water cycle.",
        bloomLevel: "apply"
      },
      {
        id: "obj_water_3",
        text: "Explain why water is conserved even though it moves in a cycle.",
        bloomLevel: "analyse"
      }
    ],
    activities: [
      {
        id: "act_water_hook",
        title: "Where did the puddle go?",
        type: "hook",
        durationMinutes: 5,
        teacherSteps: [
          "Draw a puddle before and after sunshine on the board.",
          "Invite three explanations without correcting them yet."
        ],
        studentSteps: ["Think-pair-share a reason the water seems to disappear."],
        materials: ["Blackboard", "Chalk"],
        differentiation: "Allow learners to answer by pointing, speaking, or sketching.",
        offlineAlternative:
          "Use the board drawing and students' lived experiences; no device is required."
      },
      {
        id: "act_water_model",
        title: "Make condensation visible",
        type: "activity",
        durationMinutes: 12,
        teacherSteps: [
          "Place a cool steel plate above a cup of warm water at a safe distance.",
          "Ask learners to observe droplets forming and name the changes they infer.",
          "Keep hot water under teacher control and use warm water if safety is uncertain."
        ],
        studentSteps: [
          "Record an observation using the frame: I noticed ___, so I think ___.",
          "Relate the droplets to cloud formation."
        ],
        materials: ["Steel plate", "Cup", "Warm water"],
        differentiation:
          "Pair emerging readers with a peer and provide the observation sentence frame.",
        offlineAlternative:
          "If water is unavailable, breathe gently on the steel plate to observe condensation."
      },
      {
        id: "act_water_explain",
        title: "Build the cycle together",
        type: "explain",
        durationMinutes: 10,
        teacherSteps: [
          "Draw four empty boxes in a loop and elicit the stage names.",
          "Add sun, arrows and changes of state only after students justify each connection."
        ],
        studentSteps: ["Copy and label the cycle, then explain one arrow to a partner."],
        materials: ["Blackboard", "Notebook"],
        differentiation:
          "Keep a four-word bank visible: evaporation, condensation, precipitation, collection.",
        offlineAlternative: "The collaborative board diagram is the primary activity."
      },
      {
        id: "act_water_practice",
        title: "Human water cycle",
        type: "practice",
        durationMinutes: 10,
        teacherSteps: [
          "Assign groups one stage each and arrange them in a circle.",
          "Call a local scenario; groups show where the water moves next."
        ],
        studentSteps: ["Use gestures and a one-sentence explanation when it is your stage's turn."],
        materials: ["Four scrap-paper labels"],
        differentiation:
          "Offer picture symbols for stage labels and a challenge question for early finishers.",
        offlineAlternative: "Use spoken stage names if paper is unavailable."
      },
      {
        id: "act_water_exit",
        title: "One-minute exit check",
        type: "assessment",
        durationMinutes: 8,
        teacherSteps: [
          "Ask students to sketch the cycle and circle the stage seen on a cold bottle.",
          "Scan responses into three piles: secure, developing, revisit."
        ],
        studentSteps: ["Submit a labelled sketch plus one conservation reason."],
        materials: ["Notebook", "Pencil"],
        differentiation: "Accept arrows and key words instead of full sentences.",
        offlineAlternative: "Conduct an oral exit circle if notebooks are unavailable."
      }
    ],
    assessments: [
      {
        id: "assess_water_1",
        prompt: "Why do droplets appear outside a cold metal cup?",
        type: "oral",
        answerGuide:
          "Water vapour in the surrounding air cools and condenses into liquid droplets.",
        checksObjectiveIds: ["obj_water_1", "obj_water_2"]
      },
      {
        id: "assess_water_2",
        prompt:
          "Draw the cycle and add one reason your community should avoid wasting clean water.",
        type: "exit-ticket",
        answerGuide:
          "All four stages should be sequenced; the reason should distinguish cycling water from usable clean water.",
        checksObjectiveIds: ["obj_water_1", "obj_water_3"]
      }
    ],
    homework:
      "Observe one sign of evaporation or condensation at home and describe it in two lines or a drawing.",
    teacherNotes:
      "Keep the demonstration teacher-led. Ask before telling, and use the local monsoon as the bridge to prior knowledge.",
    status: "ready",
    qualityScore: 100,
    estimatedPrepMinutes: 9,
    sources: [
      {
        id: "src_cbse_science_6",
        title: "CBSE Science learning outcomes and grade taxonomy",
        publisher: "Central Board of Secondary Education",
        url: "https://cbseacademic.nic.in/",
        license: "Reference metadata; original ChalkBox lesson wording",
        attribution:
          "Aligned to public CBSE grade and subject expectations. Lesson text is original ChalkBox content.",
        grade: "6",
        subject: "Science",
        chapter: "Water and changes of state"
      }
    ],
    generationMode: "prepared-demo",
    aiDisclosure:
      "Prepared demonstration plan using the same validated structure as AI-generated plans. Verify against your current syllabus before teaching.",
    createdAt: "2026-08-20T07:30:00.000Z",
    updatedAt: "2026-08-21T05:40:00.000Z",
    isPublic: false,
    version: 3
  },
  {
    id: "plan_fractions_market",
    ownerId: DEMO_TEACHER_ID,
    title: "Fractions in the Local Market",
    subject: "Mathematics",
    grade: "5",
    board: "CBSE/NCERT",
    language: "English",
    topic: "Comparing like and unlike fractions",
    durationMinutes: 40,
    classSize: 36,
    availableMaterials: ["Blackboard", "Paper circles", "Bottle caps"],
    constraints: ["Limited photocopies"],
    objectives: [
      {
        id: "obj_frac_1",
        text: "Represent a fraction as equal parts of a whole.",
        bloomLevel: "understand"
      },
      {
        id: "obj_frac_2",
        text: "Compare two fractions using a model or common denominator.",
        bloomLevel: "apply"
      }
    ],
    activities: [
      {
        id: "act_frac_1",
        title: "Share the roti",
        type: "hook",
        durationMinutes: 5,
        teacherSteps: ["Fold a paper circle into halves and quarters."],
        studentSteps: ["Predict which share is larger and explain why."],
        materials: ["Paper circle"],
        offlineAlternative: "Draw circles on the board."
      },
      {
        id: "act_frac_2",
        title: "Market fraction stations",
        type: "activity",
        durationMinutes: 15,
        teacherSteps: ["Give each group caps and fraction challenge cards written on scrap paper."],
        studentSteps: ["Model, compare, and justify each pair."],
        materials: ["Bottle caps", "Scrap paper"],
        offlineAlternative: "Use stones or tally marks."
      },
      {
        id: "act_frac_3",
        title: "Two comparison strategies",
        type: "explain",
        durationMinutes: 10,
        teacherSteps: ["Connect models to common denominators on the board."],
        studentSteps: ["Complete two guided examples."],
        materials: ["Blackboard"],
        offlineAlternative: "Board-led worked examples."
      },
      {
        id: "act_frac_4",
        title: "Show your proof",
        type: "assessment",
        durationMinutes: 10,
        teacherSteps: ["Display three comparisons and collect explanations."],
        studentSteps: ["Solve one using a model and one using numbers."],
        materials: ["Notebook"],
        offlineAlternative: "Answer orally in pairs."
      }
    ],
    assessments: [
      {
        id: "assess_frac_1",
        prompt: "Which is greater: 3/4 or 2/3? Show how you know.",
        type: "written",
        answerGuide:
          "3/4 is greater; accept accurate visual models or common denominators 9/12 and 8/12.",
        checksObjectiveIds: ["obj_frac_2"]
      },
      {
        id: "assess_frac_2",
        prompt: "Model 2/5 using five equal objects.",
        type: "observation",
        answerGuide: "Two of five equal objects are selected.",
        checksObjectiveIds: ["obj_frac_1"]
      }
    ],
    homework: "Find two fractions used at home and compare them.",
    teacherNotes: "Watch for students comparing denominators as whole numbers.",
    status: "taught",
    qualityScore: 100,
    estimatedPrepMinutes: 12,
    sources: [
      {
        id: "src_cbse_math_5",
        title: "CBSE Mathematics grade taxonomy",
        publisher: "Central Board of Secondary Education",
        url: "https://cbseacademic.nic.in/",
        license: "Reference metadata; original ChalkBox lesson wording",
        attribution: "Original activity sequence aligned to public CBSE grade-level taxonomy.",
        grade: "5",
        subject: "Mathematics"
      }
    ],
    generationMode: "prepared-demo",
    aiDisclosure: "Prepared demonstration plan. Teacher review remains required.",
    createdAt: "2026-08-17T09:00:00.000Z",
    updatedAt: "2026-08-18T10:10:00.000Z",
    taughtAt: "2026-08-18T06:30:00.000Z",
    isPublic: true,
    publicSlug: "fractions-local-market-demo",
    version: 4
  },
  {
    id: "plan_story_perspective",
    ownerId: DEMO_TEACHER_ID,
    title: "A Story from Another View",
    subject: "English",
    grade: "7",
    board: "CBSE/NCERT",
    language: "English",
    topic: "Point of view in narrative writing",
    durationMinutes: 45,
    classSize: 42,
    availableMaterials: ["Blackboard", "Notebook"],
    constraints: ["Mixed reading levels", "No projector"],
    objectives: [
      {
        id: "obj_story_1",
        text: "Identify first-person and third-person narrative clues.",
        bloomLevel: "understand"
      },
      {
        id: "obj_story_2",
        text: "Rewrite a short event from a different point of view.",
        bloomLevel: "create"
      }
    ],
    activities: [
      {
        id: "act_story_1",
        title: "Who is telling us?",
        type: "hook",
        durationMinutes: 7,
        teacherSteps: ["Read two original three-line mini-stories with different narrators."],
        studentSteps: ["Signal first or third person and cite a clue."],
        materials: ["Blackboard"],
        offlineAlternative: "Read aloud twice."
      },
      {
        id: "act_story_2",
        title: "Narrator detective",
        type: "practice",
        durationMinutes: 13,
        teacherSteps: ["Write short original excerpts on the board."],
        studentSteps: ["Underline pronoun clues and identify the narrator."],
        materials: ["Notebook"],
        offlineAlternative: "Students copy only the key sentence."
      },
      {
        id: "act_story_3",
        title: "Switch the camera",
        type: "activity",
        durationMinutes: 15,
        teacherSteps: [
          "Model changing one event from I to she, including what information changes."
        ],
        studentSteps: ["Rewrite a playground event from another character's perspective."],
        materials: ["Notebook"],
        offlineAlternative: "Oral retelling in pairs is acceptable."
      },
      {
        id: "act_story_4",
        title: "Read, name, justify",
        type: "assessment",
        durationMinutes: 10,
        teacherSteps: ["Invite two readings and ask peers to identify the point of view."],
        studentSteps: ["Submit a four-sentence rewrite with narrator clues circled."],
        materials: ["Notebook"],
        offlineAlternative: "Peer oral response."
      }
    ],
    assessments: [
      {
        id: "assess_story_1",
        prompt: "Name the point of view and cite one narrator clue.",
        type: "oral",
        answerGuide: "Correct viewpoint plus an appropriate pronoun or narrator-access clue.",
        checksObjectiveIds: ["obj_story_1"]
      },
      {
        id: "assess_story_2",
        prompt: "Rewrite the event from a second character's perspective.",
        type: "written",
        answerGuide:
          "Viewpoint remains consistent and includes information available to the new narrator.",
        checksObjectiveIds: ["obj_story_2"]
      }
    ],
    homework: "Retell a familiar family story from another person's viewpoint.",
    teacherNotes: "Use only teacher-created micro-texts during the demonstration.",
    status: "draft",
    qualityScore: 80,
    estimatedPrepMinutes: 10,
    sources: [
      {
        id: "src_cbse_english_7",
        title: "CBSE English learning outcomes taxonomy",
        publisher: "Central Board of Secondary Education",
        url: "https://cbseacademic.nic.in/",
        license: "Reference metadata; original ChalkBox lesson wording",
        attribution:
          "Original ChalkBox examples aligned to public CBSE language-learning outcomes.",
        grade: "7",
        subject: "English"
      }
    ],
    generationMode: "manual",
    aiDisclosure: "Teacher-authored draft with ChalkBox structure support.",
    createdAt: "2026-08-21T03:30:00.000Z",
    updatedAt: "2026-08-21T03:45:00.000Z",
    isPublic: false,
    version: 1
  }
];

function deriveClassroomBlocks(plan: DemoPlanSeed): InstructionalBlock[] {
  const grades = plan.additionalGrade ? [plan.grade, plan.additionalGrade] : [plan.grade];
  return plan.activities.map((activity) => {
    const common = {
      id: `block_${activity.id}`,
      title: activity.title,
      purpose: `Teach ${activity.title.toLowerCase()} as one focused classroom step.`,
      durationMinutes: activity.durationMinutes,
      teacherCue: activity.teacherSteps.join(" "),
      learnerContent: activity.studentSteps,
      resourceAlternative: activity.offlineAlternative ?? "Use the spoken and board-based version.",
      differentiation: {
        support: activity.differentiation ?? "Offer a spoken, drawn or modelled response.",
        extension: "Ask learners to justify one connection using evidence."
      },
      language: plan.language,
      gradeTarget: { grades, label: `Class ${grades.join(" + ")} · Whole class` },
      accessibilitySupport: ["Read key instructions aloud"],
      revealStages: [],
      sourceIds: plan.sources.map((source) => source.id)
    };
    if (activity.type === "hook") {
      return {
        ...common,
        type: "hook",
        prompt: activity.studentSteps[0] ?? activity.title,
        expectedResponse: activity.teacherSteps[0]
      } satisfies InstructionalBlock;
    }
    if (activity.type === "assessment") {
      return {
        ...common,
        type: "quick-check",
        checkMode: "understanding",
        question: activity.studentSteps[0] ?? activity.title,
        options: [],
        answer: "Use the linked assessment guide.",
        explanation: activity.teacherSteps.join(" "),
        responseGuidance: [
          {
            maximumCorrectPercent: 70,
            message: "Pause, model the reasoning once more and collect another class signal."
          }
        ]
      } satisfies InstructionalBlock;
    }
    return {
      ...common,
      type:
        activity.type === "closure"
          ? "recap"
          : activity.type === "practice"
            ? "guided-practice"
            : activity.type === "activity"
              ? "demonstration"
              : "explanation",
      teacherExplanation: activity.teacherSteps.join(" "),
      expectedReasoning: activity.studentSteps.join(" ")
    } satisfies InstructionalBlock;
  });
}

export const demoPlans: LessonPlan[] = demoPlanSeeds.map((plan) => ({
  ...plan,
  classroomBlocks: plan.classroomBlocks ?? deriveClassroomBlocks(plan),
  grounding:
    plan.grounding ??
    (plan.sources.length
      ? {
          status: "partially-grounded" as const,
          verifiedSourceIds: plan.sources.map((source) => source.id),
          note: "Source metadata is available; the original ChalkBox lesson wording still requires teacher syllabus review."
        }
      : {
          status: "ungrounded" as const,
          verifiedSourceIds: [],
          note: "AI-generated without verified curriculum grounding."
        })
}));

function requiredDemoPlan(id: string) {
  const plan = demoPlans.find((item) => item.id === id);
  if (!plan) throw new Error(`Missing demo plan: ${id}`);
  return plan;
}

export const demoSessions: TeachingSession[] = [
  {
    id: "session_fractions_1",
    planId: "plan_fractions_market",
    ownerId: DEMO_TEACHER_ID,
    startedAt: "2026-08-18T06:30:00.000Z",
    completedAt: "2026-08-18T07:12:00.000Z",
    currentActivityIndex: 3,
    currentBlockIndex: 3,
    revealState: {},
    skippedBlockIds: [],
    elapsedSeconds: 2520,
    paused: false,
    attendanceCount: 34,
    quickNotes: ["Bottle-cap model worked well", "Revisit unlike denominators with six learners"],
    version: 3,
    updatedAt: "2026-08-18T07:12:00.000Z"
  }
];

export const demoCheckIns: CheckIn[] = [
  {
    id: "checkin_fractions_1",
    planId: "plan_fractions_market",
    sessionId: "session_fractions_1",
    ownerId: DEMO_TEACHER_ID,
    understanding: 4,
    engagement: 5,
    pace: "right",
    evidence: "Most pairs justified 3/4 vs 2/3; six learners need another concrete model.",
    createdAt: "2026-08-18T07:14:00.000Z"
  }
];

export const demoReflections: Reflection[] = [
  {
    id: "reflection_fractions_1",
    planId: "plan_fractions_market",
    ownerId: DEMO_TEACHER_ID,
    wentWell: "Groups used bottle caps confidently and challenged one another's explanations.",
    improveNextTime:
      "Keep a support station for students who still treat a larger denominator as a larger fraction.",
    studentOutcome: "mostly",
    rating: 4,
    nextStep: "Start tomorrow with two unlike-fraction comparisons using the same caps.",
    createdAt: "2026-08-18T07:20:00.000Z",
    version: 1,
    updatedAt: "2026-08-18T07:20:00.000Z"
  }
];

export const demoClassroomProfiles: ClassroomProfile[] = [
  {
    id: "classroom_6a",
    ownerId: DEMO_TEACHER_ID,
    name: "Class 6A",
    grade: "6",
    learnerCount: 38,
    board: "CBSE/NCERT",
    language: "Bilingual English–Hindi",
    internetAvailability: "intermittent",
    projectorAvailable: false,
    chalkboardAvailable: true,
    commonMaterials: ["Blackboard", "Chalk", "Scrap paper", "Local objects"],
    mixedAbility: true,
    readingSupportNeeds: ["Word bank", "Peer reading"],
    accessibilityConsiderations: ["Large board text", "Spoken and visual directions"],
    typicalDurationMinutes: 45,
    archived: false,
    createdAt: "2026-08-01T08:00:00.000Z",
    updatedAt: "2026-08-20T08:00:00.000Z"
  },
  {
    id: "classroom_6_7_combined",
    ownerId: DEMO_TEACHER_ID,
    name: "Classes 6 + 7 Combined",
    grade: "6",
    additionalGrade: "7",
    learnerCount: 44,
    board: "State Board",
    language: "Bilingual English–Hindi",
    internetAvailability: "none",
    projectorAvailable: false,
    chalkboardAvailable: true,
    commonMaterials: ["Blackboard", "Chalk", "Notebooks", "Bottle caps"],
    mixedAbility: true,
    readingSupportNeeds: ["Two reading levels", "Pair explanation"],
    accessibilityConsiderations: ["Front-row seating", "Movement breaks"],
    typicalDurationMinutes: 50,
    archived: false,
    createdAt: "2026-08-03T08:00:00.000Z",
    updatedAt: "2026-08-19T08:00:00.000Z"
  }
];

const questionSource = requiredDemoPlan("plan_water_cycle").sources[0]!;

export const demoAssessmentQuestions: AssessmentQuestion[] = [
  {
    id: "question_water_condensation",
    board: "CBSE/NCERT",
    grade: "6",
    subject: "Science",
    bookOrUnit: "Matter and weather",
    chapter: "Water",
    topic: "Condensation",
    prompt: "Why do water droplets form on the outside of a cold steel cup?",
    type: "short-answer",
    purpose: "formative",
    difficulty: "core",
    language: "English",
    marks: 2,
    answer: "Water vapour in the surrounding air cools and condenses on the cup.",
    explanation: "The water does not leak through the cup; it comes from vapour in the air.",
    misconceptionTarget: "Droplets leaked through the cup",
    provenance: "chalkbox-authored",
    reviewState: "curator-approved",
    source: questionSource,
    attribution: "Original ChalkBox item aligned to the cited curriculum taxonomy.",
    createdAt: "2026-08-12T08:00:00.000Z",
    updatedAt: "2026-08-20T08:00:00.000Z"
  },
  {
    id: "question_water_sequence",
    board: "CBSE/NCERT",
    grade: "6",
    subject: "Science",
    bookOrUnit: "Matter and weather",
    chapter: "Water",
    topic: "Water cycle",
    prompt: "Which sequence correctly shows water moving from a lake to rain?",
    type: "mcq",
    purpose: "exit-ticket",
    difficulty: "foundation",
    language: "English",
    marks: 1,
    options: [
      "Evaporation → condensation → precipitation",
      "Condensation → precipitation → evaporation",
      "Precipitation → collection → condensation",
      "Collection → precipitation → evaporation"
    ],
    answer: "Evaporation → condensation → precipitation",
    explanation: "Sunlight drives evaporation; cooling vapour condenses before precipitation.",
    provenance: "chalkbox-authored",
    reviewState: "curator-approved",
    source: questionSource,
    attribution: "Original ChalkBox item aligned to the cited curriculum taxonomy.",
    createdAt: "2026-08-12T08:05:00.000Z",
    updatedAt: "2026-08-20T08:05:00.000Z"
  },
  {
    id: "question_water_application",
    board: "CBSE/NCERT",
    grade: "6",
    subject: "Science",
    bookOrUnit: "Matter and weather",
    chapter: "Water",
    topic: "Water conservation",
    prompt:
      "A village receives heavy monsoon rain but has water shortages in May. Suggest two actions using your understanding of the water cycle.",
    type: "long-answer",
    purpose: "application",
    difficulty: "challenge",
    language: "Bilingual English–Hindi",
    marks: 4,
    answer:
      "Answers may include rainwater harvesting, covered storage, groundwater recharge, and reducing avoidable loss, each linked to collection or evaporation.",
    provenance: "teacher-authored",
    reviewState: "teacher-reviewed",
    source: questionSource,
    attribution: "Teacher-authored demonstration item; curriculum source used only for alignment.",
    createdAt: "2026-08-18T07:30:00.000Z",
    updatedAt: "2026-08-18T07:30:00.000Z"
  },
  {
    id: "question_fraction_compare",
    board: "CBSE/NCERT",
    grade: "5",
    subject: "Mathematics",
    bookOrUnit: "Numbers",
    chapter: "Fractions",
    topic: "Comparing fractions",
    prompt: "Which is greater: 3/4 or 2/3? Show one model or calculation.",
    type: "short-answer",
    purpose: "formative",
    difficulty: "core",
    language: "English",
    marks: 2,
    answer: "3/4 is greater; 3/4 = 9/12 and 2/3 = 8/12.",
    provenance: "teacher-authored",
    reviewState: "teacher-reviewed",
    source: requiredDemoPlan("plan_fractions_market").sources[0]!,
    attribution: "Teacher-authored item aligned to public grade taxonomy.",
    createdAt: "2026-08-17T08:00:00.000Z",
    updatedAt: "2026-08-18T08:00:00.000Z"
  },
  {
    id: "question_pov_clue",
    board: "CBSE/NCERT",
    grade: "7",
    subject: "English",
    bookOrUnit: "Narrative writing",
    chapter: "Point of view",
    topic: "Narrator clues",
    prompt:
      "True or false: the pronoun ‘I’ always signals a first-person narrator. Explain your choice.",
    type: "true-false",
    purpose: "diagnostic",
    difficulty: "core",
    language: "English",
    marks: 2,
    answer:
      "True when ‘I’ is used by the narrator to tell their own experience; a quoted speaker does not by itself set the narration viewpoint.",
    provenance: "chalkbox-authored",
    reviewState: "curator-approved",
    source: requiredDemoPlan("plan_story_perspective").sources[0]!,
    attribution: "Original ChalkBox item aligned to public language outcomes.",
    createdAt: "2026-08-20T08:00:00.000Z",
    updatedAt: "2026-08-20T08:00:00.000Z"
  }
];

export const demoWorksheets: Worksheet[] = [
  {
    id: "worksheet_water_cycle",
    ownerId: DEMO_TEACHER_ID,
    title: "Water Cycle — 10 Minute Check",
    instructions: "Answer every question. Use arrows and labels where a diagram helps.",
    grade: "6",
    subject: "Science",
    chapter: "Water",
    language: "Bilingual English–Hindi",
    includeAnswers: false,
    items: demoAssessmentQuestions.slice(0, 3).map((question, index) => ({
      id: `worksheet_item_${index + 1}`,
      questionId: question.id,
      questionSnapshot: structuredClone(question),
      order: index,
      marks: question.marks
    })),
    status: "ready",
    createdAt: "2026-08-20T09:00:00.000Z",
    updatedAt: "2026-08-20T09:15:00.000Z"
  }
];

export const demoPlanVersions: PlanVersion[] = demoPlans.map((plan) => ({
  id: `version_${plan.id}_${plan.version}`,
  planId: plan.id,
  ownerId: plan.ownerId,
  versionNumber: plan.version,
  reason: plan.generationMode === "manual" ? "manual-checkpoint" : "generated",
  label: plan.generationMode === "manual" ? "Working draft" : "Classroom-ready baseline",
  snapshot: structuredClone(plan),
  createdAt: plan.updatedAt
}));

export const demoShares: ShareSnapshot[] = [
  {
    id: "share_fractions_demo",
    tokenHash: "iPG-M97wXEP8Htkv-OANLZkx8HjYz7HXCRMr9IjEfgA",
    rawToken: "fractions-local-market-demo",
    planId: "plan_fractions_market",
    planVersionId: "version_plan_fractions_market_4",
    ownerId: DEMO_TEACHER_ID,
    snapshot: structuredClone(requiredDemoPlan("plan_fractions_market")),
    createdAt: "2026-08-18T10:11:00.000Z"
  }
];

export const demoPublications: CommunityPublication[] = [
  {
    id: "publication_fractions",
    ownerId: DEMO_TEACHER_ID,
    planId: "plan_fractions_market",
    planVersionId: "version_plan_fractions_market_4",
    snapshot: structuredClone(requiredDemoPlan("plan_fractions_market")),
    authorName: "Meera Patil",
    authorSchool: "Zilla Parishad Primary School, Khed",
    status: "approved",
    submittedAt: "2026-08-18T10:12:00.000Z",
    reviewedAt: "2026-08-19T08:30:00.000Z",
    reviewedBy: "admin_demo",
    saves: 28,
    adaptations: 7,
    reports: 0,
    createdAt: "2026-08-18T10:12:00.000Z",
    updatedAt: "2026-08-19T08:30:00.000Z"
  },
  {
    id: "publication_water_lab",
    ownerId: "teacher_ananya_demo",
    planId: "community_plan_water_lab",
    planVersionId: "community_version_water_lab_2",
    snapshot: {
      ...structuredClone(requiredDemoPlan("plan_water_cycle")),
      id: "community_plan_water_lab",
      ownerId: "teacher_ananya_demo",
      title: "Monsoon Water Cycle Lab",
      teacherNotes: "",
      generationMode: "manual",
      aiDisclosure: "Teacher-authored community lesson. Adapted copies retain attribution.",
      isPublic: true,
      version: 2
    },
    authorName: "Ananya Rao",
    authorSchool: "Government High School, Mysuru",
    status: "approved",
    submittedAt: "2026-08-16T08:30:00.000Z",
    reviewedAt: "2026-08-17T08:30:00.000Z",
    reviewedBy: "admin_demo",
    saves: 184,
    adaptations: 41,
    reports: 0,
    createdAt: "2026-08-16T08:30:00.000Z",
    updatedAt: "2026-08-17T08:30:00.000Z"
  },
  {
    id: "publication_story_voice",
    ownerId: "teacher_sana_demo",
    planId: "community_plan_story_voice",
    planVersionId: "community_version_story_voice_3",
    snapshot: {
      ...structuredClone(requiredDemoPlan("plan_story_perspective")),
      id: "community_plan_story_voice",
      ownerId: "teacher_sana_demo",
      title: "Switch the Story Camera",
      teacherNotes: "",
      status: "ready",
      qualityScore: 94,
      generationMode: "manual",
      aiDisclosure: "Teacher-authored community lesson. Adapted copies retain attribution.",
      isPublic: true,
      version: 3
    },
    authorName: "Sana Sheikh",
    authorSchool: "Municipal School, Nagpur",
    status: "approved",
    submittedAt: "2026-08-14T10:00:00.000Z",
    reviewedAt: "2026-08-15T09:00:00.000Z",
    reviewedBy: "admin_demo",
    saves: 97,
    adaptations: 18,
    reports: 0,
    createdAt: "2026-08-14T10:00:00.000Z",
    updatedAt: "2026-08-15T09:00:00.000Z"
  },
  {
    id: "publication_story_pending",
    ownerId: DEMO_TEACHER_ID,
    planId: "plan_story_perspective",
    planVersionId: "version_plan_story_perspective_1",
    snapshot: {
      ...structuredClone(requiredDemoPlan("plan_story_perspective")),
      teacherNotes: "",
      isPublic: true
    },
    authorName: "Meera Patil",
    authorSchool: "Zilla Parishad Primary School, Khed",
    status: "submitted",
    submittedAt: "2026-08-21T06:10:00.000Z",
    saves: 0,
    adaptations: 0,
    reports: 0,
    createdAt: "2026-08-21T06:10:00.000Z",
    updatedAt: "2026-08-21T06:10:00.000Z"
  }
];

export const demoQuickChecks: QuickCheckResult[] = [
  {
    id: "quickcheck_fractions_1",
    planId: "plan_fractions_market",
    sessionId: "session_fractions_1",
    ownerId: DEMO_TEACHER_ID,
    activityId: "act_frac_4",
    prompt: "Which is greater: 3/4 or 2/3?",
    mode: "mcq",
    counts: { A: 8, B: 20, C: 4, D: 2 },
    correctKey: "B",
    note: "Re-model unlike denominators with six learners.",
    createdAt: "2026-08-18T07:08:00.000Z"
  }
];

export const demoSyncConflicts: SyncConflict[] = [];

export const communityPlans: CommunityPlanSummary[] = [
  {
    id: "community_shadow_clock",
    sourcePlanId: "community_source_shadow",
    authorName: "Ananya Rao",
    authorSchool: "Government High School, Mysuru",
    title: "Make a Shadow Clock",
    subject: "Science",
    grade: "6",
    topic: "Light, shadows and time",
    durationMinutes: 45,
    qualityScore: 96,
    saves: 184,
    adaptations: 41,
    tags: ["outdoor", "zero-cost", "inquiry"],
    publishedAt: "2026-08-16T08:30:00.000Z"
  },
  {
    id: "community_area_floor",
    sourcePlanId: "community_source_area",
    authorName: "Rakesh Kumar",
    authorSchool: "Middle School, Gaya",
    title: "Area with Floor Tiles",
    subject: "Mathematics",
    grade: "5",
    topic: "Area and square units",
    durationMinutes: 40,
    qualityScore: 92,
    saves: 132,
    adaptations: 29,
    tags: ["hands-on", "no-print", "group-work"],
    publishedAt: "2026-08-14T05:20:00.000Z"
  },
  {
    id: "community_local_news",
    sourcePlanId: "community_source_news",
    authorName: "Sana Sheikh",
    authorSchool: "Municipal School, Nagpur",
    title: "Our Two-Minute Newsroom",
    subject: "English",
    grade: "7",
    topic: "Speaking with clarity and evidence",
    durationMinutes: 50,
    qualityScore: 94,
    saves: 97,
    adaptations: 18,
    tags: ["speaking", "local-context", "peer-feedback"],
    publishedAt: "2026-08-12T10:00:00.000Z"
  }
];

export const demoExperts: Expert[] = [
  {
    id: "expert_nandita",
    name: "Dr. Nandita Joshi",
    title: "Science pedagogy mentor",
    specialties: ["Science", "Environmental Studies"],
    languages: ["English", "Hindi", "Marathi"],
    availability: "Monday, 4:30–6:00 PM",
    avatarColor: "emerald"
  },
  {
    id: "expert_vivek",
    name: "Vivek Menon",
    title: "Foundational mathematics coach",
    specialties: ["Mathematics"],
    languages: ["English", "Hindi"],
    availability: "Wednesday, 5:00–7:00 PM",
    avatarColor: "amber"
  }
];

export const demoAppointments: Appointment[] = [
  {
    id: "appointment_1",
    teacherId: DEMO_TEACHER_ID,
    expertId: "expert_nandita",
    planId: "plan_water_cycle",
    startsAt: "2026-08-24T11:30:00.000Z",
    durationMinutes: 20,
    status: "confirmed",
    agenda: "Review differentiation for the water-cycle activity in a mixed-level class."
  }
];

export const demoGuidance: GuidancePlan[] = [
  {
    id: "guidance_1",
    teacherId: DEMO_TEACHER_ID,
    expertId: "expert_nandita",
    title: "Strengthen evidence-based exit checks",
    goal: "Use one objective-linked exit check in every Science lesson this month.",
    status: "active",
    createdAt: "2026-08-10T08:00:00.000Z",
    actions: [
      {
        id: "task_1",
        title: "Teach the water-cycle exit check",
        dueAt: "2026-08-24T12:00:00.000Z",
        completed: false,
        planId: "plan_water_cycle"
      },
      {
        id: "task_2",
        title: "Review three student-response patterns",
        dueAt: "2026-08-25T12:00:00.000Z",
        completed: false
      },
      {
        id: "task_3",
        title: "Share one successful prompt with the community",
        completed: true,
        planId: "plan_fractions_market"
      }
    ]
  }
];

export const demoInvitations: Invitation[] = [
  {
    id: "invite_demo_1",
    inviterId: DEMO_TEACHER_ID,
    email: "colleague@example.edu",
    role: "teacher",
    status: "pending",
    createdAt: "2026-08-19T09:00:00.000Z"
  }
];

export const demoNotifications: Notification[] = [
  {
    id: "notification_1",
    userId: DEMO_TEACHER_ID,
    type: "plan-ready",
    title: "Water-cycle plan is classroom-ready",
    body: "All five quality checks passed.",
    read: false,
    createdAt: "2026-08-21T05:41:00.000Z",
    href: "/plans/plan_water_cycle/edit"
  },
  {
    id: "notification_2",
    userId: DEMO_TEACHER_ID,
    type: "appointment",
    title: "Mentor review confirmed",
    body: "Dr. Nandita Joshi · 24 Aug at 5:00 PM IST",
    read: false,
    createdAt: "2026-08-20T12:10:00.000Z",
    href: "/community"
  },
  {
    id: "notification_3",
    userId: DEMO_TEACHER_ID,
    type: "offline-synced",
    title: "Offline changes saved",
    body: "Your Fractions reflection is safely stored on this device.",
    read: true,
    createdAt: "2026-08-18T07:21:00.000Z"
  }
];

export const defaultSettings: AppSettings = {
  theme: "light",
  reducedMotion: false,
  highContrast: false,
  defaultGrade: "6",
  defaultSubject: "Science",
  defaultDurationMinutes: 45,
  saveOffline: true,
  emailNotifications: true,
  analyticsConsent: false,
  defaultClassroomProfileId: "classroom_6a"
};
