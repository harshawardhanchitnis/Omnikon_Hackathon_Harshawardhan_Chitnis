import { z } from "npm:zod@4";

export const generationInputSchema = z
  .object({
    grade: z.enum(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]),
    additionalGrade: z.enum(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]).optional(),
    subject: z.enum([
      "English",
      "Hindi",
      "Mathematics",
      "Science",
      "Social Science",
      "Environmental Studies",
      "Custom"
    ]),
    customSubject: z.string().trim().min(2).max(80).optional(),
    topic: z.string().trim().min(3).max(120),
    durationMinutes: z.number().int().min(20).max(90),
    language: z.enum(["English", "Hindi", "Bilingual English–Hindi"]),
    board: z.enum(["CBSE/NCERT", "State Board", "Custom"]),
    customBoard: z.string().trim().min(2).max(100).optional(),
    classSize: z.number().int().min(1).max(100),
    availableMaterials: z.array(z.string().trim().min(1).max(80)).max(12),
    constraints: z.array(z.string().trim().min(1).max(120)).max(12),
    learningLevel: z.enum(["support-needed", "mixed", "on-level", "advanced"])
  })
  .superRefine((value, context) => {
    if (value.additionalGrade === value.grade)
      context.addIssue({
        code: "custom",
        path: ["additionalGrade"],
        message: "Second grade must differ"
      });
    if (value.subject === "Custom" && !value.customSubject)
      context.addIssue({
        code: "custom",
        path: ["customSubject"],
        message: "Custom subject is required"
      });
    if (value.board === "Custom" && !value.customBoard)
      context.addIssue({
        code: "custom",
        path: ["customBoard"],
        message: "Custom curriculum is required"
      });
  });

export const inputSchema = z.object({
  input: generationInputSchema,
  ownerId: z.string().uuid()
});

const generatedRevealSchema = z.object({
  label: z.string().min(2).max(100),
  kind: z.enum(["hint", "answer", "explanation", "visual-layer"]),
  learnerContent: z.array(z.string().min(1).max(240)).min(1).max(5)
});

const generatedVisualSchema = z.object({
  kind: z.enum([
    "process",
    "comparison",
    "sequence",
    "cause-effect",
    "labeled-diagram",
    "input-output",
    "timeline",
    "table",
    "vocabulary",
    "equation"
  ]),
  title: z.string().max(160).optional(),
  nodes: z
    .array(
      z.object({
        label: z.string().min(1).max(100),
        secondaryLabel: z.string().max(100).optional(),
        emphasis: z.enum(["primary", "secondary", "output", "warning"]).optional()
      })
    )
    .min(1)
    .max(10),
  caption: z.string().max(300).optional()
});

export const generatedClassroomBlockSchema = z.object({
  type: z.enum([
    "hook",
    "question",
    "explanation",
    "visual",
    "board-work",
    "demonstration",
    "misconception",
    "example",
    "guided-practice",
    "independent-practice",
    "discussion",
    "quick-check",
    "recap",
    "exit-ticket",
    "transition",
    "shared-multigrade",
    "grade-specific"
  ]),
  title: z.string().min(3).max(120),
  purpose: z.string().min(5).max(300),
  durationMinutes: z.number().int().min(1).max(45),
  teacherCue: z.string().min(5).max(500),
  learnerContent: z.array(z.string().min(1).max(300)).min(1).max(6),
  resourceAlternative: z.string().min(5).max(400),
  support: z.string().min(5).max(400),
  extension: z.string().min(5).max(400),
  gradeTargetLabel: z.string().min(2).max(100),
  teacherAttentionGrade: z.enum(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]).optional(),
  independentGrade: z.enum(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]).optional(),
  accessibilitySupport: z.array(z.string().min(2).max(180)).min(1).max(6),
  revealStages: z.array(generatedRevealSchema).max(5),
  sourceIndexes: z.array(z.number().int().min(0).max(5)).max(6),
  prompt: z.string().max(500).optional(),
  expectedResponse: z.string().max(500).optional(),
  teacherExplanation: z.string().max(800).optional(),
  boardPrompt: z.string().max(400).optional(),
  expectedReasoning: z.string().max(500).optional(),
  visualData: generatedVisualSchema.optional(),
  misconception: z.string().max(400).optional(),
  evidenceToListenFor: z.string().max(500).optional(),
  diagnosticQuestion: z.string().max(500).optional(),
  teacherResponse: z.string().max(600).optional(),
  correctiveExplanation: z.string().max(600).optional(),
  checkMode: z.enum(["mcq", "true-false", "confidence", "understanding"]).optional(),
  question: z.string().max(500).optional(),
  options: z
    .array(z.object({ key: z.string().min(1).max(20), label: z.string().min(1).max(240) }))
    .max(6)
    .optional(),
  correctKey: z.string().max(20).optional(),
  answer: z.string().max(500).optional(),
  explanation: z.string().max(600).optional(),
  misconceptionKey: z.string().max(20).optional(),
  responseGuidance: z
    .array(
      z.object({
        key: z.string().max(20).optional(),
        maximumCorrectPercent: z.number().int().min(0).max(100).optional(),
        message: z.string().min(3).max(400)
      })
    )
    .max(6)
    .optional()
});

