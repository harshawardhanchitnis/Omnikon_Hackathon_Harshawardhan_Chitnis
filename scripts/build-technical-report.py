from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf" / "ChalkBox_Final_Technical_Report.pdf"
OUTPUT.parent.mkdir(parents=True, exist_ok=True)

PAGE_W, PAGE_H = A4
INK = colors.HexColor("#17211F")
MOSS = colors.HexColor("#1F6B5C")
MOSS_DARK = colors.HexColor("#17493F")
MOSS_LIGHT = colors.HexColor("#DCEFE9")
PAPER = colors.HexColor("#F7F8F2")
SUN = colors.HexColor("#F4B740")
SUN_LIGHT = colors.HexColor("#FFF0BD")
CORAL = colors.HexColor("#E9725B")
MUTED = colors.HexColor("#64716D")
BORDER = colors.HexColor("#DFE5DF")
WHITE = colors.white


class ChalkBoxDoc(BaseDocTemplate):
    def __init__(self, filename):
        super().__init__(
            filename,
            pagesize=A4,
            leftMargin=18 * mm,
            rightMargin=18 * mm,
            topMargin=22 * mm,
            bottomMargin=18 * mm,
            title="ChalkBox Final Technical Report",
            author="Harshawardhan Chitnis - Team HarshLabs",
            subject="Omnikon National Hackathon 2026 - Omni_EdTech_7",
        )
        frame = Frame(
            self.leftMargin,
            self.bottomMargin,
            self.width,
            self.height,
            id="body",
            leftPadding=0,
            rightPadding=0,
            topPadding=0,
            bottomPadding=0,
        )
        self.addPageTemplates(PageTemplate(id="all", frames=[frame], onPage=draw_page))


def draw_logo(canvas, x, y, inverse=False):
    canvas.saveState()
    canvas.setFillColor(WHITE if inverse else SUN)
    canvas.setStrokeColor(colors.Color(1, 1, 1, 0.35) if inverse else MOSS_DARK)
    canvas.setLineWidth(1.3)
    canvas.roundRect(x, y - 8 * mm, 8 * mm, 8 * mm, 2 * mm, fill=1, stroke=1)
    canvas.setFillColor(MOSS_DARK)
    canvas.setFont("Helvetica-Bold", 12)
    canvas.drawCentredString(x + 4 * mm, y - 5.7 * mm, "C")
    canvas.setFillColor(WHITE if inverse else INK)
    canvas.setFont("Helvetica-Bold", 14)
    canvas.drawString(x + 11 * mm, y - 5.8 * mm, "ChalkBox")
    canvas.restoreState()


def draw_page(canvas, doc):
    canvas.saveState()
    if doc.page == 1:
        canvas.setFillColor(MOSS_DARK)
        canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
        canvas.setFillColor(colors.HexColor("#2B7A68"))
        canvas.circle(PAGE_W + 15 * mm, PAGE_H - 20 * mm, 62 * mm, fill=1, stroke=0)
        canvas.setFillColor(colors.HexColor("#20594D"))
        canvas.circle(-15 * mm, 8 * mm, 48 * mm, fill=1, stroke=0)
        draw_logo(canvas, 20 * mm, PAGE_H - 18 * mm, inverse=True)
    else:
        canvas.setFillColor(PAPER)
        canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
        canvas.setStrokeColor(BORDER)
        canvas.line(18 * mm, PAGE_H - 16 * mm, PAGE_W - 18 * mm, PAGE_H - 16 * mm)
        draw_logo(canvas, 18 * mm, PAGE_H - 5.5 * mm)
        canvas.setFillColor(MUTED)
        canvas.setFont("Helvetica-Bold", 7)
        canvas.drawRightString(PAGE_W - 18 * mm, PAGE_H - 11.5 * mm, "OMNIKON 2026  /  OMNI_EDTECH_7")
        canvas.setStrokeColor(BORDER)
        canvas.line(18 * mm, 12 * mm, PAGE_W - 18 * mm, 12 * mm)
        canvas.setFillColor(MUTED)
        canvas.setFont("Helvetica", 7)
        canvas.drawString(18 * mm, 7.5 * mm, "Team HarshLabs  |  Harshawardhan Chitnis")
        canvas.drawRightString(PAGE_W - 18 * mm, 7.5 * mm, f"ChalkBox  |  {doc.page}")
    canvas.restoreState()


styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="CoverEyebrow", fontName="Helvetica-Bold", fontSize=9, leading=12, textColor=colors.HexColor("#BEE7DC"), spaceAfter=7, tracking=1.3))
styles.add(ParagraphStyle(name="CoverTitle", fontName="Helvetica-Bold", fontSize=34, leading=35, textColor=WHITE, spaceAfter=13))
styles.add(ParagraphStyle(name="CoverDeck", fontName="Helvetica", fontSize=13, leading=20, textColor=colors.HexColor("#D7E9E3"), spaceAfter=22))
styles.add(ParagraphStyle(name="CoverMeta", fontName="Helvetica-Bold", fontSize=9, leading=14, textColor=WHITE))
styles.add(ParagraphStyle(name="Eyebrow", fontName="Helvetica-Bold", fontSize=7.5, leading=10, textColor=MOSS, tracking=1.1, spaceAfter=4))
styles.add(ParagraphStyle(name="H1x", fontName="Helvetica-Bold", fontSize=23, leading=27, textColor=INK, spaceAfter=9))
styles.add(ParagraphStyle(name="H2x", fontName="Helvetica-Bold", fontSize=13, leading=17, textColor=INK, spaceBefore=7, spaceAfter=5))
styles.add(ParagraphStyle(name="H3x", fontName="Helvetica-Bold", fontSize=9.5, leading=13, textColor=INK, spaceAfter=3))
styles.add(ParagraphStyle(name="Bodyx", fontName="Helvetica", fontSize=8.5, leading=13, textColor=INK, spaceAfter=6))
styles.add(ParagraphStyle(name="Smallx", fontName="Helvetica", fontSize=7.2, leading=10.5, textColor=MUTED, spaceAfter=3))
styles.add(ParagraphStyle(name="Bulletx", fontName="Helvetica", fontSize=8.2, leading=12.2, textColor=INK, leftIndent=10, firstLineIndent=-7, bulletIndent=2, spaceAfter=3))
styles.add(ParagraphStyle(name="Numberx", fontName="Helvetica", fontSize=8.2, leading=12.2, textColor=INK, leftIndent=13, firstLineIndent=-10, spaceAfter=4))
styles.add(ParagraphStyle(name="CalloutTitle", fontName="Helvetica-Bold", fontSize=9, leading=12, textColor=MOSS_DARK, spaceAfter=3))
styles.add(ParagraphStyle(name="CalloutBody", fontName="Helvetica", fontSize=7.8, leading=11.5, textColor=INK))
styles.add(ParagraphStyle(name="TableHead", fontName="Helvetica-Bold", fontSize=7.2, leading=9.5, textColor=WHITE))
styles.add(ParagraphStyle(name="TableCell", fontName="Helvetica", fontSize=6.8, leading=9.3, textColor=INK))
styles.add(ParagraphStyle(name="TableCellBold", fontName="Helvetica-Bold", fontSize=6.8, leading=9.3, textColor=INK))
styles.add(ParagraphStyle(name="Quote", fontName="Helvetica-Bold", fontSize=14, leading=19, textColor=MOSS_DARK, alignment=TA_CENTER, leftIndent=12 * mm, rightIndent=12 * mm, spaceBefore=8, spaceAfter=8))


def P(text, style="Bodyx"):
    return Paragraph(text, styles[style])


def bullet(text):
    return Paragraph(f"<bullet>&bull;</bullet>{text}", styles["Bulletx"])


def section(eyebrow, title, intro=None):
    result = [P(eyebrow.upper(), "Eyebrow"), P(title, "H1x")]
    if intro:
        result.append(P(intro, "Bodyx"))
    result.append(Spacer(1, 2 * mm))
    return result


def callout(title, text, color=MOSS_LIGHT):
    table = Table([[P(title, "CalloutTitle"), P(text, "CalloutBody")]], colWidths=[36 * mm, 130 * mm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), color),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.Color(MOSS.red, MOSS.green, MOSS.blue, 0.35)),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    return table


def data_table(headers, rows, widths):
    data = [[P(item, "TableHead") for item in headers]]
    for row in rows:
        data.append([P(str(item), "TableCellBold" if index == 0 else "TableCell") for index, item in enumerate(row)])
    table = Table(data, colWidths=widths, repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), MOSS_DARK),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, colors.HexColor("#EEF3EE")]),
        ("GRID", (0, 0), (-1, -1), 0.35, BORDER),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return table


