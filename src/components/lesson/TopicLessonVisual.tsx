import type { ReactNode } from 'react'

import {
  asNumber,
  asRecord,
  asRecordArray,
  asString,
  asStringArray,
  type JsonRecord,
} from '@/lib/lessonExperience'

type Props = {
  lesson: JsonRecord
}

type FrameProps = {
  title: string
  badge: string
  children: ReactNode
}

type DiagramLayout =
  | 'scene'
  | 'comparison'
  | 'process'
  | 'cycle'

type DiagramNode = {
  id: string
  label: string
  annotation: string
  shape: 'rect' | 'circle' | 'pill'
}

type DiagramArrow = {
  from: string
  to: string
  label: string
}

type PrimitiveKind =
  | 'container'
  | 'fluid'
  | 'hull'
  | 'rect'
  | 'circle'
  | 'line'
  | 'arrow'
  | 'wave'
  | 'label'

type PrimitiveEmphasis =
  | 'normal'
  | 'accent'
  | 'muted'

type BoardPrimitive = {
  kind: PrimitiveKind
  x: number
  y: number
  w: number
  h: number
  label: string
  emphasis: PrimitiveEmphasis
}

type BoardPanel = {
  title: string
  elements: BoardPrimitive[]
}

type PositionedNode = DiagramNode & {
  x: number
  y: number
}

type VisualModel = {
  title: string
  layout: DiagramLayout
  nodes: DiagramNode[]
  arrows: DiagramArrow[]
  panels: BoardPanel[]
  callouts: string[]
  drawingSteps: string[]
  notices: string[]
}

const stroke = '#eaf3e8'
const muted = '#b7d1bd'
const accent = '#f3c96b'
const soft = '#78b88e'
const panel = '#183e2e'
const board = '#102d21'

function clamp(
  value: number,
  min: number,
  max: number,
) {
  return Math.min(
    max,
    Math.max(min, value),
  )
}

function DiagramFrame({
  title,
  badge,
  children,
}: FrameProps) {
  return (
    <figure className="overflow-hidden rounded-[24px] border border-[#cfd9cc] bg-[#102d21] shadow-[0_10px_30px_rgba(16,45,33,0.12)] print:break-inside-avoid print:shadow-none">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-5 py-4 text-white">
        <div>
          <p className="text-[8px] font-extrabold uppercase tracking-[0.14em] text-[#a8cbb1]">
            Generated board visual
          </p>
          <h3 className="mt-1 text-sm font-extrabold">
            {title}
          </h3>
        </div>

        <span className="rounded-full border border-white/15 bg-white/[0.08] px-3 py-1.5 text-[8px] font-bold text-[#d5e7d8]">
          {badge}
        </span>
      </div>

      <div className="p-3 sm:p-5 print:p-3">
        {children}
      </div>
    </figure>
  )
}

function ArrowMarker() {
  return (
    <defs>
      <marker
        id="topic-board-arrow"
        markerWidth="8"
        markerHeight="8"
        refX="6"
        refY="3"
        orient="auto"
        markerUnits="strokeWidth"
      >
        <path
          d="M0,0 L0,6 L7,3 z"
          fill={accent}
        />
      </marker>
    </defs>
  )
}

function splitLines(
  value: string,
  maxChars: number,
  maxLines = 4,
) {
  const words = value
    .split(/\s+/)
    .filter(Boolean)

  if (words.length === 0) {
    return []
  }

  const lines: string[] = []
  let current = words[0]

  for (const word of words.slice(1)) {
    const candidate = `${current} ${word}`

    if (candidate.length <= maxChars) {
      current = candidate
    } else {
      lines.push(current)
      current = word
    }
  }

  lines.push(current)

  if (lines.length <= maxLines) {
    return lines
  }

  const visible = lines.slice(0, maxLines)
  visible[maxLines - 1] =
    `${visible[maxLines - 1].replace(/[.,;:]$/, '')}…`

  return visible
}

function readNode(
  value: unknown,
  index: number,
): DiagramNode | null {
  const record = asRecord(value)

  if (!record) {
    return null
  }

  const label =
    asString(record.label)?.trim()

  if (!label) {
    return null
  }

  const shape =
    asString(record.shape)

  return {
    id:
      asString(record.id)?.trim() ||
      `node-${index + 1}`,
    label,
    annotation:
      asString(record.annotation)?.trim() || '',
    shape:
      shape === 'circle' ||
      shape === 'pill' ||
      shape === 'rect'
        ? shape
        : 'rect',
  }
}

function readArrow(
  value: unknown,
): DiagramArrow | null {
  const record = asRecord(value)

  if (!record) {
    return null
  }

  const from =
    asString(record.from)?.trim()
  const to =
    asString(record.to)?.trim()

  if (!from || !to) {
    return null
  }

  return {
    from,
    to,
    label:
      asString(record.label)?.trim() || '',
  }
}

function readPrimitive(
  value: unknown,
): BoardPrimitive | null {
  const record = asRecord(value)

  if (!record) {
    return null
  }

  const kind = asString(record.kind)
  const allowedKinds: PrimitiveKind[] = [
    'container',
    'fluid',
    'hull',
    'rect',
    'circle',
    'line',
    'arrow',
    'wave',
    'label',
  ]

  if (
    !kind ||
    !allowedKinds.includes(
      kind as PrimitiveKind,
    )
  ) {
    return null
  }

  const rawEmphasis =
    asString(record.emphasis)
  const emphasis: PrimitiveEmphasis =
    rawEmphasis === 'accent' ||
    rawEmphasis === 'muted'
      ? rawEmphasis
      : 'normal'

  return {
    kind: kind as PrimitiveKind,
    x: clamp(asNumber(record.x) ?? 10, 0, 100),
    y: clamp(asNumber(record.y) ?? 10, 0, 100),
    w: clamp(asNumber(record.w) ?? 20, -100, 100),
    h: clamp(asNumber(record.h) ?? 20, -100, 100),
    label:
      asString(record.label)?.trim() || '',
    emphasis,
  }
}

