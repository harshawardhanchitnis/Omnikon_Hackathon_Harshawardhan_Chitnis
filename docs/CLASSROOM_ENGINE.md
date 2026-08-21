# Classroom Teaching Engine v3

The Classroom Teaching Engine is ChalkBox's authoritative delivery model. Legacy `activities` remain only as a compact export/compatibility outline; Teach Mode, Present Mode, exact timing and advanced quality checks use `classroomBlocks`.

## Instructional block contract

Every block has a typed purpose, positive integer duration, private teacher cue, learner-safe content, resource alternative, support/extension pathway, language, grade target, accessibility support, progressive reveal stages and verified source IDs.

The 17 supported block types are:

- hook, question, explanation, visual and board-work;
- demonstration, misconception and example;
- guided-practice, independent-practice and discussion;
- quick-check, recap, exit-ticket and transition;
- shared-multigrade and grade-specific.

Variant fields are contract-enforced. Visuals contain code-native nodes/connections/table data. Misconceptions contain the idea, evidence to listen for, diagnostic question, teacher response and corrective explanation. Checks contain mode, options, answer, explanation, misconception key and aggregate response guidance.

## Exact timing

`totalBlockMinutes(plan.classroomBlocks)` must equal `plan.durationMinutes`. The quality panel does not use a tolerance. The editor exposes **Fit to duration**, which deterministically distributes or removes minutes while keeping every block at one minute or longer. The server repeats this repair after schema-valid Gemini output.

## Teach and Present separation

Teach Mode receives the complete block and shows teacher cues, correction guidance, support, alternatives, lesson map, notes, lesson timer and block pacing. Present Mode receives only `LearnerClassroomBlock`, produced by an explicit redaction function:

- title, purpose, duration, grade label and learner content;
- question/options when appropriate;
- code-native visual data;
- only reveal stages the teacher has already released.

It never receives private notes, teacher cues, expected reasoning, correct keys, answer guides, misconception evidence or corrective explanations. Same-tab events, `BroadcastChannel` and a localStorage snapshot keep a separately projected screen current without adding backend infrastructure.

## Quick Check 2.0

Quick Checks store anonymous class-level counts in MCQ, true/false, confidence or understanding modes. The engine calculates response coverage, correct percentage when a key exists, a misconception signal when a diagnostic option is selected, and a bounded suggested next teaching action. No learner identifier exists in the contract or UI.

## Multigrade scheduling

Grade targets can name one teacher-attention grade and one independent grade. Validation rejects a grade-specific block when either group is missing, is outside the block, or receives both direct and independent work simultaneously. Teach Mode exposes the current grade focus; shared and grade-specific blocks remain visible in the lesson map.

## Flagship acceptance fixture

`plan_photosynthesis_flagship` proves the full engine for Class 7 Science: 40 exact minutes, 42 learners, bilingual English-Hindi, mixed ability, chalkboard, intermittent internet and no projector. Its nine blocks include an opening diagnostic, progressive input-output visual, explanation, first-class misconception, prediction example, 42-response class pulse, independent reconstruction, recap and exit prediction.

Its NCERT Class VIII reference is deliberately marked **partially grounded**: the uploaded book provides supporting concept context, not a false claim that it is the Class VII official lesson source.