def flow_table(items, widths=None):
    cells = []
    for index, (label, text) in enumerate(items):
        content = P(f"<font color='#1F6B5C'><b>{index + 1:02d}</b></font><br/><b>{label}</b><br/><font color='#64716D'>{text}</font>", "TableCell")
        cells.append(content)
        if index < len(items) - 1:
            cells.append(P("&#8594;", "H2x"))
    if widths is None:
        item_width = 29 * mm
        widths = [item_width if index % 2 == 0 else 6 * mm for index in range(len(cells))]
    table = Table([cells], colWidths=widths)
    style = [
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (1, 0), (-1, -1), "CENTER"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]
    for index in range(0, len(cells), 2):
        style += [("BACKGROUND", (index, 0), (index, 0), WHITE), ("BOX", (index, 0), (index, 0), 0.5, BORDER)]
    table.setStyle(TableStyle(style))
    return table


story = []

# Cover
story += [
    Spacer(1, 47 * mm),
    P("OMNIKON NATIONAL HACKATHON 2026  /  FINAL BUILD", "CoverEyebrow"),
    P("ChalkBox", "CoverTitle"),
    P("Fast, practical lesson planning for the classroom a teacher actually has.", "CoverDeck"),
    Table(
        [[P("PROBLEM", "TableHead"), P("TEAM", "TableHead"), P("PARTICIPANT", "TableHead")],
         [P("Omni_EdTech_7", "CoverMeta"), P("Team HarshLabs", "CoverMeta"), P("Harshawardhan Chitnis", "CoverMeta")]],
        colWidths=[50 * mm, 50 * mm, 65 * mm],
        style=TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.Color(1, 1, 1, 0.10)),
            ("BACKGROUND", (0, 1), (-1, 1), colors.Color(1, 1, 1, 0.06)),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.Color(1, 1, 1, 0.25)),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.Color(1, 1, 1, 0.15)),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 7),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ]),
    ),
    Spacer(1, 28 * mm),
    P("Your classroom. Your plan. Powered by HarshLabs AI.", "CoverMeta"),
    PageBreak(),
]

# Executive summary
story += section("01 / Executive summary", "A complete teacher workflow, not a text generator.", "ChalkBox reduces lesson-planning friction for teachers who have limited time, materials, connectivity, and support. It creates a strong starting point and follows the lesson through assessment, teaching, reflection, and reuse.")
story += [
    P("The challenge", "H2x"),
    P("Teachers in under-resourced schools often prepare across multiple grades and subjects without dependable internet, printing, projectors, or ready-to-use materials. Generic AI output can add another editing burden when it ignores these constraints or stops at a paragraph of advice.", "Bodyx"),
    P("The product response", "H2x"),
    data_table(
        ["Need", "ChalkBox response", "Evidence in build"],
        [
            ["Speed", "Structured plan from a bounded classroom brief", "Constraint form, protected generation, prepared demo"],
            ["Practicality", "Timed activities using common materials", "Material allow-list, offline alternative per activity"],
            ["Teacher control", "Every output is editable and inspectable", "Autosaving editor, quality panel, sources"],
            ["Classroom continuity", "Plan remains useful after preparation", "Assessment bank, Teach/Present Mode, Quick Check, reflection"],
            ["Trust", "No secret in browser and no student profile", "Edge Functions, RLS, privacy-safe data model"],
            ["Resilience", "Core demo and saved plans work without APIs", "PWA, IndexedDB, explicit prepared flow"],
        ],
        [27 * mm, 68 * mm, 71 * mm],
    ),
    Spacer(1, 5 * mm),
    callout("Core outcome", "A teacher moves from a short brief to a classroom-ready, editable lesson with measurable objectives, low-resource activities, assessment evidence, printable resources, and a reusable reflection loop."),
    Spacer(1, 5 * mm),
    P("Success is defined by the final working product: complete flows, strong UI/UX, transparent AI, offline behaviour, safe persistence, export, responsive design, and reproducible deployment.", "Bodyx"),
    PageBreak(),
]