export const generatedPlanSchema = z.object({
  title: z.string().min(3).max(180),
  objectives: z
    .array(
      z.object({
        text: z.string().min(12).max(300),
        bloomLevel: z.enum(["remember", "understand", "apply", "analyse", "evaluate", "create"])
      })
    )
    .min(2)
    .max(4),
  activities: z
    .array(
      z.object({
        title: z.string().min(3).max(120),
        type: z.enum(["hook", "explain", "activity", "practice", "assessment", "closure"]),
        durationMinutes: z.number().int().min(2).max(45),
        teacherSteps: z.array(z.string().min(5).max(300)).min(1).max(5),
        studentSteps: z.array(z.string().min(5).max(300)).min(1).max(5),
        materials: z.array(z.string().min(1).max(80)).max(8),
        differentiation: z.string().min(5).max(400),
        offlineAlternative: z.string().min(5).max(400)
      })
    )
    .min(3)
    .max(8),
  classroomBlocks: z.array(generatedClassroomBlockSchema).min(5).max(18),
  assessments: z
    .array(
      z.object({
        prompt: z.string().min(5).max(400),
        type: z.enum(["oral", "written", "observation", "exit-ticket"]),
        answerGuide: z.string().min(5).max(500),
        objectiveIndexes: z.array(z.number().int().min(0).max(3)).min(1).max(4)
      })
    )
    .min(2)
    .max(5),
  homework: z.string().min(3).max(500),
  teacherNotes: z.string().min(3).max(700),
  estimatedPrepMinutes: z.number().int().min(3).max(45)
});

