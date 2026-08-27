import type { ReactNode } from 'react'

import ElectricityCircuitDiagram from '@/components/lesson/ElectricityCircuitDiagram'
import PrivateTextbookLessonVisual from '@/components/lesson/PrivateTextbookLessonVisual'
import TopicLessonVisual from '@/components/lesson/TopicLessonVisual'

import type { JsonRecord } from '@/lib/lessonExperience'
import type { LessonSourceMode } from '@/lib/lessonPresentation'

type Props = {
  lessonKey: string
  lesson?: JsonRecord
  sourceMode?: LessonSourceMode
}

type FrameProps = {
  title: string
  sourcePage: string
  children: ReactNode
}

function DiagramFrame({
  title,
  sourcePage,
  children,
}: FrameProps) {
  return (
    <figure className="overflow-hidden rounded-[24px] border border-[#cfd9cc] bg-[#102d21] shadow-[0_10px_30px_rgba(16,45,33,0.12)]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-5 py-4 text-white">
        <div>
          <p className="text-[8px] font-extrabold uppercase tracking-[0.14em] text-[#a8cbb1]">
            Board visual
          </p>
          <h3 className="mt-1 text-sm font-extrabold">
            {title}
          </h3>
        </div>

        <span className="rounded-full border border-white/15 bg-white/[0.08] px-3 py-1.5 text-[8px] font-bold text-[#d5e7d8]">
          {sourcePage}
        </span>
      </div>

      <div className="overflow-x-auto p-4 sm:p-6">
        {children}
      </div>
    </figure>
  )
}

const stroke = '#eaf3e8'
const muted = '#b7d1bd'
const accent = '#f3c96b'
const soft = '#78b88e'