# Journey and features
story += section("02 / Product scope", "Plan, assess, teach, reflect, improve.", "The main journey is intentionally linear for a first-time teacher and modular for a returning teacher.")
story += [
    flow_table([
        ("Brief", "Type or dictate; review extraction and assumptions"),
        ("Plan", "Gemini or labelled prepared example"),
        ("Assess", "Source-labelled bank and worksheet"),
        ("Teach", "Steps, presentation and aggregate check"),
        ("Improve", "Reflection, analytics and private reuse"),
    ], [29 * mm, 5 * mm, 29 * mm, 5 * mm, 29 * mm, 5 * mm, 29 * mm, 5 * mm, 29 * mm]),
    Spacer(1, 6 * mm),
    data_table(
        ["Module", "Implemented capabilities"],
        [
            ["Public and trust", "Landing, about, privacy, 404, offline help, read-only share"],
            ["Identity", "Passwordless email, auth callback, onboarding, anonymous AI session"],
            ["Teacher home", "Next lesson, recent plans, outcome signal, assessment and classroom shortcuts"],
            ["Brief and classroom", "Voice/text extraction, review, mixed grade, custom board/subject, reusable context"],
            ["Editor and history", "Autosave, section adjustment, checkpoints, restore, duplicate and quality checks"],
            ["Assessment", "Provenance, review state, add-to-lesson, worksheet and answer-key PDFs"],
            ["Preview and share", "Print, PDF, learner presentation and immutable expiring snapshots"],
            ["Teach and reflect", "Timer, read-aloud, Quick Checks, class evidence and next action"],
            ["Curriculum/community", "Source-aware explorer, moderated immutable discovery, adaptation and reports"],
            ["Insights/settings", "Aggregate trends, offline queue, conflict choices, export and demo reset"],
            ["Administration", "Moderation queue, source audit, health, quota and validation telemetry"],
        ],
        [39 * mm, 127 * mm],
    ),
    Spacer(1, 5 * mm),
    callout("Explicit boundary", "There are no student accounts, named learner records, automatic individual grading, mentor booking, payments, native apps, or silent AI fallbacks.", SUN_LIGHT),
    PageBreak(),
]

# Demo fixtures
story += section("03 / Judge-ready demonstration", "Useful immediately after launch.", "The deterministic demo proves the complete product even when provider setup, quota, or connectivity is unavailable.")
story += [
    P("Primary persona", "H2x"),
    data_table(
        ["Persona", "Context", "Seeded proof"],
        [["Meera Patil", "Grade 5-7 teacher at a fictional Zilla Parishad school in Pune district", "3 plans, 2 classrooms, assessment bank, worksheet, versions, share, session, Quick Check, reflection, publications and analytics"]],
        [33 * mm, 66 * mm, 67 * mm],
    ),
    Spacer(1, 5 * mm),
    P("Prepared lesson records", "H2x"),
    data_table(
        ["Plan", "Status", "Classroom constraint", "Demonstrated outcome"],
        [
            ["The Water Cycle Around Us", "Ready", "38 learners, bilingual, no projector", "Brief, history, assessment, teach/present, share, PDF and reflection"],
            ["Fractions in the Local Market", "Taught", "Limited photocopies", "Completed session, check-in and reflection analytics"],
            ["A Story from Another View", "Draft", "42 learners, mixed reading levels", "Return-to-draft and quality improvement state"],
        ],
        [44 * mm, 21 * mm, 49 * mm, 52 * mm],
    ),
    Spacer(1, 6 * mm),
    P("Transparency controls", "H2x"),
    bullet("Prepared plans carry a visible label in creation, editor, preview, share and export."),
    bullet("The prepared button is a separate user action; it is never an automatic Gemini fallback."),
    bullet("The fictional persona contains no real student or teacher personal information."),
    bullet("Reset clears only ChalkBox browser tables and restores canonical fixtures."),
    bullet("Approved community entries are immutable snapshots; a separate pending submission proves moderation."),
    bullet("Analytics are calculated from fixture plans, sessions, reflections and aggregate Quick Checks."),
    Spacer(1, 4 * mm),
    P("Recommended five-minute path", "H2x"),
    flow_table([
        ("Land", "State the time/material problem"),
        ("Home", "Show next lesson and evidence"),
        ("Create", "Review brief and prepared example"),
        ("Assess", "Compose a printable worksheet"),
        ("Teach", "Quick Check, reflect and insight"),
    ], [29 * mm, 5 * mm, 29 * mm, 5 * mm, 29 * mm, 5 * mm, 29 * mm, 5 * mm, 29 * mm]),
    Spacer(1, 6 * mm),
    callout("Demo promise", "No account, API key, database setup, or network connection is required after the PWA has loaded once."),
    PageBreak(),
]