export const generatedResponseSchema = {
  type: "object",
  required: [
    "title",
    "objectives",
    "activities",
    "classroomBlocks",
    "assessments",
    "homework",
    "teacherNotes",
    "estimatedPrepMinutes"
  ],
  properties: {
    title: { type: "string" },
    objectives: {
      type: "array",
      minItems: 2,
      maxItems: 4,
      items: {
        type: "object",
        required: ["text", "bloomLevel"],
        properties: {
          text: { type: "string" },
          bloomLevel: {
            type: "string",
            enum: ["remember", "understand", "apply", "analyse", "evaluate", "create"]
          }
        }
      }
    },
    activities: {
      type: "array",
      minItems: 3,
      maxItems: 8,
      items: {
        type: "object",
        required: [
          "title",
          "type",
          "durationMinutes",
          "teacherSteps",
          "studentSteps",
          "materials",
          "differentiation",
          "offlineAlternative"
        ],
        properties: {
          title: { type: "string" },
          type: {
            type: "string",
            enum: ["hook", "explain", "activity", "practice", "assessment", "closure"]
          },
          durationMinutes: { type: "integer" },
          teacherSteps: { type: "array", items: { type: "string" } },
          studentSteps: { type: "array", items: { type: "string" } },
          materials: { type: "array", items: { type: "string" } },
          differentiation: { type: "string" },
          offlineAlternative: { type: "string" }
        }
      }
    },
    classroomBlocks: {
      type: "array",
      minItems: 5,
      maxItems: 18,
      items: {
        type: "object",
        required: [
          "type",
          "title",
          "purpose",
          "durationMinutes",
          "teacherCue",
          "learnerContent",
          "resourceAlternative",
          "support",
          "extension",
          "gradeTargetLabel",
          "accessibilitySupport",
          "revealStages",
          "sourceIndexes"
        ],
        properties: {
          type: {
            type: "string",
            enum: [
              "hook",
              "question",
              "explanation",
              "visual",
              "board-work",
              "demonstration",
              "misconception",
              "example",
              "guided-practice",
              "independent-practice",
              "discussion",
              "quick-check",
              "recap",
              "exit-ticket",
              "transition",
              "shared-multigrade",
              "grade-specific"
            ]
          },
          title: { type: "string" },
          purpose: { type: "string" },
          durationMinutes: { type: "integer", minimum: 1 },
          teacherCue: { type: "string" },
          learnerContent: { type: "array", items: { type: "string" } },
          resourceAlternative: { type: "string" },
          support: { type: "string" },
          extension: { type: "string" },
          gradeTargetLabel: { type: "string" },
          teacherAttentionGrade: {
            type: "string",
            enum: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]
          },
          independentGrade: {
            type: "string",
            enum: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]
          },
          accessibilitySupport: { type: "array", items: { type: "string" } },
          revealStages: {
            type: "array",
            items: {
              type: "object",
              required: ["label", "kind", "learnerContent"],
              properties: {
                label: { type: "string" },
                kind: { type: "string", enum: ["hint", "answer", "explanation", "visual-layer"] },
                learnerContent: { type: "array", items: { type: "string" } }
              }
            }
          },
          sourceIndexes: { type: "array", items: { type: "integer", minimum: 0, maximum: 5 } },
          prompt: { type: "string" },
          expectedResponse: { type: "string" },
          teacherExplanation: { type: "string" },
          boardPrompt: { type: "string" },
          expectedReasoning: { type: "string" },
          visualData: {
            type: "object",
            required: ["kind", "nodes"],
            properties: {
              kind: {
                type: "string",
                enum: [
                  "process",
                  "comparison",
                  "sequence",
                  "cause-effect",
                  "labeled-diagram",
                  "input-output",
                  "timeline",
                  "table",
                  "vocabulary",
                  "equation"
                ]
              },
              title: { type: "string" },
              nodes: {
                type: "array",
                items: {
                  type: "object",
                  required: ["label"],
                  properties: {
                    label: { type: "string" },
                    secondaryLabel: { type: "string" },
                    emphasis: {
                      type: "string",
                      enum: ["primary", "secondary", "output", "warning"]
                    }
                  }
                }
              },
              caption: { type: "string" }
            }
          },
          misconception: { type: "string" },
          evidenceToListenFor: { type: "string" },
          diagnosticQuestion: { type: "string" },
          teacherResponse: { type: "string" },
          correctiveExplanation: { type: "string" },
          checkMode: { type: "string", enum: ["mcq", "true-false", "confidence", "understanding"] },
          question: { type: "string" },
          options: {
            type: "array",
            items: {
              type: "object",
              required: ["key", "label"],
              properties: { key: { type: "string" }, label: { type: "string" } }
            }
          },
          correctKey: { type: "string" },
          answer: { type: "string" },
          explanation: { type: "string" },
          misconceptionKey: { type: "string" },
          responseGuidance: {
            type: "array",
            items: {
              type: "object",
              required: ["message"],
              properties: {
                key: { type: "string" },
                maximumCorrectPercent: { type: "integer" },
                message: { type: "string" }
              }
            }
          }
        }
      }
    },
    assessments: {
      type: "array",
      minItems: 2,
      maxItems: 5,
      items: {
        type: "object",
        required: ["prompt", "type", "answerGuide", "objectiveIndexes"],
        properties: {
          prompt: { type: "string" },
          type: { type: "string", enum: ["oral", "written", "observation", "exit-ticket"] },
          answerGuide: { type: "string" },
          objectiveIndexes: { type: "array", items: { type: "integer" } }
        }
      }
    },
    homework: { type: "string" },
    teacherNotes: { type: "string" },
    estimatedPrepMinutes: { type: "integer" }
  }
} as const;

export type GenerationInput = z.infer<typeof inputSchema>["input"];
export type GeneratedPlan = z.infer<typeof generatedPlanSchema>;
export type GeneratedClassroomBlock = z.infer<typeof generatedClassroomBlockSchema>;