function readPanel(
  value: unknown,
): BoardPanel | null {
  const record = asRecord(value)

  if (!record) {
    return null
  }

  const elements =
    asRecordArray(record.elements)
      .map(readPrimitive)
      .filter(
        (
          item,
        ): item is BoardPrimitive =>
          item !== null,
      )
      .slice(0, 18)

  if (elements.length === 0) {
    return null
  }

  return {
    title:
      asString(record.title)?.trim() || '',
    elements,
  }
}

function buildVisualModel(
  lesson: JsonRecord,
): VisualModel {
  const fullLesson =
    asRecord(lesson.fullLesson) ?? {}
  const visualize =
    asRecord(fullLesson.visualize) ?? {}
  const diagramSpec =
    asRecord(visualize.diagramSpec) ?? {}

  const lessonTitle =
    asString(lesson.title) ||
    'Science topic visual'
  const title =
    asString(diagramSpec.title)?.trim() ||
    lessonTitle
  const rawLayout =
    asString(diagramSpec.layout)?.trim()
  const layout: DiagramLayout =
    rawLayout === 'scene' ||
    rawLayout === 'comparison' ||
    rawLayout === 'cycle'
      ? rawLayout
      : 'process'

  const nodes =
    asRecordArray(diagramSpec.nodes)
      .map(readNode)
      .filter(
        (
          item,
        ): item is DiagramNode =>
          item !== null,
      )
      .slice(0, 6)

  const arrows =
    asRecordArray(diagramSpec.arrows)
      .map(readArrow)
      .filter(
        (
          item,
        ): item is DiagramArrow =>
          item !== null,
      )
      .slice(0, 10)

  const panels =
    asRecordArray(diagramSpec.panels)
      .map(readPanel)
      .filter(
        (
          item,
        ): item is BoardPanel =>
          item !== null,
      )
      .slice(0, 2)

  const drawingSteps =
    asStringArray(
      visualize.boardDrawingSteps,
    ).slice(0, 5)
  const notices =
    asStringArray(
      visualize.whatStudentsShouldNotice,
    ).slice(0, 5)
  const callouts =
    asStringArray(
      diagramSpec.callouts,
    ).slice(0, 4)

  return {
    title,
    layout:
      panels.length > 0
        ? layout === 'process' ||
          layout === 'cycle'
          ? 'scene'
          : layout
        : layout,
    nodes,
    arrows,
    panels,
    callouts,
    drawingSteps,
    notices,
  }
}

function primitiveStroke(
  emphasis: PrimitiveEmphasis,
) {
  if (emphasis === 'accent') {
    return accent
  }

  if (emphasis === 'muted') {
    return muted
  }

  return stroke
}

function normalizedPrimitiveLabel(
  primitive: BoardPrimitive,
) {
  return primitive.label
    .trim()
    .toLowerCase()
}

function isCoilPrimitive(
  primitive: BoardPrimitive,
) {
  return /\b(coil|solenoid)\b/i.test(
    primitive.label,
  )
}

function isMagnetPrimitive(
  primitive: BoardPrimitive,
) {
  return /\bmagnet\b/i.test(
    primitive.label,
  )
}

function isMeterPrimitive(
  primitive: BoardPrimitive,
) {
  return /galvanometer|needle|ammeter|voltmeter/i.test(
    primitive.label,
  ) || /^g\b/i.test(primitive.label.trim())
}

function isHeatPrimitive(
  primitive: BoardPrimitive,
) {
  return /heat source|flame|burner/i.test(
    primitive.label,
  )
}


function panelHasInductionSetup(
  panel: BoardPanel,
) {
  const hasCoil = panel.elements.some(
    isCoilPrimitive,
  )
  const hasMagnet = panel.elements.some(
    isMagnetPrimitive,
  )
  const hasMeter = panel.elements.some(
    isMeterPrimitive,
  )

  return hasCoil && hasMagnet && hasMeter
}

function panelStateText(
  panel: BoardPanel,
) {
  const haystack = [
    panel.title,
    ...panel.elements.map(
      (item) => item.label,
    ),
  ].join(' ')

  const moving = /moving|motion|induced|deflect/i.test(
    haystack,
  )

  return {
    moving,
    staticCase:
      /stationary|static|no current|needle:?\s*0/i.test(
        haystack,
      ) || !moving,
  }
}

