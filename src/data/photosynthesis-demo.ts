import type { GradeTarget, LessonPlan } from "@chalkbox/contracts";

const sourceId = "src_ncert8_science_uploaded";
const allLearners: GradeTarget = {
  grades: ["7"],
  label: "Class 7 · Whole class"
};

export const photosynthesisDemoPlan: LessonPlan = {
  id: "plan_photosynthesis_flagship",
  ownerId: "teacher_meera_demo",
  title: "Photosynthesis: How Leaves Make Food",
  subject: "Science",
  grade: "7",
  board: "CBSE/NCERT",
  language: "Bilingual English–Hindi",
  topic: "Photosynthesis",
  durationMinutes: 40,
  classSize: 42,
  availableMaterials: ["Blackboard", "Chalk", "Learner notebooks"],
  constraints: [
    "Chalkboard only",
    "Intermittent internet",
    "Mixed-ability class",
    "English–Hindi bilingual teaching"
  ],
  objectives: [
    {
      id: "obj_photo_inputs",
      text: "Identify sunlight, water and carbon dioxide as inputs used by a green leaf to make food.",
      bloomLevel: "understand"
    },
    {
      id: "obj_photo_outputs",
      text: "Use a simple input-output model to explain that food is made and oxygen is released.",
      bloomLevel: "apply"
    },
    {
      id: "obj_photo_reason",
      text: "Predict what happens when a plant receives water but very little light and justify the prediction.",
      bloomLevel: "analyse"
    }
  ],
  activities: [
    {
      id: "act_photo_hook",
      title: "Where does plant food come from?",
      type: "hook",
      durationMinutes: 5,
      teacherSteps: [
        "Collect three ideas without correcting them.",
        "Circle soil, water and sunlight."
      ],
      studentSteps: ["Think, pair and share one explanation."],
      materials: ["Blackboard", "Chalk"],
      differentiation: "Accept speaking, pointing or a quick sketch.",
      offlineAlternative: "The chalkboard prompt is the primary experience."
    },
    {
      id: "act_photo_model",
      title: "Build the leaf input-output model",
      type: "explain",
      durationMinutes: 8,
      teacherSteps: ["Reveal one input at a time.", "Add food and oxygen only after prediction."],
      studentSteps: ["Copy the model and explain one arrow to a partner."],
      materials: ["Blackboard", "Chalk"],
      differentiation: "Keep a bilingual word bank visible.",
      offlineAlternative: "Use only the board model."
    },
    {
      id: "act_photo_explain",
      title: "Explain the process",
      type: "activity",
      durationMinutes: 8,
      teacherSteps: [
        "Connect sunlight, chlorophyll, water and carbon dioxide.",
        "Check each term."
      ],
      studentSteps: ["Use the sentence frame: A leaf needs ___ because ___."],
      materials: ["Blackboard", "Notebook"],
      differentiation: "Provide the four input/output words before full sentences.",
      offlineAlternative: "Oral rehearsal replaces any digital display."
    },
    {
      id: "act_photo_practice",
      title: "Predict and reconstruct",
      type: "practice",
      durationMinutes: 8,
      teacherSteps: ["Pose the low-light plant scenario.", "Ask learners to rebuild the process."],
      studentSteps: ["Predict, justify and reconstruct the diagram."],
      materials: ["Notebook", "Pencil"],
      differentiation: "Support with a word bank; extend with darkness reasoning.",
      offlineAlternative: "Pairs can arrange spoken terms if notebooks are unavailable."
    },
    {
      id: "act_photo_check",
      title: "Anonymous class pulse",
      type: "assessment",
      durationMinutes: 6,
      teacherSteps: ["Ask the MCQ aloud.", "Tally A–D responses and respond to the signal."],
      studentSteps: ["Show one option using fingers or a response card."],
      materials: ["Blackboard"],
      differentiation: "Read every option aloud and leave processing time.",
      offlineAlternative: "Manual tally is the default."
    },
    {
      id: "act_photo_close",
      title: "Recap and exit ticket",
      type: "closure",
      durationMinutes: 5,
      teacherSteps: ["Rebuild the model from learner responses.", "Collect one final prediction."],
      studentSteps: ["Complete the exit response in one sentence or labelled sketch."],
      materials: ["Notebook", "Pencil"],
      differentiation: "Accept a labelled arrow model instead of a sentence.",
      offlineAlternative: "Use an oral exit circle if paper is unavailable."
    }
  ],
  classroomBlocks: [
    {
      id: "block_photo_hook",
      type: "hook",
      title: "Where does a plant's food come from?",
      purpose: "Surface prior ideas before introducing scientific vocabulary.",
      durationMinutes: 4,
      teacherCue: "Do not correct immediately. Listen for soil, water and sunlight.",
      learnerContent: ["Think → Pair → Share", "Where does a plant's food come from?"],
      prompt: "Choose one idea and explain why you think it is true.",
      expectedResponse: "Learners may suggest soil, water, sunlight or food made by leaves.",
      resourceAlternative: "Use the same question orally if chalk is unavailable.",
      differentiation: {
        support: "Allow a spoken answer, gesture or quick sketch.",
        extension: "Ask which idea could be tested and what evidence would help."
      },
      language: "Bilingual English–Hindi",
      gradeTarget: allLearners,
      accessibilitySupport: ["Read the prompt aloud", "Allow non-written responses"],
      revealStages: [],
      sourceIds: []
    },
    {
      id: "block_photo_visual",
      type: "visual",
      title: "Build the leaf model",
      purpose: "Represent photosynthesis as a memorable input-output process.",
      durationMinutes: 5,
      teacherCue: "Reveal sunlight, water and carbon dioxide one at a time; reveal outputs last.",
      learnerContent: ["What enters the leaf? What leaves or is made?"],
      resourceAlternative: "Draw the same model with boxes and arrows on the board.",
      differentiation: {
        support: "Say each English term with its Hindi partner before learners copy it.",
        extension: "Ask where each input comes from."
      },
      language: "Bilingual English–Hindi",
      gradeTarget: allLearners,
      accessibilitySupport: ["High-contrast labels", "Text equivalents for every arrow"],
      revealStages: [
        {
          id: "reveal_photo_inputs",
          label: "Reveal inputs",
          kind: "visual-layer",
          learnerContent: [
            "Sunlight / सूर्य का प्रकाश",
            "Water / जल",
            "Carbon dioxide / कार्बन डाइऑक्साइड"
          ]
        },
        {
          id: "reveal_photo_outputs",
          label: "Reveal outputs",
          kind: "visual-layer",
          learnerContent: ["Food / भोजन", "Oxygen / ऑक्सीजन"]
        }
      ],
      sourceIds: [sourceId],
      visualData: {
        kind: "input-output",
        title: "Photosynthesis input-output model",
        nodes: [
          { id: "sun", label: "Sunlight", secondaryLabel: "सूर्य का प्रकाश", emphasis: "primary" },
          { id: "co2", label: "Carbon dioxide", secondaryLabel: "कार्बन डाइऑक्साइड" },
          { id: "water", label: "Water", secondaryLabel: "जल" },
          { id: "leaf", label: "Green leaf", secondaryLabel: "हरी पत्ती", emphasis: "primary" },
          { id: "food", label: "Food", secondaryLabel: "भोजन", emphasis: "output" },
          { id: "oxygen", label: "Oxygen", secondaryLabel: "ऑक्सीजन", emphasis: "output" }
        ],
        connections: [
          { from: "sun", to: "leaf" },
          { from: "co2", to: "leaf" },
          { from: "water", to: "leaf" },
          { from: "leaf", to: "food" },
          { from: "leaf", to: "oxygen" }
        ],
        caption: "A green leaf uses light energy to make food from water and carbon dioxide."
      }
    },
    {
      id: "block_photo_explain",
      type: "explanation",
      title: "Name what the leaf needs",
      purpose: "Connect the visual model to precise scientific language.",
      durationMinutes: 6,
      teacherCue:
        "Point to each arrow while speaking; pause for learners to repeat the idea in their own words.",
      learnerContent: [
        "Sunlight provides energy.",
        "Roots absorb water.",
        "Carbon dioxide enters from the air.",
        "Chlorophyll helps the leaf capture light."
      ],
      teacherExplanation:
        "A green leaf does not take ready-made food from soil. It uses light energy to make sugars from water and carbon dioxide, and oxygen is released.",
      boardPrompt: "Light + water + carbon dioxide → food + oxygen",
      expectedReasoning:
        "Learners should connect each input to its source and distinguish input from output.",
      resourceAlternative: "Keep the explanation anchored to the board arrows.",
      differentiation: {
        support: "Use the frame: The leaf needs ___ from ___.",
        extension: "Ask why chlorophyll matters even though it is not used up like an input."
      },
      language: "Bilingual English–Hindi",
      gradeTarget: allLearners,
      accessibilitySupport: ["Chunked sentences", "Bilingual keyword bank"],
      revealStages: [],
      sourceIds: [sourceId]
    },
    {
      id: "block_photo_misconception",
      type: "misconception",
      title: "Does food come from soil?",
      purpose: "Diagnose and correct the most likely prior misconception.",
      durationMinutes: 4,
      teacherCue: "Treat the misconception as a useful idea to test, not a mistake to shame.",
      learnerContent: ["If food came directly from soil, why would plants need leaves?"],
      misconception: "Plants get their food directly from soil.",
      evidenceToListenFor:
        "A learner says roots absorb food or soil becomes plant material without mentioning food-making in leaves.",
      diagnosticQuestion:
        "If food came directly from soil, why would a plant need green leaves and light?",
      teacherResponse:
        "Acknowledge that roots do absorb water and minerals, then return to the input-output model to separate these from food made in leaves.",
      correctiveExplanation:
        "Soil supplies water and minerals; green leaves make food using light, water and carbon dioxide.",
      resourceAlternative: "Use two board columns: taken in by roots / made in leaves.",
      differentiation: {
        support: "Sort the words water, minerals and food into the two columns.",
        extension: "Ask what evidence a dark-grown plant might provide."
      },
      language: "Bilingual English–Hindi",
      gradeTarget: allLearners,
      accessibilitySupport: [
        "No public correction of individuals",
        "Repeat the two-column distinction"
      ],
      revealStages: [
        {
          id: "reveal_photo_misconception",
          label: "Reveal clarification",
          kind: "explanation",
          learnerContent: ["Roots take in water and minerals. Leaves make food."]
        }
      ],
      sourceIds: [sourceId]
    },
    {
      id: "block_photo_example",
      type: "example",
      title: "A plant with almost no light",
      purpose: "Use the model to predict a new situation.",
      durationMinutes: 5,
      teacherCue: "Collect predictions before revealing the expected reasoning.",
      learnerContent: [
        "A plant receives water but almost no sunlight. Predict what happens and explain why."
      ],
      teacherExplanation:
        "The plant cannot make enough food without light energy, so growth becomes weak even if water is available.",
      expectedReasoning:
        "Water alone is insufficient because light provides the energy for food-making.",
      resourceAlternative: "Read the scenario aloud and invite pair reasoning.",
      differentiation: {
        support: "Point back to the sunlight arrow in the visual.",
        extension: "Distinguish short-term stored-food use from long-term growth."
      },
      language: "Bilingual English–Hindi",
      gradeTarget: allLearners,
      accessibilitySupport: ["Oral response option", "Wait time before cold-calling"],
      revealStages: [
        {
          id: "reveal_photo_hint",
          label: "Reveal hint",
          kind: "hint",
          learnerContent: ["Which arrow in the model is missing?"]
        },
        {
          id: "reveal_photo_reasoning",
          label: "Reveal reasoning",
          kind: "answer",
          learnerContent: [
            "With very little light, the plant makes too little food and grows poorly."
          ]
        }
      ],
      sourceIds: [sourceId]
    },
    {
      id: "block_photo_quick_check",
      type: "quick-check",
      title: "Anonymous class pulse",
      purpose: "Check whether learners can identify the gas input from air.",
      durationMinutes: 5,
      teacherCue:
        "Ask aloud, collect a no-device A–D tally, then use the suggested response before revealing.",
      learnerContent: ["Choose one answer. Do not call out yet."],
      checkMode: "mcq",
      question: "Which substance enters the leaf from the air?",
      options: [
        { key: "A", label: "Water" },
        { key: "B", label: "Carbon dioxide" },
        { key: "C", label: "Soil" },
        { key: "D", label: "Chlorophyll" }
      ],
      correctKey: "B",
      answer: "B — Carbon dioxide",
      explanation:
        "Carbon dioxide comes from the air; water reaches the leaf from roots, and chlorophyll is inside green parts of the leaf.",
      misconceptionKey: "C",
      responseGuidance: [
        {
          key: "C",
          maximumCorrectPercent: 75,
          message:
            "Return to the two-column contrast: roots take in water and minerals; leaves use carbon dioxide from air to make food."
        },
        {
          maximumCorrectPercent: 60,
          message: "Rebuild the three input arrows with the class before continuing."
        }
      ],
      resourceAlternative: "Learners show A–D with fingers; tally on the board.",
      differentiation: {
        support: "Read each option and point to the relevant part of the model.",
        extension: "Ask how carbon dioxide could enter a leaf."
      },
      language: "Bilingual English–Hindi",
      gradeTarget: allLearners,
      accessibilitySupport: ["Read options aloud", "Allow response cards or fingers"],
      revealStages: [
        {
          id: "reveal_photo_answer",
          label: "Reveal answer",
          kind: "answer",
          learnerContent: ["B — Carbon dioxide"]
        },
        {
          id: "reveal_photo_explanation",
          label: "Reveal explanation",
          kind: "explanation",
          learnerContent: ["Carbon dioxide enters from the air; water arrives from roots."]
        }
      ],
      sourceIds: [sourceId]
    },
    {
      id: "block_photo_independent",
      type: "independent-practice",
      title: "Reconstruct the process",
      purpose: "Make every learner retrieve and organize the process independently.",
      durationMinutes: 5,
      teacherCue: "Scan for arrow direction and the soil-food misconception while learners work.",
      learnerContent: [
        "Rebuild the process using arrows and five labels.",
        "Add one sentence explaining the role of light."
      ],
      teacherExplanation:
        "A correct reconstruction shows three inputs entering a green leaf and food plus oxygen as outputs.",
      expectedReasoning: "Learners distinguish material inputs from the energy source and outputs.",
      resourceAlternative: "Pairs can reconstruct orally using the five board labels.",
      differentiation: {
        support: "Give the five input/output words first.",
        extension: "Explain why a plant kept in darkness grows poorly."
      },
      language: "Bilingual English–Hindi",
      gradeTarget: allLearners,
      accessibilitySupport: ["Word-bank option", "Oral reconstruction option"],
      revealStages: [],
      sourceIds: [sourceId]
    },
    {
      id: "block_photo_recap",
      type: "recap",
      title: "Rebuild it together",
      purpose: "Consolidate the complete model through learner retrieval.",
      durationMinutes: 3,
      teacherCue: "Erase one label at a time and ask learners to restore it with a reason.",
      learnerContent: ["Name the missing input or output and explain its role."],
      teacherExplanation: "Use the final model to connect every lesson objective.",
      boardPrompt: "Light + water + carbon dioxide → food + oxygen",
      resourceAlternative: "Use gestures for arrows if the board is unavailable.",
      differentiation: {
        support: "Offer two choices for each missing term.",
        extension: "Ask which part is energy rather than matter."
      },
      language: "Bilingual English–Hindi",
      gradeTarget: allLearners,
      accessibilitySupport: ["Choral response before individual response"],
      revealStages: [],
      sourceIds: [sourceId]
    },
    {
      id: "block_photo_exit",
      type: "exit-ticket",
      title: "One final prediction",
      purpose: "Check whether learners can transfer the input-output model.",
      durationMinutes: 3,
      teacherCue:
        "Collect a one-sentence answer or labelled sketch; do not require names in ChalkBox.",
      learnerContent: [
        "A plant has water and air but is kept in darkness. What will happen over time, and why?"
      ],
      checkMode: "understanding",
      question:
        "A plant has water and air but is kept in darkness. What will happen over time, and why?",
      options: [],
      answer: "It will make too little food and weaken because light energy is missing.",
      explanation:
        "Water and carbon dioxide are present, but the process also requires light energy.",
      responseGuidance: [
        {
          maximumCorrectPercent: 70,
          message:
            "Begin the next lesson by rebuilding the input-output model and contrasting water with light energy."
        }
      ],
      resourceAlternative: "Use an oral exit circle if paper is unavailable.",
      differentiation: {
        support: "Allow a labelled arrow diagram.",
        extension: "Explain whether the change would be immediate or gradual."
      },
      language: "Bilingual English–Hindi",
      gradeTarget: allLearners,
      accessibilitySupport: ["Sentence frame or sketch accepted"],
      revealStages: [],
      sourceIds: [sourceId]
    }
  ],
  assessments: [
    {
      id: "assess_photo_1",
      prompt: "Which substance enters a leaf from the air?",
      type: "oral",
      answerGuide: "Carbon dioxide enters from the air.",
      checksObjectiveIds: ["obj_photo_inputs"]
    },
    {
      id: "assess_photo_2",
      prompt: "Predict what happens to a watered plant kept in darkness and explain why.",
      type: "exit-ticket",
      answerGuide: "It makes too little food because light energy is missing, so growth weakens.",
      checksObjectiveIds: ["obj_photo_outputs", "obj_photo_reason"]
    }
  ],
  homework:
    "Find one healthy green leaf near home and redraw the input-output model beside it; do not pluck the leaf.",
  teacherNotes:
    "Keep answers private until reveal. Use the no-device tally and respond to the soil-food misconception before moving on.",
  status: "ready",
  qualityScore: 100,
  estimatedPrepMinutes: 6,
  sources: [
    {
      id: sourceId,
      title: "NCERT Science Textbook for Class VIII — supporting concept references",
      publisher: "National Council of Educational Research and Training",
      url: "https://ncert.nic.in/textbook.php",
      license:
        "NCERT copyright; ChalkBox stores metadata, page locators and original derived summaries only",
      attribution:
        "Supporting references from the user-supplied NCERT Class VIII Science book; no textbook prose is redistributed.",
      grade: "8",
      subject: "Science",
      chapter: "Supporting references: Ch. 7, Ch. 8 and Ch. 18"
    }
  ],
  grounding: {
    status: "partially-grounded",
    verifiedSourceIds: [sourceId],
    note: "The uploaded Class VIII NCERT book verifies supporting concepts, while the Class VII sequence and wording are original ChalkBox content and require current-syllabus confirmation."
  },
  generationMode: "prepared-demo",
  aiDisclosure:
    "Prepared demonstration content, independently authored by ChalkBox and partially grounded in the user-supplied NCERT Class VIII Science source. It is not a live AI response.",
  createdAt: "2026-08-21T07:00:00.000Z",
  updatedAt: "2026-08-21T15:30:00.000Z",
  isPublic: false,
  version: 1
};
