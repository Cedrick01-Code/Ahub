import type { CourseBook, HierarchyNode, SlideNote, Flashcard } from "../portals/GuideMe"
import { Sprout, PawPrint, Code2, Wrench } from "lucide-react"

export interface PlotInfo {
  plotId?: string
  name: string
  category: "plants" | "animals"
  cropName?: string
  cropVariety?: string
  animalType?: string
  breed?: string
  soilType?: string
  irrigation?: string
  area?: string
  unit?: string
  population?: string
}

// Generate an SVG visual illustration diagram for slides
export function generateVisualSvg(type: "soil" | "spacing" | "ipm" | "irrigation" | "livestock_feed" | "harvest"): string {
  if (type === "soil") {
    return `<svg viewBox="0 0 600 220" xmlns="http://www.w3.org/2000/svg" class="w-full rounded-xl border border-emerald-300/40 bg-emerald-950/20 p-2">
      <rect width="600" height="220" fill="#0D2218" rx="12"/>
      <text x="30" y="35" fill="#10B981" font-family="monospace" font-size="14" font-weight="bold">SOIL SAMPLING & pH STRATIFICATION GRID (0-20 cm)</text>
      <!-- Soil layers -->
      <rect x="30" y="55" width="540" height="40" fill="#27875B" opacity="0.6" rx="4"/>
      <text x="40" y="80" fill="#FFFFFF" font-size="12" font-weight="bold">Topsoil Organic Horizon (pH 6.0 - 6.8)</text>
      <rect x="30" y="105" width="540" height="50" fill="#133A2B" opacity="0.8" rx="4"/>
      <text x="40" y="135" fill="#A8D5BA" font-size="12">Root Zone Horizon (Nitrogen & Phosphorus absorption zone)</text>
      <rect x="30" y="165" width="540" height="35" fill="#123D30" rx="4"/>
      <text x="40" y="188" fill="#6B9B7B" font-size="11">Subsoil & Clay Base (Check drainage & compaction)</text>
      <!-- Grid sample markers -->
      <circle cx="120" cy="75" r="8" fill="#10B981" stroke="#FFFFFF" stroke-width="2"/>
      <circle cx="280" cy="75" r="8" fill="#10B981" stroke="#FFFFFF" stroke-width="2"/>
      <circle cx="450" cy="75" r="8" fill="#10B981" stroke="#FFFFFF" stroke-width="2"/>
    </svg>`
  }

  if (type === "spacing") {
    return `<svg viewBox="0 0 600 200" xmlns="http://www.w3.org/2000/svg" class="w-full rounded-xl border border-emerald-300/40 bg-emerald-950/20 p-2">
      <rect width="600" height="200" fill="#0D2218" rx="12"/>
      <text x="30" y="35" fill="#10B981" font-family="monospace" font-size="14" font-weight="bold">PLANT SPACING & SOWING DENSITY DIAGRAM</text>
      <line x1="50" y1="120" x2="550" y2="120" stroke="#27875B" stroke-width="3" stroke-dasharray="8 4"/>
      <!-- Plants -->
      <g transform="translate(80, 70)"><path d="M15,50 Q15,20 0,0 Q30,20 15,50 Z" fill="#10B981"/><circle cx="15" cy="50" r="5" fill="#EAB308"/></g>
      <g transform="translate(220, 70)"><path d="M15,50 Q15,20 0,0 Q30,20 15,50 Z" fill="#10B981"/><circle cx="15" cy="50" r="5" fill="#EAB308"/></g>
      <g transform="translate(360, 70)"><path d="M15,50 Q15,20 0,0 Q30,20 15,50 Z" fill="#10B981"/><circle cx="15" cy="50" r="5" fill="#EAB308"/></g>
      <g transform="translate(500, 70)"><path d="M15,50 Q15,20 0,0 Q30,20 15,50 Z" fill="#10B981"/><circle cx="15" cy="50" r="5" fill="#EAB308"/></g>
      <!-- Dimension line -->
      <line x1="95" y1="150" x2="235" y2="150" stroke="#34D399" stroke-width="2"/>
      <text x="140" y="170" fill="#34D399" font-size="12" font-weight="bold">25 cm Intra-Row</text>
    </svg>`
  }

  if (type === "ipm") {
    return `<svg viewBox="0 0 600 200" xmlns="http://www.w3.org/2000/svg" class="w-full rounded-xl border border-emerald-300/40 bg-emerald-950/20 p-2">
      <rect width="600" height="200" fill="#0D2218" rx="12"/>
      <text x="30" y="30" fill="#10B981" font-family="monospace" font-size="14" font-weight="bold">INTEGRATED PEST MANAGEMENT (IPM) DECISION TREE</text>
      <!-- Boxes -->
      <rect x="30" y="55" width="160" height="50" fill="#133A2B" stroke="#27875B" rx="8"/>
      <text x="45" y="85" fill="#FFFFFF" font-size="12" font-weight="bold">1. Field Scouting</text>
      <line x1="190" y1="80" x2="230" y2="80" stroke="#10B981" stroke-width="3"/>
      <rect x="230" y="55" width="160" height="50" fill="#133A2B" stroke="#EAB308" rx="8"/>
      <text x="245" y="85" fill="#EAB308" font-size="12" font-weight="bold">2. Action Threshold</text>
      <line x1="390" y1="80" x2="430" y2="80" stroke="#10B981" stroke-width="3"/>
      <rect x="430" y="55" width="140" height="50" fill="#133A2B" stroke="#10B981" rx="8"/>
      <text x="445" y="85" fill="#10B981" font-size="12" font-weight="bold">3. Bio Control</text>
      <text x="30" y="145" fill="#A8D5BA" font-size="12">Scout 2x weekly. Spray bio-pesticide only if threshold exceeds 5% leaf damage.</text>
    </svg>`
  }

  return `<svg viewBox="0 0 600 180" xmlns="http://www.w3.org/2000/svg" class="w-full rounded-xl border border-emerald-300/40 bg-emerald-950/20 p-2">
    <rect width="600" height="180" fill="#0D2218" rx="12"/>
    <text x="30" y="35" fill="#10B981" font-family="monospace" font-size="14" font-weight="bold">PRODUCTION & NUTRITION TIMELINE</text>
    <rect x="30" y="60" width="540" height="30" fill="#123D30" rx="6"/>
    <rect x="30" y="60" width="180" fill="#27875B" height="30" rx="6"/>
    <rect x="210" y="60" width="200" fill="#10B981" height="30"/>
    <text x="50" y="80" fill="#FFFFFF" font-size="11" font-weight="bold">Phase 1: Setup</text>
    <text x="240" y="80" fill="#000000" font-size="11" font-weight="bold">Phase 2: Active Production</text>
    <text x="440" y="80" fill="#A8D5BA" font-size="11">Phase 3: Harvest/Yield</text>
  </svg>`
}