function renderInductionPanel(
  panel: BoardPanel,
  width: number,
  height: number,
) {
  const state = panelStateText(
    panel,
  )
  const coilCx = width * 0.7
  const coilCy = height * 0.46
  const coilRadiusX = 22
  const coilRadiusY = 48
  const coilOffsets = [
    -48,
    -32,
    -16,
    0,
    16,
    32,
    48,
  ]
  const magnetWidth = 104
  const magnetHeight = 42
  const staticMagnetX = coilCx - 118
  const movingMagnetX = coilCx - 186
  const magnetX = state.moving
    ? movingMagnetX
    : staticMagnetX
  const magnetY = coilCy - magnetHeight / 2
  const meterCx = coilCx
  const meterCy = height * 0.77
  const meterRadius = 31
  const leftLeadX = coilCx - 44
  const rightLeadX = coilCx + 44
  const leadTopY = coilCy + 46
  const meterTerminalY =
    meterCy - meterRadius * 0.54
  const meterLeftTerminalX =
    meterCx - meterRadius * 0.84
  const meterRightTerminalX =
    meterCx + meterRadius * 0.84
  const resultText = state.moving
    ? 'Φ changing • induced current produced'
    : 'Φ constant • no induced current'
  const meterResult = state.moving
    ? 'needle deflects'
    : 'needle stays at 0'

  return (
    <g>
      <g>
        {coilOffsets.map(
          (offset) => (
            <ellipse
              key={offset}
              cx={coilCx + offset}
              cy={coilCy}
              rx={coilRadiusX}
              ry={coilRadiusY}
              fill="none"
              stroke={stroke}
              strokeWidth="2.4"
              opacity={offset === 0 ? 1 : 0.82}
            />
          ),
        )}

        <line
          x1={leftLeadX}
          y1={leadTopY}
          x2={leftLeadX}
          y2={meterTerminalY - 12}
          stroke={muted}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <line
          x1={rightLeadX}
          y1={leadTopY}
          x2={rightLeadX}
          y2={meterTerminalY - 12}
          stroke={muted}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <line
          x1={leftLeadX}
          y1={meterTerminalY - 12}
          x2={meterLeftTerminalX}
          y2={meterTerminalY}
          stroke={muted}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <line
          x1={rightLeadX}
          y1={meterTerminalY - 12}
          x2={meterRightTerminalX}
          y2={meterTerminalY}
          stroke={muted}
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        <rect
          x={magnetX}
          y={magnetY}
          width={magnetWidth}
          height={magnetHeight}
          rx="8"
          fill="#1d4736"
          stroke={stroke}
          strokeWidth="2.3"
        />
        <line
          x1={magnetX + magnetWidth / 2}
          y1={magnetY + 4}
          x2={magnetX + magnetWidth / 2}
          y2={magnetY + magnetHeight - 4}
          stroke={accent}
          strokeWidth="1.8"
        />
        <text
          x={magnetX + magnetWidth * 0.25}
          y={magnetY + magnetHeight / 2 + 1}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={accent}
          fontSize="13"
          fontWeight="900"
        >
          N
        </text>
        <text
          x={magnetX + magnetWidth * 0.75}
          y={magnetY + magnetHeight / 2 + 1}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={muted}
          fontSize="13"
          fontWeight="900"
        >
          S
        </text>

        {state.moving ? (
          <>
            <line
              x1={magnetX - 34}
              y1={coilCy}
              x2={magnetX - 6}
              y2={coilCy}
              stroke={accent}
              strokeWidth="3"
              strokeLinecap="round"
              markerEnd="url(#topic-board-arrow)"
            />
            <text
              x={magnetX - 20}
              y={coilCy - 15}
              textAnchor="middle"
              fill={accent}
              fontSize="10.5"
              fontWeight="800"
            >
              motion
            </text>
          </>
        ) : (
          <text
            x={magnetX + magnetWidth / 2}
            y={magnetY - 18}
            textAnchor="middle"
            fill={muted}
            fontSize="10.5"
            fontWeight="700"
          >
            stationary
          </text>
        )}

        <path
          d={`M ${meterCx - meterRadius * 0.68} ${meterCy + meterRadius * 0.14} Q ${meterCx} ${meterCy - meterRadius * 0.84} ${meterCx + meterRadius * 0.68} ${meterCy + meterRadius * 0.14}`}
          fill="none"
          stroke={muted}
          strokeWidth="1.7"
        />
        <circle
          cx={meterCx}
          cy={meterCy}
          r={meterRadius}
          fill="#163a2b"
          stroke={state.moving ? accent : stroke}
          strokeWidth="2.4"
        />
        <circle
          cx={meterLeftTerminalX}
          cy={meterTerminalY}
          r="2.7"
          fill={stroke}
        />
        <circle
          cx={meterRightTerminalX}
          cy={meterTerminalY}
          r="2.7"
          fill={stroke}
        />
        <line
          x1={meterCx}
          y1={meterCy + meterRadius * 0.1}
          x2={state.moving ? meterCx + meterRadius * 0.46 : meterCx}
          y2={meterCy - meterRadius * 0.56}
          stroke={accent}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle
          cx={meterCx}
          cy={meterCy + meterRadius * 0.1}
          r="3.2"
          fill={accent}
        />
        <text
          x={meterCx}
          y={meterCy + meterRadius * 0.67}
          textAnchor="middle"
          fill={stroke}
          fontSize="11"
          fontWeight="800"
        >
          G
        </text>
        <text
          x={meterCx - meterRadius * 0.84}
          y={meterCy - meterRadius * 0.92}
          textAnchor="middle"
          fill={muted}
          fontSize="9"
          fontWeight="700"
        >
          0
        </text>

        <line
          x1={magnetX + magnetWidth * 0.78}
          y1={coilCy - 13}
          x2={coilCx + 70}
          y2={coilCy - 13}
          stroke={soft}
          strokeWidth="1.8"
          strokeDasharray="6 5"
          opacity="0.9"
        />
        <line
          x1={magnetX + magnetWidth * 0.78}
          y1={coilCy + 13}
          x2={coilCx + 70}
          y2={coilCy + 13}
          stroke={soft}
          strokeWidth="1.8"
          strokeDasharray="6 5"
          opacity="0.9"
        />

        <text
          x={coilCx}
          y={coilCy - 70}
          textAnchor="middle"
          fill={muted}
          fontSize="11"
          fontWeight="700"
        >
          Coil
        </text>
        <text
          x={meterCx}
          y={meterCy + meterRadius + 16}
          textAnchor="middle"
          fill={muted}
          fontSize="10.5"
          fontWeight="700"
        >
          Galvanometer
        </text>
        <text
          x={width / 2}
          y={height - 18}
          textAnchor="middle"
          fill={stroke}
          fontSize="11"
          fontWeight="700"
        >
          {resultText} • {meterResult}
        </text>
      </g>
    </g>
  )
}