# Architecture
story += section("04 / System architecture", "Simple at the edge, strong at the boundary.", "A React PWA owns the experience; Supabase provides identity, persistence, policy, retrieval, and the secure server boundary.")
story += [
    data_table(
        ["Layer", "Locked technology", "Why"],
        [
            ["Frontend", "React 19 + TypeScript + Vite", "Fast SPA, strict contracts, efficient build and code splitting"],
            ["UI", "Tailwind CSS + native reusable components", "Coherent responsive system without a heavy widget runtime"],
            ["Routing", "React Router", "Public, protected, teacher, share and admin route boundaries"],
            ["State", "DomainProvider + Zustand + TanStack Query", "Dexie-backed entities; UI/preferences separated from domain data"],
            ["Forms", "React Hook Form + Zod", "Typed validation shared with AI input constraints"],
            ["Offline", "Dexie / IndexedDB + PWA", "Reliable drafts, sessions and reflections on-device"],
            ["Cloud", "Supabase Auth, Postgres, Edge, pgvector", "Free-first managed backend with RLS and vector search"],
            ["AI", "Gemini 3.7 Flash + Embedding 2", "Structured lesson JSON and 768-dimensional retrieval"],
            ["Output", "React PDF + browser print", "Private client-side document export"],
            ["Quality", "Vitest + Playwright + axe", "Unit, component, lifecycle, mobile and accessibility tests"],
            ["Delivery", "Cloudflare Pages + GitHub Actions", "Free CDN deployment, headers, SPA routes and CI"],
        ],
        [28 * mm, 55 * mm, 83 * mm],
    ),
    Spacer(1, 5 * mm),
    P("Data flow", "H2x"),
    flow_table([
        ("UI", "Validated typed action"),
        ("Domain", "Transactional orchestration"),
        ("IndexedDB", "Durable local write first"),
        ("Cloud", "Version-aware RLS sync"),
    ], [36 * mm, 7 * mm, 36 * mm, 7 * mm, 36 * mm, 7 * mm, 36 * mm]),
    Spacer(1, 5 * mm),
    callout("Resilience rule", "A cloud failure cannot erase local work. Ordered mutations replay later; version mismatches offer Keep local, Keep cloud, or Duplicate both. Demo records never sync."),
    PageBreak(),
]

# AI
story += section("05 / Responsible AI and retrieval", "Generate structure. Preserve judgement.", "Protected Edge Functions handle full lessons, Quick Brief parsing, section adjustment, assessment generation and translation/adaptation.")
story += [
    flow_table([
        ("Auth", "Verify user and owner"),
        ("Quota", "5 demo / 25 teacher daily"),
        ("RAG", "Approved vector plus keyword matches"),
        ("Gemini", "Schema-bound JSON"),
        ("Check", "Repair once, score, disclose"),
    ], [29 * mm, 5 * mm, 29 * mm, 5 * mm, 29 * mm, 5 * mm, 29 * mm, 5 * mm, 29 * mm]),
    Spacer(1, 6 * mm),
    data_table(
        ["Control", "Implementation", "User-visible result"],
        [
            ["Secret isolation", "Gemini key only in Supabase secrets", "No key in Sources or network bundle"],
            ["Input validation", "Strict enums, lengths, counts and time bounds", "Actionable 400 response"],
            ["Source trust", "Only approved hybrid matches with licence and attribution", "Inspectable source cards"],
            ["Output validation", "JSON schema plus Zod", "Malformed response never enters library"],
            ["Repair", "One bounded retry with validation issues", "Reliable structure without retry loop"],
            ["Review", "AI questions enter as unreviewed variants", "Teacher accepts before bank use"],
            ["Quality", "Objectives, timing, offline, alignment, materials", "0-100 panel the teacher can inspect"],
            ["Failure", "Explicit provider/quota messages", "Prepared content never masquerades as AI"],
            ["Telemetry", "ID, model, status, latency, retrieval, score", "Operations without prompt contents"],
        ],
        [31 * mm, 69 * mm, 66 * mm],
    ),
    Spacer(1, 5 * mm),
    callout("Copyright boundary", "ChalkBox uses public curriculum taxonomy, original lesson wording, and properly licensed OER. It does not store or reproduce substantial textbook prose.", SUN_LIGHT),
    Spacer(1, 5 * mm),
    P("Quick Brief rule-based parsing and prepared examples are labelled. Teacher review remains mandatory for current syllabus fit, facts, language, safety, accessibility, and the needs of the actual class.", "Bodyx"),
    PageBreak(),
]