/**
 * Gemini Guidebook Generator Function
 * Builds a complete 5-level CourseBook structure dynamically tailored to any crop or animal plot!
 */
export function generateGeminiPlotBook(plot: PlotInfo): CourseBook {
  const isAnimal = plot.category === "animals"
  const targetName = isAnimal
    ? plot.animalType || plot.breed || "Livestock"
    : plot.cropName || plot.cropVariety || "Crop"

  const plotTitle = plot.name ? `Plot: ${plot.name}` : "Production Unit"
  const bookCode = `GEM-${targetName.slice(0, 3).toUpperCase()}-${Math.floor(10 + Math.random() * 90)}`
  const bookTitle = `${targetName} Complete Field & Production Guide (${plotTitle})`
  const bookDesc = `Gemini AI customized step-by-step master guide for ${targetName} tailored to ${
    plot.soilType || "your field"
  } soil, ${plot.irrigation || "standard"} water setup, and ${plot.area || "1"} ${plot.unit || "unit"} size.`

  const iconComp = isAnimal ? PawPrint : Sprout

  // Generate 4 Modules covering Planning -> Harvesting / Active Production
  const hierarchy: HierarchyNode[] = [
    {
      id: "mod-1",
      code: "L01",
      title: isAnimal ? "L01: Housing, Site Setup & Breed Selection" : "L01: Planning, Soil Testing & Land Prep",
      type: "module",
      children: [
        {
          id: "top-1.1",
          code: "IC1.1",
          title: isAnimal ? "IC1.1: Housing Architecture & Ventilation" : "IC1.1: Soil Stratification & pH Adjustment",
          type: "topic",
          children: [
            {
              id: "sub-1.1.1",
              code: "1.1.1",
              title: isAnimal ? "1.1.1: HOUSING & SPACE SPECIFICATIONS" : "1.1.1: SOIL SAMPLING & AMENDMENT PROTOCOL",
              type: "subtopic",
              slides: [
                {
                  id: "slide-1",
                  title: isAnimal ? "Optimal Pen & Barn Ventilation Setup" : "Field Grid Soil Sampling & pH Balancing",
                  levelLabel: "LEVEL 5 SUBTOPIC",
                  content: isAnimal
                    ? `For ${targetName} production in ${plotTitle}:\n\n` +
                      `1. Housing Orientation: Position pens East-to-West to minimize direct intense sunlight heat stress.\n` +
                      `2. Space Allowance: Provide minimum 3.5 m² clean concrete/bedding space per animal.\n` +
                      `3. Air Circulation: Maintain continuous cross-ventilation while preventing cold floor drafts.`
                    : `Comprehensive soil preparation for ${targetName} in ${plotTitle}:\n\n` +
                      `1. Sampling Grid: Take core samples at 0-20 cm depth across 10-15 random field grid points.\n` +
                      `2. Target pH Level: Optimal pH for ${targetName} is 6.0 - 6.8. Apply dolomitic agricultural lime at 2.5 tons/ha if pH < 5.5.\n` +
                      `3. Organic Matter: Incorporate 10-15 tons/ha of well-rotted farmyard manure during deep tilling.`,
                  keyTerms: isAnimal
                    ? ["Housing Orientation", "Space Allowance", "Cross-Ventilation", "Biosecurity"]
                    : ["Soil pH 6.0-6.8", "Dolomitic Lime", "Organic Manure", "Grid Sampling"],
                  codeSnippet: generateVisualSvg(isAnimal ? "livestock_feed" : "soil"),
                },
                {
                  id: "slide-2",
                  title: isAnimal ? "Water Hygiene & Feeder Trough Sizing" : "Seedbed Preparation & Tillage Depth",
                  levelLabel: "LEVEL 5 SUBTOPIC",
                  content: isAnimal
                    ? `Hydration & feeding infrastructure guidelines:\n\n` +
                      `• Water Supply: Continuous clean drinking water (100L daily for cattle, 0.5L for poultry).\n` +
                      `• Trough Height: Position feed troughs at shoulder height to prevent contamination.`
                    : `Seedbed tillage and soil physical properties:\n\n` +
                      `• Deep Tlowing: Till soil to 25-30 cm depth to break hardpan layers.\n` +
                      `• Tilth Quality: Achieve fine, crumbly seedbed tilth for uniform seed germination.`,
                  keyTerms: ["Clean Water", "Feeder Sizing", "Tillage Depth", "Seedbed Tilth"],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "mod-2",
      code: "L02",
      title: isAnimal ? "L02: Feeding Rations & Health Maintenance" : "L02: Sowing Density, Spacing & Irrigation",
      type: "module",
      children: [
        {
          id: "top-2.1",
          code: "IC2.1",
          title: isAnimal ? "IC2.1: Feed Ration Formulation" : "IC2.1: Sowing Geometry & Irrigation Schedule",
          type: "topic",
          children: [
            {
              id: "sub-2.1.1",
              code: "2.1.1",
              title: isAnimal ? "2.1.1: PROTEIN & ENERGY BALANCE" : "2.1.1: SPACING & DENSITY SPECIFICATIONS",
              type: "subtopic",
              slides: [
                {
                  id: "slide-3",
                  title: isAnimal ? "Daily Ration & Protein Requirements" : "Row Spacing & Plant Population Sizing",
                  levelLabel: "LEVEL 5 SUBTOPIC",
                  content: isAnimal
                    ? `Nutritional breakdown for ${targetName}:\n\n` +
                      `• Crude Protein: Maintain 16-18% total diet crude protein during high growth/lactation phases.\n` +
                      `• Dry Matter Intake (DMI): Target 3.5% - 4.0% of total body weight daily.\n` +
                      `• Mineral Blocks: Free-choice salt and calcium/phosphorus mineral licks.`
                    : `Sowing specifications for ${targetName}:\n\n` +
                      `1. Inter-Row Spacing: Plant rows 75 cm apart.\n` +
                      `2. Intra-Row Spacing: Place seeds 25 cm apart along the row.\n` +
                      `3. Target Plant Density: ~53,000 plants per hectare for optimal canopy light capture.`,
                  keyTerms: isAnimal
                    ? ["Crude Protein 16-18%", "Dry Matter Intake", "Mineral Licks"]
                    : ["75cm Row Spacing", "25cm Intra-Row", "53k Plants/Ha"],
                  codeSnippet: generateVisualSvg(isAnimal ? "livestock_feed" : "spacing"),
                },
                {
                  id: "slide-4",
                  title: isAnimal ? "Vaccination & Routine Deworming" : "Water Sizing & Drip Irrigation Schedule",
                  levelLabel: "LEVEL 5 SUBTOPIC",
                  content: isAnimal
                    ? `Preventative health schedule:\n\n` +
                      `• Deworming: Administer broad-spectrum anthelmintics every 3 months.\n` +
                      `• Vaccination: Vaccinate against FMD, Anthrax, and Newcastle according to RAB national calendar.`
                    : `Irrigation schedule for ${plotTitle}:\n\n` +
                      `• Critical Water Stages: Flowering and grain/pod filling phases.\n` +
                      `• Drip Emitter Rate: 2.0 Liters/hour per emitter, 30-45 mins daily during dry spells.`,
                  keyTerms: ["Deworming", "Vaccination Calendar", "Drip Irrigation", "Flowering Stage"],
                  codeSnippet: generateVisualSvg("irrigation"),
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "mod-3",
      code: "L03",
      title: isAnimal ? "L03: Disease Prevention & Production Monitoring" : "L03: Pest Management & Crop Care",
      type: "module",
      children: [
        {
          id: "top-3.1",
          code: "IC3.1",
          title: isAnimal ? "IC3.1: Sanitation & Production Tracking" : "IC3.1: Integrated Pest Management (IPM)",
          type: "topic",
          children: [
            {
              id: "sub-3.1.1",
              code: "3.1.1",
              title: isAnimal ? "3.1.1: BIOSECURITY PROTOCOLS" : "3.1.1: IPM SCOUTING & SPRAY THRESHOLDS",
              type: "subtopic",
              slides: [
                {
                  id: "slide-5",
                  title: isAnimal ? "Milking/Yield Sanitation & Mastitis Control" : "Scouting Protocol & Biological Pest Control",
                  levelLabel: "LEVEL 5 SUBTOPIC",
                  content: isAnimal
                    ? `Sanitation protocols:\n\n` +
                      `• Teat Dipping: Pre- and post-milking teat disinfection.\n` +
                      `• Equipment Sterilization: Clean milking cans with warm water and food-grade disinfectant.`
                    : `Field scouting and eco-friendly pest control for ${targetName}:\n\n` +
                      `1. Field Scouting: Inspect 20 random plants twice weekly.\n` +
                      `2. Economic Threshold: Initiate biopesticide spray only if infestation exceeds 5% leaf damage.\n` +
                      `3. Companion Planting: Plant marigolds or push-pull crops around field borders to repel stem borers.`,
                  keyTerms: isAnimal
                    ? ["Teat Dipping", "Sanitation", "Mastitis Prevention"]
                    : ["IPM Scouting", "Economic Threshold", "Push-Pull Repellent"],
                  codeSnippet: generateVisualSvg("ipm"),
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "mod-4",
      code: "L04",
      title: isAnimal ? "L04: Yield Collection, Processing & Sales" : "L04: Harvesting, Storage & Marketing",
      type: "module",
      children: [
        {
          id: "top-4.1",
          code: "IC4.1",
          title: isAnimal ? "IC4.1: Product Storage & Market Logistics" : "IC4.1: Harvest Timing & Storage Moisture",
          type: "topic",
          children: [
            {
              id: "sub-4.1.1",
              code: "4.1.1",
              title: isAnimal ? "4.1.1: COLD CHAIN & YIELD RECORDING" : "4.1.1: MOISTURE CONTROL & AFLATOXIN PREVENTION",
              type: "subtopic",
              slides: [
                {
                  id: "slide-6",
                  title: isAnimal ? "Cold Chain Management & Milk/Meat Quality" : "Determining Harvest Maturity & Moisture Content",
                  levelLabel: "LEVEL 5 SUBTOPIC",
                  content: isAnimal
                    ? `Post-production handling:\n\n` +
                      `• Cold Chain Storage: Chill fresh milk to 4°C within 2 hours of milking.\n` +
                      `• Sales Log: Track daily liters/kg sold on AHub marketplace for maximum buyer transparency.`
                    : `Harvesting and storage guidelines for ${targetName}:\n\n` +
                      `1. Harvest Timing: Harvest when grain/fruit moisture reaches 18-20%.\n` +
                      `2. Sun Drying: Dry harvested produce on clean tarpaulins to 12.5% moisture content.\n` +
                      `3. Hermetic Storage: Store in airtight hermetic bags to prevent post-harvest pest infestation and aflatoxin mold.`,
                  keyTerms: isAnimal
                    ? ["Cold Chain 4°C", "Yield Logging", "Market Logistics"]
                    : ["12.5% Moisture Content", "Hermetic Bags", "Aflatoxin Prevention"],
                  codeSnippet: generateVisualSvg("harvest"),
                },
              ],
            },
          ],
        },
      ],
    },
  ]

  // Dynamic Flashcard Deck tailored to plot
  const flashcards: Flashcard[] = [
    {
      id: `fc-${plot.name}-1`,
      prompt: isAnimal
        ? `What is the optimal space allowance per animal for ${targetName}?`
        : `What is the target soil pH range for ${targetName} production?`,
      subtopicTitle: "1.1.1: HOUSING / SOIL SPECIFICATIONS",
      answer: isAnimal
        ? `Provide a minimum of 3.5 m² of clean, well-ventilated space per animal to prevent respiratory disease.`
        : `The optimal soil pH range for ${targetName} is 6.0 - 6.8. If pH is below 5.5, apply dolomitic lime.`,
      keyTakeaway: isAnimal ? "3.5 m² clean space per animal" : "pH 6.0 - 6.8 (Apply lime if < 5.5)",
      status: "NEW",
    },
    {
      id: `fc-${plot.name}-2`,
      prompt: isAnimal
        ? `What daily crude protein percentage is required in feed rations?`
        : `What is the recommended plant row spacing for ${targetName}?`,
      subtopicTitle: "2.1.1: PROTEIN / SPACING SPECIFICATIONS",
      answer: isAnimal
        ? `Feed rations should maintain 16-18% total crude protein during active growth/lactation phases.`
        : `Plant rows 75 cm apart with 25 cm intra-row seed placement (~53,000 plants/ha).`,
      keyTakeaway: isAnimal ? "16-18% Crude Protein daily" : "75cm x 25cm Spacing (~53k/ha)",
      status: "NEW",
    },
    {
      id: `fc-${plot.name}-3`,
      prompt: isAnimal
        ? `At what temperature must milk be chilled to preserve quality?`
        : `To what moisture percentage must harvested crops be dried before hermetic storage?`,
      subtopicTitle: "4.1.1: COLD CHAIN / MOISTURE CONTROL",
      answer: isAnimal
        ? `Milk must be chilled to 4°C within 2 hours of milking to prevent bacterial growth.`
        : `Dry produce to 12.5% moisture content before sealing in hermetic bags to eliminate mold and aflatoxins.`,
      keyTakeaway: isAnimal ? "Chill to 4°C within 2 hours" : "12.5% Moisture Content max",
      status: "NEW",
    },
  ]

  return {
    id: `book-${plot.name || "custom"}-${Math.floor(Math.random() * 1000)}`,
    code: bookCode,
    title: bookTitle,
    description: bookDesc,
    category: isAnimal ? "livestock" : "crops",
    icon: iconComp,
    totalModules: 4,
    totalTopics: 4,
    readingTimeMin: 25,
    progressPercent: 0,
    hierarchy,
    flashcards,
  }
}