function primitiveMarkerPosition(
  primitive: BoardPrimitive,
  width: number,
  height: number,
) {
  const x =
    (primitive.x / 100) * width
  const y =
    (primitive.y / 100) * height
  const w =
    (primitive.w / 100) * width
  const h =
    (primitive.h / 100) * height

  if (
    primitive.kind === 'line' ||
    primitive.kind === 'arrow'
  ) {
    return {
      x: x + w / 2,
      y: y + h / 2,
    }
  }

  return {
    x: x + w / 2,
    y: y + h / 2,
  }
}

function SemanticMarker({
  x,
  y,
  number,
}: {
  x: number
  y: number
  number: number
}) {
  return (
    <g>
      <circle
        cx={x}
        cy={y}
        r="10"
        fill={accent}
        stroke={board}
        strokeWidth="2"
      />
      <text
        x={x}
        y={y + 0.5}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={board}
        fontSize="9"
        fontWeight="900"
      >
        {number}
      </text>
    </g>
  )
}

function renderSemanticPrimitive(
  primitive: BoardPrimitive,
  key: string,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
) {
  if (isCoilPrimitive(primitive)) {
    const safeW = Math.max(70, Math.abs(w))
    const safeH = Math.max(80, Math.abs(h))
    const cx = x + w / 2
    const cy = y + h / 2

    return (
      <g key={key}>
        {[-18, -9, 0, 9, 18].map(
          (offset) => (
            <ellipse
              key={offset}
              cx={cx + offset}
              cy={cy}
              rx={safeW * 0.27}
              ry={safeH * 0.42}
              fill="none"
              stroke={stroke}
              strokeWidth="2.3"
              opacity={offset === 0 ? 1 : 0.84}
            />
          ),
        )}
        <line
          x1={cx - safeW * 0.38}
          y1={cy + safeH * 0.46}
          x2={cx - safeW * 0.38}
          y2={cy + safeH * 0.65}
          stroke={muted}
          strokeWidth="2.2"
        />
        <line
          x1={cx + safeW * 0.38}
          y1={cy + safeH * 0.46}
          x2={cx + safeW * 0.38}
          y2={cy + safeH * 0.65}
          stroke={muted}
          strokeWidth="2.2"
        />
      </g>
    )
  }

  if (isMagnetPrimitive(primitive)) {
    const safeW = Math.max(72, Math.min(130, Math.abs(w)))
    const safeH = Math.max(34, Math.min(58, Math.abs(h)))
    const cx = x + w / 2
    const cy = y + h / 2
    const left = cx - safeW / 2
    const top = cy - safeH / 2

    return (
      <g key={key}>
        <rect
          x={left}
          y={top}
          width={safeW}
          height={safeH}
          rx="8"
          fill="#1d4736"
          stroke={stroke}
          strokeWidth="2.4"
        />
        <line
          x1={cx}
          y1={top + 3}
          x2={cx}
          y2={top + safeH - 3}
          stroke={accent}
          strokeWidth="2"
        />
        <text
          x={cx - safeW * 0.25}
          y={cy + 1}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={accent}
          fontSize="13"
          fontWeight="900"
        >
          N
        </text>
        <text
          x={cx + safeW * 0.25}
          y={cy + 1}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={muted}
          fontSize="13"
          fontWeight="900"
        >
          S
        </text>
      </g>
    )
  }

  if (isMeterPrimitive(primitive)) {
    const cx = x + w / 2
    const cy = y + h / 2
    const radius = Math.max(
      26,
      Math.min(46, Math.abs(w) / 2 || 32),
    )
    const deflected =
      /deflect|tilt|right|left/i.test(
        primitive.label,
      )
    const needleX =
      cx + (deflected ? radius * 0.45 : 0)
    const needleY = cy - radius * 0.5

    return (
      <g key={key}>
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="#163a2b"
          stroke={color}
          strokeWidth="2.5"
        />
        <path
          d={`M ${cx - radius * 0.6} ${cy + radius * 0.12} Q ${cx} ${cy - radius * 0.7} ${cx + radius * 0.6} ${cy + radius * 0.12}`}
          fill="none"
          stroke={muted}
          strokeWidth="1.6"
        />
        <line
          x1={cx}
          y1={cy + radius * 0.12}
          x2={needleX}
          y2={needleY}
          stroke={accent}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle
          cx={cx}
          cy={cy + radius * 0.12}
          r="3.5"
          fill={accent}
        />
        <text
          x={cx}
          y={cy + radius * 0.63}
          textAnchor="middle"
          fill={stroke}
          fontSize="11"
          fontWeight="800"
        >
          G
        </text>
      </g>
    )
  }

  if (isHeatPrimitive(primitive)) {
    const cx = x + w / 2
    const cy = y + h / 2

    return (
      <g key={key}>
        <path
          d={`M ${cx} ${cy + 22} C ${cx - 22} ${cy + 4}, ${cx - 9} ${cy - 10}, ${cx} ${cy - 28} C ${cx + 5} ${cy - 12}, ${cx + 25} ${cy - 4}, ${cx + 14} ${cy + 18} C ${cx + 9} ${cy + 27}, ${cx - 5} ${cy + 29}, ${cx} ${cy + 22} Z`}
          fill="none"
          stroke={accent}
          strokeWidth="2.8"
          strokeLinejoin="round"
        />
        <path
          d={`M ${cx} ${cy + 14} C ${cx - 8} ${cy + 4}, ${cx - 3} ${cy - 4}, ${cx + 2} ${cy - 12} C ${cx + 11} ${cy + 1}, ${cx + 10} ${cy + 9}, ${cx} ${cy + 14} Z`}
          fill={accent}
          opacity="0.8"
        />
      </g>
    )
  }

  return null
}