function ArrowMarker() {
  return (
    <defs>
      <marker
        id="chalkbox-arrow"
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

function LifeProcessesVisual() {
  return (
    <DiagramFrame
      title="Break-down of glucose by various pathways"
      sourcePage="Textbook page 10"
    >
      <svg
        viewBox="0 0 980 430"
        className="min-w-[760px] w-full"
        role="img"
        aria-label="Flowchart showing glucose breaking down to pyruvate and then into aerobic and anaerobic respiration pathways"
      >
        <ArrowMarker />

        <rect x="35" y="165" width="190" height="78" rx="16" fill="#183e2e" stroke={soft} strokeWidth="2" />
        <text x="130" y="195" textAnchor="middle" fill={stroke} fontSize="18" fontWeight="700">Glucose</text>
        <text x="130" y="221" textAnchor="middle" fill={muted} fontSize="14">6-carbon molecule</text>

        <line x1="225" y1="204" x2="355" y2="204" stroke={accent} strokeWidth="3" markerEnd="url(#chalkbox-arrow)" />
        <text x="290" y="187" textAnchor="middle" fill={muted} fontSize="13">in cytoplasm</text>

        <rect x="365" y="150" width="220" height="108" rx="18" fill="#183e2e" stroke={soft} strokeWidth="2" />
        <text x="475" y="190" textAnchor="middle" fill={stroke} fontSize="18" fontWeight="700">Pyruvate</text>
        <text x="475" y="216" textAnchor="middle" fill={muted} fontSize="14">3-carbon molecule</text>
        <text x="475" y="239" textAnchor="middle" fill={accent} fontSize="13">+ small amount of energy</text>

        <line x1="585" y1="180" x2="685" y2="80" stroke={accent} strokeWidth="3" markerEnd="url(#chalkbox-arrow)" />
        <line x1="585" y1="204" x2="685" y2="204" stroke={accent} strokeWidth="3" markerEnd="url(#chalkbox-arrow)" />
        <line x1="585" y1="230" x2="685" y2="330" stroke={accent} strokeWidth="3" markerEnd="url(#chalkbox-arrow)" />

        <rect x="695" y="25" width="245" height="105" rx="18" fill="#183e2e" stroke={soft} strokeWidth="2" />
        <text x="817" y="53" textAnchor="middle" fill={accent} fontSize="13" fontWeight="700">ABSENCE OF O₂ · YEAST</text>
        <text x="817" y="82" textAnchor="middle" fill={stroke} fontSize="16" fontWeight="700">Ethanol + CO₂</text>
        <text x="817" y="106" textAnchor="middle" fill={muted} fontSize="13">+ energy</text>

        <rect x="695" y="151" width="245" height="105" rx="18" fill="#183e2e" stroke={soft} strokeWidth="2" />
        <text x="817" y="179" textAnchor="middle" fill={accent} fontSize="13" fontWeight="700">LOW O₂ · MUSCLES</text>
        <text x="817" y="208" textAnchor="middle" fill={stroke} fontSize="16" fontWeight="700">Lactic acid</text>
        <text x="817" y="232" textAnchor="middle" fill={muted} fontSize="13">+ energy · cramps</text>

        <rect x="695" y="277" width="245" height="118" rx="18" fill="#183e2e" stroke={soft} strokeWidth="2" />
        <text x="817" y="305" textAnchor="middle" fill={accent} fontSize="13" fontWeight="700">O₂ PRESENT · MITOCHONDRIA</text>
        <text x="817" y="337" textAnchor="middle" fill={stroke} fontSize="16" fontWeight="700">CO₂ + H₂O</text>
        <text x="817" y="364" textAnchor="middle" fill={muted} fontSize="13">+ more energy</text>
      </svg>
    </DiagramFrame>
  )
}

function ElectroplatingVisual() {
  return (
    <DiagramFrame
      title="Copper electroplating circuit"
      sourcePage="Textbook page 7"
    >
      <svg
        viewBox="0 0 900 470"
        className="min-w-[700px] w-full"
        role="img"
        aria-label="Electroplating diagram with copper sulphate solution, positive and negative copper plates, battery and copper transfer"
      >
        <ArrowMarker />

        <line x1="250" y1="55" x2="650" y2="55" stroke={stroke} strokeWidth="3" />
        <line x1="430" y1="40" x2="430" y2="70" stroke={stroke} strokeWidth="4" />
        <line x1="450" y1="46" x2="450" y2="64" stroke={stroke} strokeWidth="2" />
        <line x1="475" y1="40" x2="475" y2="70" stroke={stroke} strokeWidth="4" />
        <line x1="495" y1="46" x2="495" y2="64" stroke={stroke} strokeWidth="2" />
        <text x="462" y="28" textAnchor="middle" fill={muted} fontSize="13">Battery</text>
        <text x="375" y="48" fill={accent} fontSize="18" fontWeight="700">+</text>
        <text x="520" y="49" fill={accent} fontSize="18" fontWeight="700">−</text>

        <line x1="250" y1="55" x2="250" y2="155" stroke={stroke} strokeWidth="3" />
        <line x1="650" y1="55" x2="650" y2="155" stroke={stroke} strokeWidth="3" />

        <path d="M160 140 L160 410 Q160 435 185 435 L715 435 Q740 435 740 410 L740 140" fill="none" stroke={stroke} strokeWidth="4" />
        <rect x="165" y="230" width="570" height="200" fill="#194c3b" opacity="0.8" />
        <text x="450" y="407" textAnchor="middle" fill={muted} fontSize="14">Copper sulphate solution</text>

        <rect x="215" y="145" width="70" height="220" rx="8" fill="#b86f4b" stroke={stroke} strokeWidth="2" />
        <rect x="615" y="145" width="70" height="220" rx="8" fill="#b86f4b" stroke={stroke} strokeWidth="2" />
        <text x="250" y="390" textAnchor="middle" fill={stroke} fontSize="13" fontWeight="700">Copper plate</text>
        <text x="650" y="390" textAnchor="middle" fill={stroke} fontSize="13" fontWeight="700">Copper plate</text>
        <text x="250" y="128" textAnchor="middle" fill={accent} fontSize="14" fontWeight="700">ANODE (+)</text>
        <text x="650" y="128" textAnchor="middle" fill={accent} fontSize="14" fontWeight="700">CATHODE (−)</text>

        <line x1="300" y1="265" x2="430" y2="265" stroke={accent} strokeWidth="3" markerEnd="url(#chalkbox-arrow)" />
        <line x1="470" y1="300" x2="595" y2="300" stroke={accent} strokeWidth="3" markerEnd="url(#chalkbox-arrow)" />
        <text x="450" y="248" textAnchor="middle" fill={muted} fontSize="13">Cu enters solution</text>
        <text x="535" y="325" textAnchor="middle" fill={muted} fontSize="13">Cu deposits</text>
      </svg>
    </DiagramFrame>
  )
}

function ConductorTesterVisual() {
  return (
    <DiagramFrame
      title="Testing a material for electrical conductivity"
      sourcePage="Textbook page 14"
    >
      <svg
        viewBox="0 0 920 390"
        className="min-w-[720px] w-full"
        role="img"
        aria-label="Simple circuit with cell, bulb, clips A and B and a test sample between the clips"
      >
        <ArrowMarker />

        <line x1="120" y1="200" x2="260" y2="200" stroke={stroke} strokeWidth="4" />
        <line x1="260" y1="200" x2="260" y2="90" stroke={stroke} strokeWidth="4" />
        <line x1="260" y1="90" x2="380" y2="90" stroke={stroke} strokeWidth="4" />

        <circle cx="440" cy="90" r="42" fill="#183e2e" stroke={stroke} strokeWidth="3" />
        <path d="M420 105 Q440 70 460 105" fill="none" stroke={accent} strokeWidth="4" />
        <line x1="440" y1="48" x2="440" y2="25" stroke={accent} strokeWidth="3" />
        <line x1="405" y1="60" x2="390" y2="42" stroke={accent} strokeWidth="3" />
        <line x1="475" y1="60" x2="490" y2="42" stroke={accent} strokeWidth="3" />
        <text x="440" y="158" textAnchor="middle" fill={muted} fontSize="14">Torch bulb</text>

        <line x1="482" y1="90" x2="620" y2="90" stroke={stroke} strokeWidth="4" />
        <circle cx="640" cy="90" r="8" fill={accent} />
        <text x="640" y="65" textAnchor="middle" fill={stroke} fontSize="14" fontWeight="700">A</text>

        <circle cx="760" cy="200" r="8" fill={accent} />
        <text x="760" y="232" textAnchor="middle" fill={stroke} fontSize="14" fontWeight="700">B</text>
        <line x1="760" y1="200" x2="820" y2="200" stroke={stroke} strokeWidth="4" />
        <line x1="820" y1="200" x2="820" y2="300" stroke={stroke} strokeWidth="4" />
        <line x1="820" y1="300" x2="120" y2="300" stroke={stroke} strokeWidth="4" />

        <rect x="655" y="115" width="90" height="62" rx="10" fill="#7c7d72" stroke={stroke} strokeWidth="2" />
        <text x="700" y="143" textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="700">TEST</text>
        <text x="700" y="161" textAnchor="middle" fill="#ffffff" fontSize="12">SAMPLE</text>
        <line x1="640" y1="98" x2="666" y2="116" stroke={stroke} strokeWidth="3" />
        <line x1="735" y1="176" x2="760" y2="192" stroke={stroke} strokeWidth="3" />

        <line x1="120" y1="200" x2="120" y2="300" stroke={stroke} strokeWidth="4" />
        <line x1="100" y1="225" x2="140" y2="225" stroke={stroke} strokeWidth="5" />
        <line x1="108" y1="245" x2="132" y2="245" stroke={stroke} strokeWidth="3" />
        <text x="75" y="242" textAnchor="middle" fill={muted} fontSize="13">1.5 V cell</text>

        <text x="460" y="350" textAnchor="middle" fill={accent} fontSize="14" fontWeight="700">Metal sample → bulb glows · Non-metal sample → bulb stays dark</text>
      </svg>
    </DiagramFrame>
  )
}

function MomentumVisual() {
  return (
    <DiagramFrame
      title="Collision and conservation of momentum"
      sourcePage="Textbook page 10"
    >
      <svg
        viewBox="0 0 960 500"
        className="min-w-[760px] w-full"
        role="img"
        aria-label="Three-stage collision diagram showing two balls before, during and after collision with equal and opposite forces"
      >
        <ArrowMarker />

        <text x="60" y="55" fill={accent} fontSize="14" fontWeight="700">BEFORE COLLISION</text>
        <circle cx="300" cy="85" r="38" fill="#285b41" stroke={stroke} strokeWidth="2" />
        <circle cx="565" cy="85" r="38" fill="#355b6b" stroke={stroke} strokeWidth="2" />
        <text x="300" y="91" textAnchor="middle" fill={stroke} fontSize="16" fontWeight="700">A</text>
        <text x="565" y="91" textAnchor="middle" fill={stroke} fontSize="16" fontWeight="700">B</text>
        <line x1="342" y1="85" x2="455" y2="85" stroke={accent} strokeWidth="4" markerEnd="url(#chalkbox-arrow)" />
        <line x1="607" y1="85" x2="690" y2="85" stroke={accent} strokeWidth="3" markerEnd="url(#chalkbox-arrow)" />
        <text x="395" y="67" fill={muted} fontSize="13">uA</text>
        <text x="645" y="67" fill={muted} fontSize="13">uB</text>

        <line x1="55" y1="150" x2="905" y2="150" stroke="#315445" strokeWidth="2" />
        <text x="60" y="195" fill={accent} fontSize="14" fontWeight="700">DURING COLLISION</text>
        <circle cx="440" cy="235" r="42" fill="#285b41" stroke={stroke} strokeWidth="2" />
        <circle cx="520" cy="235" r="42" fill="#355b6b" stroke={stroke} strokeWidth="2" />
        <text x="440" y="241" textAnchor="middle" fill={stroke} fontSize="16" fontWeight="700">A</text>
        <text x="520" y="241" textAnchor="middle" fill={stroke} fontSize="16" fontWeight="700">B</text>
        <line x1="425" y1="295" x2="315" y2="295" stroke={accent} strokeWidth="4" markerEnd="url(#chalkbox-arrow)" />
        <line x1="535" y1="295" x2="645" y2="295" stroke={accent} strokeWidth="4" markerEnd="url(#chalkbox-arrow)" />
        <text x="335" y="325" fill={muted} fontSize="13">FBA</text>
        <text x="610" y="325" fill={muted} fontSize="13">FAB</text>
        <text x="480" y="350" textAnchor="middle" fill={stroke} fontSize="13">equal magnitude · opposite direction</text>

        <line x1="55" y1="375" x2="905" y2="375" stroke="#315445" strokeWidth="2" />
        <text x="60" y="420" fill={accent} fontSize="14" fontWeight="700">AFTER COLLISION</text>
        <circle cx="320" cy="445" r="34" fill="#285b41" stroke={stroke} strokeWidth="2" />
        <circle cx="590" cy="445" r="34" fill="#355b6b" stroke={stroke} strokeWidth="2" />
        <line x1="358" y1="445" x2="450" y2="445" stroke={accent} strokeWidth="3" markerEnd="url(#chalkbox-arrow)" />
        <line x1="628" y1="445" x2="730" y2="445" stroke={accent} strokeWidth="3" markerEnd="url(#chalkbox-arrow)" />
        <text x="395" y="430" fill={muted} fontSize="13">vA</text>
        <text x="680" y="430" fill={muted} fontSize="13">vB</text>

        <text x="770" y="250" textAnchor="middle" fill={stroke} fontSize="15" fontWeight="700">mA·uA + mB·uB</text>
        <text x="770" y="278" textAnchor="middle" fill={accent} fontSize="15" fontWeight="700">=</text>
        <text x="770" y="306" textAnchor="middle" fill={stroke} fontSize="15" fontWeight="700">mA·vA + mB·vB</text>
      </svg>
    </DiagramFrame>
  )
}

function WorkEnergyVisual() {
  return (
    <DiagramFrame
      title="Path independence of work done against gravity"
      sourcePage="Textbook page 25"
    >
      <svg
        viewBox="0 0 940 430"
        className="min-w-[740px] w-full"
        role="img"
        aria-label="Two paths raising a block to the same height h, one vertical and one stair-shaped, both labeled with work mgh"
      >
        <ArrowMarker />

        <line x1="70" y1="355" x2="870" y2="355" stroke={stroke} strokeWidth="4" />

        <text x="220" y="55" textAnchor="middle" fill={accent} fontSize="15" fontWeight="700">PATH 1 · DIRECT</text>
        <text x="675" y="55" textAnchor="middle" fill={accent} fontSize="15" fontWeight="700">PATH 2 · STAIR / ZIG-ZAG</text>

        <rect x="180" y="305" width="80" height="50" rx="8" fill="#6f7e72" stroke={stroke} strokeWidth="2" />
        <text x="220" y="390" textAnchor="middle" fill={muted} fontSize="13">A</text>
        <line x1="220" y1="295" x2="220" y2="115" stroke={accent} strokeWidth="4" strokeDasharray="8 7" markerEnd="url(#chalkbox-arrow)" />
        <rect x="180" y="70" width="80" height="50" rx="8" fill="#6f7e72" stroke={stroke} strokeWidth="2" />
        <text x="220" y="101" textAnchor="middle" fill={stroke} fontSize="14" fontWeight="700">B</text>
        <line x1="285" y1="350" x2="285" y2="75" stroke={muted} strokeWidth="2" />
        <text x="305" y="220" fill={muted} fontSize="16" fontWeight="700">h</text>

        <rect x="600" y="305" width="80" height="50" rx="8" fill="#6f7e72" stroke={stroke} strokeWidth="2" />
        <text x="640" y="390" textAnchor="middle" fill={muted} fontSize="13">A</text>
        <polyline points="640,305 640,270 690,270 690,230 740,230 740,190 790,190 790,150 825,150 825,120" fill="none" stroke={accent} strokeWidth="4" markerEnd="url(#chalkbox-arrow)" />
        <rect x="785" y="70" width="80" height="50" rx="8" fill="#6f7e72" stroke={stroke} strokeWidth="2" />
        <text x="825" y="101" textAnchor="middle" fill={stroke} fontSize="14" fontWeight="700">B</text>
        <line x1="885" y1="350" x2="885" y2="75" stroke={muted} strokeWidth="2" />
        <text x="900" y="220" fill={muted} fontSize="16" fontWeight="700">h</text>

        <rect x="350" y="285" width="210" height="70" rx="16" fill="#183e2e" stroke={soft} strokeWidth="2" />
        <text x="455" y="314" textAnchor="middle" fill={stroke} fontSize="15" fontWeight="700">Same vertical height</text>
        <text x="455" y="339" textAnchor="middle" fill={accent} fontSize="16" fontWeight="700">W = mgh for both</text>
      </svg>
    </DiagramFrame>
  )
}

function LessonVisual({
  lessonKey,
  lesson,
  sourceMode = 'textbook',
}: Props) {
  if (sourceMode === 'topic' && lesson) {
    return <TopicLessonVisual lesson={lesson} />
  }

  switch (lessonKey) {
    case 'class-10-electricity':
      return (
        <ElectricityCircuitDiagram />
      )

    case 'class-10-life-processes':
      return <LifeProcessesVisual />

    case 'class-8-chemical-effects-electric-current':
      return <ElectroplatingVisual />

    case 'class-8-materials-metals-non-metals':
      return <ConductorTesterVisual />

    case 'class-9-force-laws-motion':
      return <MomentumVisual />

    case 'class-9-work-energy':
      return <WorkEnergyVisual />

    default:
      return lesson
        ? <PrivateTextbookLessonVisual lesson={lesson} />
        : null
  }
}

export default LessonVisual