# Data and security
story += section("06 / Data, privacy and permissions", "No student profile is the strongest student privacy control.", "The domain model stores teacher work and group-level classroom evidence only.")
story += [
    data_table(
        ["Entity", "Persists", "Access rule"],
        [
            ["Profile", "Teacher identity and defaults", "Self read/update; role column not self-editable"],
            ["Lesson/version/share", "Content, history and immutable publication snapshot", "Owner CRUD; active token read only"],
            ["Classroom", "Aggregate count, resources, language and support context", "Owner only; no student names"],
            ["Question/worksheet", "Provenance, review and immutable item snapshots", "Owner or approved source policy"],
            ["Teaching/Quick Check", "Current step, notes and anonymous response counts", "Owner only"],
            ["Reflection", "What worked, change, outcome, next action", "Owner only"],
            ["Publication/report", "Submitted plan-version snapshot and moderation state", "Approved public read; author/admin scoped writes"],
            ["Curriculum", "Source metadata, chunks and vectors", "Approved read; admin write/index"],
            ["Generation event", "Operational metadata", "Owner/admin read; service write"],
        ],
        [32 * mm, 69 * mm, 65 * mm],
    ),
    Spacer(1, 6 * mm),
    P("Security controls", "H2x"),
    bullet("Postgres row-level security on every user/content/operation table."),
    bullet("Owner ID checked both in RLS and inside the generation function."),
    bullet("Admin role resolved with a security-definer helper and explicit admin gates."),
    bullet("Content Security Policy permits only self, Supabase, Turnstile, local workers and data/blob assets."),
    bullet("Turnstile integration is ready for passwordless and anonymous session abuse control."),
    bullet("Remote writes use record versions; stale edits create an explicit conflict instead of overwriting."),
    bullet("Environment files, provider keys, service keys, build output, browser binaries and local evidence are excluded from Git."),
    Spacer(1, 5 * mm),
    callout("Teacher note boundary", "The interface repeatedly says: capture a pattern, never a student name. There is no field or table for named student records."),
    PageBreak(),
]

# UX and offline
story += section("07 / UX, accessibility and offline", "Calm enough for preparation. Clear enough for a live class.", "The interface uses a paper-and-chalk visual language without sacrificing density, responsiveness, or keyboard clarity.")
story += [
    data_table(
        ["Design decision", "Specification", "Why it matters"],
        [
            ["Typography", "System sans, strong 700-900 hierarchy", "Fast loading and clear scanning"],
            ["Palette", "Moss green, warm paper, sun amber, coral alert", "Distinct brand with restrained status use"],
            ["Geometry", "12-24 px radii, thin borders, low shadows", "Friendly without visual noise"],
            ["Layout", "1440 px shell, 64/256 px navigation, mobile bottom bar", "Efficient desktop and one-hand mobile use"],
            ["Motion", "Short transitions, reduced-motion support", "Feedback without distraction"],
            ["Accessibility", "Landmarks, skip link, labels, focus rings, ARIA state", "Keyboard and assistive-tech baseline"],
            ["PDF scripts", "Self-hosted Noto Sans Latin and Devanagari", "Readable English, Hindi and bilingual exports"],
            ["States", "Loading, empty, offline, error, quota and missing record", "No ambiguous blank screens"],
            ["Offline", "Precache app shell; persist plan/session/reflection", "Teach through connectivity loss"],
        ],
        [34 * mm, 62 * mm, 70 * mm],
    ),
    Spacer(1, 6 * mm),
    P("Teach Mode priorities", "H2x"),
    bullet("High-contrast activity title and duration."),
    bullet("Teacher steps and learner actions separated into two columns on large screens."),
    bullet("Offline alternative and inclusive support visible without opening another page."),
    bullet("Timer, pause, full-screen action, progress bar and direct lesson-map navigation."),
    bullet("Learner Present Mode removes private teacher notes and exposes only projectable content."),
    bullet("Read-aloud is available where the browser supports speech synthesis."),
    bullet("Quick notes stored locally with a prominent no-student-name reminder."),
    Spacer(1, 5 * mm),
    callout("Offline truth", "AI generation and cloud sync require connectivity. Saved plans, editing, assessment resources, Teach Mode, reflection, print, PDF, and prepared demo remain available from the installed PWA."),
    PageBreak(),
]