function renderPrimitive(
  primitive: BoardPrimitive,
  index: number,
  width: number,
  height: number,
  showLabel = true,
) {
  const x =
    (primitive.x / 100) * width
  const y =
    (primitive.y / 100) * height
  const w =
    (primitive.w / 100) * width
  const h =
    (primitive.h / 100) * height
  const color =
    primitiveStroke(
      primitive.emphasis,
    )
  const key =
    `${primitive.kind}-${index}`
  const label =
    showLabel
      ? primitive.label
      : ''
  const semantic =
    renderSemanticPrimitive(
      primitive,
      key,
      x,
      y,
      w,
      h,
      color,
    )

  if (semantic) {
    return semantic
  }

  if (primitive.kind === 'container') {
    return (
      <g key={key}>
        <path
          d={`M ${x} ${y} L ${x} ${y + h} L ${x + w} ${y + h} L ${x + w} ${y}`}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {label && (
          <DiagramLabel
            x={x + w / 2}
            y={y + h + 22}
            value={label}
            color={muted}
            maxChars={22}
          />
        )}
      </g>
    )
  }

  if (primitive.kind === 'fluid') {
    return (
      <g key={key}>
        <rect
          x={x}
          y={y}
          width={Math.max(0, w)}
          height={Math.max(0, h)}
          rx="5"
          fill="#285d49"
          opacity="0.72"
        />
        <path
          d={`M ${x} ${y} q ${w / 8} -7 ${w / 4} 0 t ${w / 4} 0 t ${w / 4} 0 t ${w / 4} 0`}
          fill="none"
          stroke={soft}
          strokeWidth="2"
        />
        {label && (
          <DiagramLabel
            x={x + Math.max(42, w * 0.28)}
            y={y + h - 16}
            value={label}
            color={stroke}
            maxChars={16}
          />
        )}
      </g>
    )
  }

  if (primitive.kind === 'hull') {
    return (
      <g key={key}>
        <path
          d={`M ${x} ${y} L ${x + w} ${y} L ${x + w * 0.82} ${y + h} L ${x + w * 0.18} ${y + h} Z`}
          fill="#254e3d"
          stroke={color}
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <line
          x1={x + w * 0.18}
          y1={y + h * 0.52}
          x2={x + w * 0.82}
          y2={y + h * 0.52}
          stroke={muted}
          strokeDasharray="5 5"
        />
        {label && (
          <DiagramLabel
            x={x + w / 2}
            y={y + h / 2 + 4}
            value={label}
            color={stroke}
            maxChars={18}
          />
        )}
      </g>
    )
  }

  if (primitive.kind === 'rect') {
    return (
      <g key={key}>
        <rect
          x={x}
          y={y}
          width={Math.max(2, w)}
          height={Math.max(2, h)}
          rx="10"
          fill={panel}
          stroke={color}
          strokeWidth="2.5"
        />
        {label && (
          <DiagramLabel
            x={x + w / 2}
            y={y + h / 2}
            value={label}
            color={stroke}
            maxChars={18}
          />
        )}
      </g>
    )
  }

  if (primitive.kind === 'circle') {
    return (
      <g key={key}>
        <ellipse
          cx={x + w / 2}
          cy={y + h / 2}
          rx={Math.max(5, Math.abs(w) / 2)}
          ry={Math.max(5, Math.abs(h) / 2)}
          fill={panel}
          stroke={color}
          strokeWidth="2.5"
        />
        {label && (
          <DiagramLabel
            x={x + w / 2}
            y={y + h / 2}
            value={label}
            color={stroke}
            maxChars={14}
          />
        )}
      </g>
    )
  }

  if (
    primitive.kind === 'line' ||
    primitive.kind === 'arrow'
  ) {
    const endX = x + w
    const endY = y + h

    return (
      <g key={key}>
        <line
          x1={x}
          y1={y}
          x2={endX}
          y2={endY}
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          markerEnd={
            primitive.kind === 'arrow'
              ? 'url(#topic-board-arrow)'
              : undefined
          }
        />
        {label && (
          <DiagramLabel
            x={(x + endX) / 2}
            y={(y + endY) / 2 - 10}
            value={label}
            color={color}
            maxChars={18}
          />
        )}
      </g>
    )
  }

  if (primitive.kind === 'wave') {
    return (
      <g key={key}>
        <path
          d={`M ${x} ${y} q ${w / 8} -8 ${w / 4} 0 t ${w / 4} 0 t ${w / 4} 0 t ${w / 4} 0`}
          fill="none"
          stroke={color}
          strokeWidth="3"
        />
        {label && (
          <DiagramLabel
            x={x + w / 2}
            y={y - 14}
            value={label}
            color={muted}
            maxChars={20}
          />
        )}
      </g>
    )
  }

  return (
    <DiagramLabel
      key={key}
      x={x}
      y={y}
      value={label}
      color={color}
      maxChars={24}
    />
  )
}

