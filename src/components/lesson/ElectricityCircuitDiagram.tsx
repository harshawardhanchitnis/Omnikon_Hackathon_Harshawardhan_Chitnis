function ElectricityCircuitDiagram() {
  return (
    <div className="overflow-hidden rounded-[24px] border border-[#cfe0d2] bg-[#f7fbf5] p-5 sm:p-7">
      <div className="mb-5">
        <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#208653]">
          Board-ready visual
        </p>

        <h4 className="mt-1 text-base font-extrabold text-[#17211b]">
          Ohm&apos;s Law Circuit
        </h4>

        <p className="mt-1 text-[11px] font-medium leading-5 text-[#69756d]">
          Ammeter in series. Voltmeter in parallel across X–Y.
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[#dce7db] bg-white p-4">
        <svg
          viewBox="0 0 760 430"
          role="img"
          aria-label="Ohm's law circuit showing battery, key, ammeter, nichrome wire and voltmeter"
          className="mx-auto min-w-[620px] max-w-[760px]"
        >
          <defs>
            <marker
              id="arrow"
              markerWidth="9"
              markerHeight="9"
              refX="8"
              refY="4.5"
              orient="auto"
            >
              <path
                d="M0,0 L9,4.5 L0,9 z"
                fill="#176b43"
              />
            </marker>
          </defs>

          <rect
            x="20"
            y="20"
            width="720"
            height="390"
            rx="24"
            fill="#fbfdf9"
          />

          {/* Main circuit wires */}
          <path
            d="M125 115 H280"
            stroke="#24342a"
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
          />

          <path
            d="M480 115 H635 V320 H495"
            stroke="#24342a"
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <path
            d="M265 320 H125 V115"
            stroke="#24342a"
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Nichrome wire */}
          <circle
            cx="280"
            cy="115"
            r="8"
            fill="#176b43"
          />

          <circle
            cx="480"
            cy="115"
            r="8"
            fill="#176b43"
          />

          <path
            d="M280 115
               C300 85 320 145 340 115
               C360 85 380 145 400 115
               C420 85 440 145 460 115
               C468 103 474 108 480 115"
            stroke="#d87937"
            strokeWidth="7"
            fill="none"
            strokeLinecap="round"
          />

          <text
            x="270"
            y="82"
            fontSize="18"
            fontWeight="800"
            fill="#176b43"
          >
            X
          </text>

          <text
            x="475"
            y="82"
            fontSize="18"
            fontWeight="800"
            fill="#176b43"
          >
            Y
          </text>

          <text
            x="323"
            y="67"
            fontSize="15"
            fontWeight="700"
            fill="#5b675f"
          >
            Nichrome wire
          </text>

          {/* Ammeter */}
          <circle
            cx="635"
            cy="218"
            r="43"
            fill="#edf6ea"
            stroke="#176b43"
            strokeWidth="5"
          />

          <text
            x="621"
            y="228"
            fontSize="32"
            fontWeight="900"
            fill="#176b43"
          >
            A
          </text>

          <text
            x="687"
            y="210"
            fontSize="14"
            fontWeight="800"
            fill="#69756d"
          >
            Ammeter
          </text>

          <text
            x="688"
            y="231"
            fontSize="12"
            fontWeight="700"
            fill="#8a958d"
          >
            series
          </text>

          {/* Voltmeter branch */}
          <path
            d="M280 115 V222 H330"
            stroke="#4d7860"
            strokeWidth="5"
            fill="none"
            strokeLinecap="round"
          />

          <path
            d="M430 222 H480 V115"
            stroke="#4d7860"
            strokeWidth="5"
            fill="none"
            strokeLinecap="round"
          />

          <circle
            cx="380"
            cy="222"
            r="49"
            fill="#eef5fb"
            stroke="#46718c"
            strokeWidth="5"
          />

          <text
            x="364"
            y="233"
            fontSize="33"
            fontWeight="900"
            fill="#46718c"
          >
            V
          </text>

          <text
            x="337"
            y="291"
            fontSize="13"
            fontWeight="800"
            fill="#69756d"
          >
            Voltmeter — parallel
          </text>

          {/* Battery */}
          <line
            x1="265"
            y1="285"
            x2="265"
            y2="355"
            stroke="#24342a"
            strokeWidth="7"
          />

          <line
            x1="290"
            y1="297"
            x2="290"
            y2="343"
            stroke="#24342a"
            strokeWidth="4"
          />

          <line
            x1="315"
            y1="285"
            x2="315"
            y2="355"
            stroke="#24342a"
            strokeWidth="7"
          />

          <line
            x1="340"
            y1="297"
            x2="340"
            y2="343"
            stroke="#24342a"
            strokeWidth="4"
          />

          <line
            x1="365"
            y1="285"
            x2="365"
            y2="355"
            stroke="#24342a"
            strokeWidth="7"
          />

          <path
            d="M365 320 H405"
            stroke="#24342a"
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
          />

          <text
            x="264"
            y="388"
            fontSize="14"
            fontWeight="800"
            fill="#69756d"
          >
            Battery
          </text>

          {/* Key */}
          <circle
            cx="420"
            cy="320"
            r="7"
            fill="#24342a"
          />

          <circle
            cx="485"
            cy="320"
            r="7"
            fill="#24342a"
          />

          <line
            x1="425"
            y1="316"
            x2="478"
            y2="290"
            stroke="#24342a"
            strokeWidth="6"
            strokeLinecap="round"
          />

          <text
            x="431"
            y="365"
            fontSize="14"
            fontWeight="800"
            fill="#69756d"
          >
            Key K
          </text>

          {/* Current arrows */}
          <line
            x1="145"
            y1="115"
            x2="220"
            y2="115"
            stroke="#176b43"
            strokeWidth="4"
            markerEnd="url(#arrow)"
          />

          <line
            x1="635"
            y1="275"
            x2="635"
            y2="303"
            stroke="#176b43"
            strokeWidth="4"
            markerEnd="url(#arrow)"
          />

          <text
            x="145"
            y="96"
            fontSize="13"
            fontWeight="800"
            fill="#176b43"
          >
            conventional current
          </text>

          {/* + / - */}
          <text
            x="247"
            y="278"
            fontSize="20"
            fontWeight="900"
            fill="#176b43"
          >
            +
          </text>

          <text
            x="370"
            y="281"
            fontSize="20"
            fontWeight="900"
            fill="#7b5e50"
          >
            −
          </text>
        </svg>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-white p-3">
          <p className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#208653]">
            Ammeter
          </p>

          <p className="mt-1 text-[11px] font-semibold text-[#566159]">
            Connected in series
          </p>
        </div>

        <div className="rounded-xl bg-white p-3">
          <p className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#46718c]">
            Voltmeter
          </p>

          <p className="mt-1 text-[11px] font-semibold text-[#566159]">
            Connected across X–Y
          </p>
        </div>

        <div className="rounded-xl bg-white p-3">
          <p className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#d87937]">
            Resistance wire
          </p>

          <p className="mt-1 text-[11px] font-semibold text-[#566159]">
            Nichrome between X and Y
          </p>
        </div>
      </div>
    </div>
  )
}

export default ElectricityCircuitDiagram