# Evaluation alignment
story += section("08 / Evaluation alignment", "Built against what is judged.", "Every hackathon criterion maps to a concrete product and engineering proof point.")
story += [
    data_table(
        ["Criterion", "ChalkBox evidence"],
        [
            ["Innovation and creativity", "Quick Brief review, low-resource constraint engine, assessment-to-reflection loop, immutable trust model"],
            ["Technical implementation", "React PWA, IndexedDB, RLS Postgres, Edge Functions, pgvector, structured Gemini, PDF, CI"],
            ["Problem solving", "Starts from class size, materials, time, language and connectivity instead of idealised hardware"],
            ["Scalability", "Typed contracts, feature modules, vector index, owner indexes, rate limits, stateless Edge Functions"],
            ["User experience", "Responsive shell, voice assist, classroom profiles, autosave/history, Teach/Present, printable resources"],
            ["Code quality", "Strict TypeScript, Zod, repositories, shared domain package, lint, format, tests and documentation"],
            ["Presentation and documentation", "Seeded five-minute flow, report, demo guide, architecture, security and deployment docs"],
        ],
        [43 * mm, 123 * mm],
    ),
    Spacer(1, 6 * mm),
    P("Competitive differentiation", "H2x"),
    data_table(
        ["Common lesson AI", "ChalkBox"],
        [
            ["Prompt to text", "Brief to validated domain object"],
            ["Stops after generation", "Version, assess, worksheet, preview, teach, present, reflect and reuse"],
            ["Assumes connected smart classroom", "Offline alternative and real material constraints"],
            ["Citation as model text", "Server-derived provenance metadata"],
            ["Demo breaks when API fails", "Prepared and rule-based paths with explicit labels"],
            ["Mutable public copy", "Immutable expiring share and moderated publication snapshots"],
            ["Opaque quality", "Five deterministic checks updated during editing"],
            ["Analytics may imply student tracking", "Teacher-only, group-level reflection signals"],
        ],
        [80 * mm, 86 * mm],
    ),
    PageBreak(),
]

# Verification
story += section("09 / Verification", "Quality gates before the final URL.", "The repository includes executable checks for contracts, logic, components, full journeys, mobile behaviour, and accessibility.")
story += [
    data_table(
        ["Gate", "Coverage", "Current package status"],
        [
            ["Fixture validation", "Every seeded plan against shared schema", "Script included"],
            ["TypeScript", "App, tests, scripts, configs and shared package", "Pass"],
            ["ESLint", "TypeScript, React hooks and JSX accessibility", "Pass with zero warnings"],
            ["Unit/component", "Contracts, quality, fixtures, store, speech, sharing, moderation, queue", "25 tests pass"],
            ["Production build", "Code splitting, PWA manifest and service worker", "Pass"],
            ["Browser lifecycle", "Lesson, worksheet, community and mobile journeys", "Playwright suite included; CI gate"],
            ["Accessibility", "WCAG A/AA serious and critical automated scan", "axe suite included; CI gate"],
        ],
        [34 * mm, 76 * mm, 56 * mm],
    ),
    Spacer(1, 6 * mm),
    P("Never-break flows", "H2x"),
    bullet("Enter the prepared demo without setup."),
    bullet("Retain edited work after reload and recover it offline."),
    bullet("Keep Gemini keys out of the browser and reject owner mismatch."),
    bullet("Create immutable shares/publications and enforce expiry, revocation and moderation."),
    bullet("Build learner and answer-key PDFs from provenance-labelled question snapshots."),
    bullet("Preview, print, PDF export, public share and source disclosure."),
    bullet("Teach all steps, complete a reflection and see derived analytics."),
    bullet("Block guests from private routes and teachers from admin routes."),
    bullet("Reset only the demo workspace to canonical seeded data."),
    Spacer(1, 5 * mm),
    callout("Reproducibility", "GitHub Actions installs with the frozen pnpm lockfile, uploads the production build, runs Playwright after fast gates, and preserves the browser report."),
    PageBreak(),
]