function DiagramLabel({
  x,
  y,
  value,
  color,
  maxChars,
}: {
  x: number
  y: number
  value: string
  color: string
  maxChars: number
}) {
  const lines =
    splitLines(
      value,
      maxChars,
      3,
    )

  return (
    <text
      x={x}
      y={y - ((lines.length - 1) * 8)}
      textAnchor="middle"
      dominantBaseline="middle"
      fill={color}
      fontSize="12"
      fontWeight="700"
    >
      {lines.map(
        (line, index) => (
          <tspan
            key={`${line}-${index}`}
            x={x}
            dy={index === 0 ? 0 : 16}
          >
            {line}
          </tspan>
        ),
      )}
    </text>
  )
}

function ScenePanel({
  panel: currentPanel,
  x,
  y,
  width,
  height,
}: {
  panel: BoardPanel
  x: number
  y: number
  width: number
  height: number
}) {
  const genericLabels =
    new Set([
      'beaker',
      'container',
      'vessel',
      'glass',
    ])
  const grouped =
    new Map<
      string,
      {
        label: string
        count: number
      }
    >()

  for (const item of
    currentPanel.elements) {
    const normalized =
      normalizedPrimitiveLabel(
        item,
      )

    if (
      !normalized ||
      genericLabels.has(
        normalized,
      )
    ) {
      continue
    }

    const existing =
      grouped.get(normalized)

    grouped.set(
      normalized,
      existing
        ? {
            ...existing,
            count:
              existing.count + 1,
          }
        : {
            label:
              item.label.trim(),
            count: 1,
          },
    )
  }

  const legendItems =
    [...grouped.entries()]
      .slice(0, 6)
      .map(
        (
          [normalized, item],
          index,
        ) => ({
          normalized,
          label: item.label,
          count: item.count,
          number: index + 1,
        }),
      )
  const legendIndex =
    new Map(
      legendItems.map(
        (item) => [
          item.normalized,
          item.number,
        ],
      ),
    )
  const firstMarked =
    new Set<string>()
  const legendRows =
    Math.ceil(
      legendItems.length / 2,
    )
  const legendHeight =
    legendItems.length > 0
      ? 32 + legendRows * 28
      : 18
  const drawingHeight =
    Math.max(
      190,
      height -
        legendHeight -
        58,
    )
  const isInductionPanel =
    panelHasInductionSetup(
      currentPanel,
    )

  return (
    <g transform={`translate(${x} ${y})`}>
      <rect
        x="0"
        y="0"
        width={width}
        height={height}
        rx="22"
        fill="#143527"
        stroke="#2f6048"
        strokeWidth="2"
      />

      {currentPanel.title && (
        <text
          x={width / 2}
          y="28"
          textAnchor="middle"
          fill={accent}
          fontSize="13"
          fontWeight="800"
        >
          {currentPanel.title}
        </text>
      )}

      {isInductionPanel ? (
        renderInductionPanel(
          currentPanel,
          width,
          height,
        )
      ) : (
        <>
          <g transform="translate(0 42)">
            {currentPanel.elements.map(
              (item, index) => {
                const normalized =
                  normalizedPrimitiveLabel(
                    item,
                  )
                const number =
                  legendIndex.get(
                    normalized,
                  )
                const shouldMark =
                  Boolean(number) &&
                  !firstMarked.has(
                    normalized,
                  )

                if (shouldMark) {
                  firstMarked.add(
                    normalized,
                  )
                }

                const marker =
                  shouldMark && number
                    ? primitiveMarkerPosition(
                        item,
                        width,
                        drawingHeight,
                      )
                    : null

                return (
                  <g
                    key={`${item.kind}-${index}`}
                  >
                    {renderPrimitive(
                      item,
                      index,
                      width,
                      drawingHeight,
                      false,
                    )}

                    {marker && number && (
                      <SemanticMarker
                        x={clamp(
                          marker.x + 13,
                          14,
                          width - 14,
                        )}
                        y={clamp(
                          marker.y - 13,
                          14,
                          drawingHeight - 14,
                        )}
                        number={number}
                      />
                    )}
                  </g>
                )
              },
            )}
          </g>

          {legendItems.length > 0 && (
            <g
              transform={`translate(16 ${height - legendHeight})`}
            >
              <line
                x1="0"
                y1="0"
                x2={width - 32}
                y2="0"
                stroke="#315445"
                strokeWidth="1"
              />

              {legendItems.map(
                (item, index) => {
                  const column =
                    index % 2
                  const row =
                    Math.floor(
                      index / 2,
                    )
                  const itemWidth =
                    (width - 42) / 2
                  const itemX =
                    6 +
                    column *
                      (itemWidth + 12)
                  const itemY =
                    16 + row * 28
                  const suffix =
                    item.count > 1
                      ? ` ×${item.count}`
                      : ''
                  const display =
                    `${item.label}${suffix}`

                  return (
                    <g
                      key={
                        item.normalized
                      }
                      transform={`translate(${itemX} ${itemY})`}
                    >
                      <circle
                        cx="9"
                        cy="7"
                        r="8"
                        fill={accent}
                      />
                      <text
                        x="9"
                        y="7.5"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill={board}
                        fontSize="8"
                        fontWeight="900"
                      >
                        {item.number}
                      </text>
                      <text
                        x="23"
                        y="8"
                        fill={muted}
                        fontSize="9.5"
                        fontWeight="700"
                      >
                        {splitLines(
                          display,
                          30,
                          1,
                        )[0]}
                      </text>
                    </g>
                  )
                },
              )}
            </g>
          )}
        </>
      )}
    </g>
  )
}

