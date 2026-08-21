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