# Deployment/free
story += section("10 / Free-first delivery", "A complete build without spending INR 1.", "The chosen services and limits keep the hackathon deployment inside free tiers while preserving a useful failure mode.")
story += [
    data_table(
        ["Service", "Purpose", "Cost control"],
        [
            ["Cloudflare Pages", "Static PWA, CDN, TLS, headers and SPA routing", "Free Pages project; immutable assets"],
            ["Cloudflare Turnstile", "CAPTCHA for auth/anonymous abuse", "Free widget; optional until configured"],
            ["Supabase", "Auth, Postgres, RLS, Edge Functions, pgvector", "Single free Mumbai project; usage alerts"],
            ["Gemini", "Lesson/actions JSON and embeddings", "Free-tier models; stricter application quotas"],
            ["GitHub", "Public source, PR, Actions and build artefacts", "Public repository and bounded CI"],
            ["Browser storage", "Offline plans and sessions", "No service cost"],
        ],
        [37 * mm, 66 * mm, 63 * mm],
    ),
    Spacer(1, 6 * mm),
    P("Deployment sequence", "H2x"),
    P("1. Apply Supabase migrations and confirm RLS.  2. Set Edge Function secrets.  3. Deploy generation, AI action, indexing and health functions.  4. Index approved original curriculum.  5. Connect GitHub to Cloudflare Pages.  6. Add public variables and Auth callbacks.  7. Enable Turnstile after hostname verification.  8. Run incognito, offline, PDF, share, moderation and role checks.", "Numberx"),
    Spacer(1, 5 * mm),
    callout("Graceful quota behaviour", "When a free AI quota is exhausted, the teacher can still open, edit, teach, duplicate, reflect, export, share saved plans, and use the prepared demo."),
    Spacer(1, 8 * mm),
    P("Definition of done", "H2x"),
    bullet("Source, production build, migrations, functions, tests, CI, documentation, report and ZIP are present."),
    bullet("Prepared demo completes the primary journey from a clean browser."),
    bullet("Cloud features require only public browser variables and server-side secrets."),
    bullet("Integration status distinguishes locally verified features from unconfigured hosted services."),
    bullet("Final hosted verification covers desktop, mobile, offline, auth, live AI/RAG, PDF, share, moderation and roles."),
    PageBreak(),
]

# Closing
story += section("11 / Closing", "Give every teacher a better starting point.", "ChalkBox does not try to replace the judgement, relationships, or local knowledge of a teacher. It removes avoidable preparation friction and makes the remaining decisions easier to inspect.")
story += [
    Spacer(1, 8 * mm),
    P("A useful lesson-planning system should not assume a projector, perfect internet, unlimited paper, one reading level, or an evening of free time.", "Quote"),
    Spacer(1, 6 * mm),
    callout("Build", "A complete, responsive, installable teacher workspace with Quick Brief, assessment, Teach/Present, reflection, sharing, community moderation and a deterministic judge path."),
    Spacer(1, 4 * mm),
    callout("Innovate", "Constraint-aware structured generation, hybrid attributable retrieval, immutable trust boundaries and the plan-to-reflection evidence loop.", SUN_LIGHT),
    Spacer(1, 4 * mm),
    callout("Impact", "More teacher time focused on learner thinking, with practical support that still works when resources do not."),
    Spacer(1, 16 * mm),
    data_table(
        ["Project", "Team", "Repository"],
        [["ChalkBox", "Team HarshLabs / Harshawardhan Chitnis", "github.com/harshawardhanchitnis/Omnikon_Hackathon_Harshawardhan_Chitnis"]],
        [35 * mm, 61 * mm, 70 * mm],
    ),
    Spacer(1, 12 * mm),
    P("Your classroom. Your plan. Powered by HarshLabs AI.", "Quote"),
]

doc = ChalkBoxDoc(str(OUTPUT))
doc.build(story)
print(OUTPUT)