function SceneDiagram({
  visual,
}: {
  visual: VisualModel
}) {
  if (visual.panels.length === 0) {
    return null
  }

  const isComparison =
    visual.panels.length === 2
  const panelWidth =
    isComparison ? 420 : 820
  const panelHeight = 400

  return (
    <svg
      viewBox="0 0 940 500"
      className="h-auto w-full"
      role="img"
      aria-label={visual.title}
      preserveAspectRatio="xMidYMid meet"
    >
      <ArrowMarker />

      <rect
        x="18"
        y="18"
        width="904"
        height="464"
        rx="28"
        fill={board}
        stroke="#244b39"
        strokeWidth="2"
      />

      {isComparison ? (
        <>
          <ScenePanel
            panel={visual.panels[0]}
            x={42}
            y={50}
            width={panelWidth}
            height={panelHeight}
          />
          <ScenePanel
            panel={visual.panels[1]}
            x={478}
            y={50}
            width={panelWidth}
            height={panelHeight}
          />
        </>
      ) : (
        <ScenePanel
          panel={visual.panels[0]}
          x={60}
          y={50}
          width={panelWidth}
          height={panelHeight}
        />
      )}
    </svg>
  )
}

function buildPositions(
  layout: DiagramLayout,
  nodes: DiagramNode[],
): PositionedNode[] {
  if (layout === 'comparison') {
    const splitIndex =
      Math.ceil(nodes.length / 2)
    const left =
      nodes.slice(0, splitIndex)
    const right =
      nodes.slice(splitIndex)
    const result: PositionedNode[] = []

    left.forEach((node, index) => {
      result.push({
        ...node,
        x: 245,
        y:
          left.length === 1
            ? 250
            : 150 + index * 190,
      })
    })

    right.forEach((node, index) => {
      result.push({
        ...node,
        x: 695,
        y:
          right.length === 1
            ? 250
            : 150 + index * 190,
      })
    })

    return result
  }

  if (layout === 'cycle') {
    const centerX = 470
    const centerY = 250
    const radius = 160

    return nodes.map(
      (node, index) => {
        const angle =
          (Math.PI * 2 * index) /
            Math.max(1, nodes.length) -
          Math.PI / 2

        return {
          ...node,
          x:
            centerX +
            Math.cos(angle) * radius,
          y:
            centerY +
            Math.sin(angle) * radius,
        }
      },
    )
  }

  const count = nodes.length
  const step =
    count <= 1
      ? 0
      : 650 / (count - 1)

  return nodes.map(
    (node, index) => ({
      ...node,
      x:
        count <= 1
          ? 470
          : 145 + step * index,
      y: 250,
    }),
  )
}

function getNodeBox(
  node: PositionedNode,
) {
  if (node.shape === 'circle') {
    return {
      width: 130,
      height: 130,
      radius: 65,
    }
  }

  if (node.shape === 'pill') {
    return {
      width: 260,
      height: 92,
      radius: 46,
    }
  }

  return {
    width: 250,
    height: 104,
    radius: 20,
  }
}

function renderNode(
  node: PositionedNode,
) {
  const box = getNodeBox(node)
  const labelLines = splitLines(
    node.label,
    node.shape === 'circle' ? 14 : 24,
    3,
  )
  const annotationLines = splitLines(
    node.annotation,
    28,
    2,
  )

  return (
    <g key={node.id}>
      <rect
        x={node.x - box.width / 2}
        y={node.y - box.height / 2}
        width={box.width}
        height={box.height}
        rx={box.radius}
        fill={panel}
        stroke={soft}
        strokeWidth="2"
      />

      <text
        x={node.x}
        y={
          node.y -
          (annotationLines.length > 0
            ? 20
            : 8)
        }
        textAnchor="middle"
        fill={stroke}
        fontSize="15"
        fontWeight="700"
      >
        {labelLines.map(
          (line, index) => (
            <tspan
              key={`${node.id}-label-${index}`}
              x={node.x}
              dy={index === 0 ? 0 : 19}
            >
              {line}
            </tspan>
          ),
        )}
      </text>

      {annotationLines.length > 0 && (
        <text
          x={node.x}
          y={node.y + 24}
          textAnchor="middle"
          fill={muted}
          fontSize="11"
          fontWeight="500"
        >
          {annotationLines.map(
            (line, index) => (
              <tspan
                key={`${node.id}-note-${index}`}
                x={node.x}
                dy={index === 0 ? 0 : 15}
              >
                {line}
              </tspan>
            ),
          )}
        </text>
      )}
    </g>
  )
}

function renderArrow(
  arrow: DiagramArrow,
  positions: Map<string, PositionedNode>,
  index: number,
) {
  const from = positions.get(arrow.from)
  const to = positions.get(arrow.to)

  if (!from || !to) {
    return null
  }

  const dx = to.x - from.x
  const dy = to.y - from.y
  const distance =
    Math.sqrt(dx * dx + dy * dy) || 1
  const fromBox = getNodeBox(from)
  const toBox = getNodeBox(to)
  const startOffset =
    Math.min(
      fromBox.width,
      fromBox.height,
    ) /
      2 +
    10
  const endOffset =
    Math.min(
      toBox.width,
      toBox.height,
    ) /
      2 +
    10
  const startX =
    from.x +
    (dx / distance) * startOffset
  const startY =
    from.y +
    (dy / distance) * startOffset
  const endX =
    to.x -
    (dx / distance) * endOffset
  const endY =
    to.y -
    (dy / distance) * endOffset
  const midX =
    (startX + endX) / 2
  const midY =
    (startY + endY) / 2

  return (
    <g key={`arrow-${index}`}>
      <line
        x1={startX}
        y1={startY}
        x2={endX}
        y2={endY}
        stroke={accent}
        strokeWidth="3"
        markerEnd="url(#topic-board-arrow)"
      />
      {arrow.label && (
        <DiagramLabel
          x={midX}
          y={midY - 10}
          value={arrow.label}
          color={muted}
          maxChars={20}
        />
      )}
    </g>
  )
}

function ConceptDiagram({
  visual,
}: {
  visual: VisualModel
}) {
  const nodes =
    visual.nodes.length > 0
      ? buildPositions(
          visual.layout,
          visual.nodes,
        )
      : []
  const positions =
    new Map(
      nodes.map((node) => [
        node.id,
        node,
      ]),
    )

  if (nodes.length === 0) {
    return (
      <div className="rounded-[22px] border border-white/10 bg-[#143527] p-5 text-[#e6efe4]">
        <p className="text-[11px] font-semibold leading-6">
          Use the board-drawing steps below as the visual plan. The generated lesson did not return a structured diagram scene for this request.
        </p>
      </div>
    )
  }

  return (
    <svg
      viewBox="0 0 940 500"
      className="h-auto w-full"
      role="img"
      aria-label={visual.title}
      preserveAspectRatio="xMidYMid meet"
    >
      <ArrowMarker />

      <rect
        x="18"
        y="18"
        width="904"
        height="464"
        rx="28"
        fill={board}
        stroke="#244b39"
        strokeWidth="2"
      />

      {visual.layout === 'comparison' && (
        <>
          <line
            x1="470"
            y1="70"
            x2="470"
            y2="440"
            stroke="#315445"
            strokeWidth="2"
            strokeDasharray="7 7"
          />
          <text
            x="245"
            y="60"
            textAnchor="middle"
            fill={accent}
            fontSize="13"
            fontWeight="800"
          >
            SIDE A
          </text>
          <text
            x="695"
            y="60"
            textAnchor="middle"
            fill={accent}
            fontSize="13"
            fontWeight="800"
          >
            SIDE B
          </text>
        </>
      )}

      {visual.arrows.map(
        (arrow, index) =>
          renderArrow(
            arrow,
            positions,
            index,
          ),
      )}

      {nodes.map(renderNode)}
    </svg>
  )
}

function NotesPanel({
  title,
  items,
}: {
  title: string
  items: string[]
}) {
  if (items.length === 0) {
    return null
  }

  return (
    <div className="rounded-2xl border border-[#d5e3d2] bg-[#f7faf5] p-4 text-[#26362d] print:break-inside-avoid">
      <p className="text-[8px] font-extrabold uppercase tracking-[0.14em] text-[#3b7752]">
        {title}
      </p>
      <div className="mt-3 grid gap-2">
        {items.map(
          (item, index) => (
            <div
              key={`${title}-${index}`}
              className="flex gap-3 rounded-xl border border-[#e1e9df] bg-white px-3 py-3 text-[11px] font-medium leading-5 text-[#425048]"
            >
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#f3c96b] text-[9px] font-extrabold text-[#183e2e]">
                {index + 1}
              </span>
              <span>{item}</span>
            </div>
          ),
        )}
      </div>
    </div>
  )
}

function Callouts({
  items,
}: {
  items: string[]
}) {
  if (items.length === 0) {
    return null
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {items.map((item, index) => (
        <div
          key={`${item}-${index}`}
          className="rounded-xl border border-[#d5e3d2] bg-[#edf5e9] px-4 py-3 text-[10px] font-bold leading-5 text-[#34503e]"
        >
          {item}
        </div>
      ))}
    </div>
  )
}

function TopicLessonVisual({
  lesson,
}: Props) {
  const visual =
    buildVisualModel(lesson)
  const hasScene =
    visual.panels.length > 0
  const badge = hasScene
    ? visual.panels.length === 2
      ? 'Board sketch · comparison'
      : 'Board sketch'
    : visual.layout === 'comparison'
      ? 'Comparison diagram'
      : visual.layout === 'cycle'
        ? 'Cycle diagram'
        : 'Process diagram'

  return (
    <div className="space-y-4">
      <DiagramFrame
        title={visual.title}
        badge={badge}
      >
        {hasScene ? (
          <SceneDiagram visual={visual} />
        ) : (
          <ConceptDiagram visual={visual} />
        )}
      </DiagramFrame>

      <Callouts
        items={visual.callouts}
      />

      <div className="grid gap-4 lg:grid-cols-2 print:grid-cols-2">
        <NotesPanel
          title="How to draw it on the board"
          items={visual.drawingSteps}
        />

        <NotesPanel
          title="What students should notice"
          items={visual.notices}
        />
      </div>
    </div>
  )
}

export default TopicLessonVisual
