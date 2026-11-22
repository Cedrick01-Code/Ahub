import { useState, useEffect } from "react"
import {
  BookOpen,
  Sprout,
  PawPrint,
  Wrench,
  Code2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Search,
  CheckCircle2,
  Circle,
  Folder,
  Layers,
  FileText,
  Sparkles,
  Maximize2,
  Minimize2,
  Bell,
  X,
  RotateCw,
  BookMarked,
  Brain,
  Check,
  Zap,
} from "lucide-react"
import { generateGeminiPlotBook, type PlotInfo } from "../lib/geminiGuideGenerator"
import { operationsApi } from "../lib/operationsApi"

// AHub Theme System Colors (Dark Emerald Palette matching AHub brand)
const COLORS = {
  bgMain: "#0A1A12",
  bgSidebar: "#0D2218",
  bgCard: "#133A2B",
  bgCardHover: "#1B4D3A",
  bgInput: "#123D30",
  accent: "#10B981",
  accentHover: "#059669",
  accentGlow: "rgba(16, 185, 129, 0.3)",
  borderMain: "#27875B",
  borderSubtle: "#184734",
  textPrimary: "#FFFFFF",
  textSecondary: "#A8D5BA",
  textMuted: "#6B9B7B",
  textHighlight: "#34D399",
}

// Data Types for Courses and Hierarchical Syllabus Deck
export interface SlideNote {
  id: string
  title: string
  subtitle?: string
  levelLabel: string // e.g. "LEVEL 5 SUBTOPIC"
  content: string
  keyTerms?: string[]
  codeSnippet?: string
}

export interface HierarchyNode {
  id: string
  code?: string
  title: string
  type: "module" | "topic" | "subtopic" | "slide"
  slides?: SlideNote[]
  children?: HierarchyNode[]
  completed?: boolean
}

export interface Flashcard {
  id: string
  prompt: string
  subtopicTitle: string
  answer: string
  keyTakeaway: string
  status: "NEW" | "LEARNING" | "MASTERED"
}

export interface CourseBook {
  id: string
  code: string
  title: string
  description: string
  category: "crops" | "livestock" | "engineering" | "tech"
  icon: typeof Sprout
  totalModules: number
  totalTopics: number
  readingTimeMin: number
  progressPercent: number
  hierarchy: HierarchyNode[]
  flashcards: Flashcard[]
}

// Initial Default Registered Agricultural Plot Books
const DEFAULT_PLOT_BOOKS: PlotInfo[] = [
  {
    name: "North Field",
    category: "plants",
    cropName: "Hybrid Maize (H628)",
    cropVariety: "H628",
    soilType: "Volcanic Loam",
    irrigation: "drip",
    area: "2.5",
    unit: "ha",
  },
  {
    name: "Dairy Unit 1",
    category: "animals",
    animalType: "Dairy Cattle",
    breed: "Friesian-Holstein",
    population: "14",
  },
  {
    name: "Hillside Plot B",
    category: "plants",
    cropName: "Irish Potatoes (Kinigi)",
    cropVariety: "Kinigi",
    soilType: "Volcanic Clay-Loam",
    irrigation: "rainfed",
    area: "1.2",
    unit: "ha",
  },
  {
    name: "Poultry Shed 2",
    category: "animals",
    animalType: "Poultry Layers",
    breed: "ISA Brown",
    population: "250",
  },
]

export function GuideMe({ onBack }: { onBack?: () => void }) {
  const [registeredPlotBooks, setRegisteredPlotBooks] = useState<CourseBook[]>([])
  const [customCropInput, setCustomCropInput] = useState<string>("")
  const [isGeneratingCustom, setIsGeneratingCustom] = useState<boolean>(false)

  const [selectedCourse, setSelectedCourse] = useState<CourseBook | null>(null)
  const [activeSlide, setActiveSlide] = useState<SlideNote | null>(null)
  const [activeNodeId, setActiveNodeId] = useState<string>("")
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(1)
  const [totalSlidesInSubtopic, setTotalSlidesInSubtopic] = useState<number>(6)

  // Interactive View Modes
  const [viewMode, setViewMode] = useState<"catalog" | "reader">("catalog")
  const [readerTab, setReaderTab] = useState<"slide" | "page">("slide")
  const [focusMode, setFocusMode] = useState<boolean>(false)
  const [isStudyDeckOpen, setIsStudyDeckOpen] = useState<boolean>(false)
  const [isAiExplainOpen, setIsAiExplainOpen] = useState<boolean>(false)
  const [aiExplanationText, setAiExplanationText] = useState<string>("")

  // Hierarchy Search & Expanded Tree Nodes State
  const [hierarchySearch, setHierarchySearch] = useState<string>("")
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    "mod-1": true,
    "top-1.1": true,
    "sub-1.1.1": true,
  })
  const [completedSlideIds, setCompletedSlideIds] = useState<Set<string>>(new Set(["slide-1"]))

  // Flashcards Study Deck State
  const [currentFlashcardIdx, setCurrentFlashcardIdx] = useState<number>(0)
  const [isFlashcardFlipped, setIsFlashcardFlipped] = useState<boolean>(false)
  const [flashcardStatuses, setFlashcardStatuses] = useState<Record<string, "NEW" | "LEARNING" | "MASTERED">>({})

  // Category filter state for Catalog view
  const [categoryFilter, setCategoryFilter] = useState<"all" | "crops" | "livestock" | "engineering">("all")
  const [catalogSearch, setCatalogSearch] = useState<string>("")

  // Fetch registered plots on mount & generate Gemini AI guidebooks for them!
  useEffect(() => {
    const loadRegisteredPlotBooks = async () => {
      try {
        const res = await operationsApi<{ data: PlotInfo[] }>("/plots")
        if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
          const generated = res.data.map((p) => generateGeminiPlotBook(p))
          setRegisteredPlotBooks(generated)
        } else {
          setRegisteredPlotBooks(DEFAULT_PLOT_BOOKS.map((p) => generateGeminiPlotBook(p)))
        }
      } catch {
        setRegisteredPlotBooks(DEFAULT_PLOT_BOOKS.map((p) => generateGeminiPlotBook(p)))
      }
    }
    void loadRegisteredPlotBooks()
  }, [])

  // Handle generating custom Gemini guide for any user-entered crop or animal
  const handleGenerateCustomGuide = () => {
    if (!customCropInput.trim()) return
    setIsGeneratingCustom(true)
    setTimeout(() => {
      const isAnimal =
        customCropInput.toLowerCase().includes("cattle") ||
        customCropInput.toLowerCase().includes("poultry") ||
        customCropInput.toLowerCase().includes("pig") ||
        customCropInput.toLowerCase().includes("goat") ||
        customCropInput.toLowerCase().includes("sheep") ||
        customCropInput.toLowerCase().includes("livestock")

      const customPlot: PlotInfo = {
        name: `Custom (${customCropInput})`,
        category: isAnimal ? "animals" : "plants",
        cropName: isAnimal ? undefined : customCropInput,
        animalType: isAnimal ? customCropInput : undefined,
      }
      const newBook = generateGeminiPlotBook(customPlot)
      setRegisteredPlotBooks((prev) => [newBook, ...prev])
      handleSelectCourse(newBook)
      setCustomCropInput("")
      setIsGeneratingCustom(false)
    }, 400)
  }

  // Handle course card click
  const handleSelectCourse = (course: CourseBook) => {
    setSelectedCourse(course)

    // Find first slide in hierarchy
    const firstSlide = findFirstSlide(course.hierarchy)
    if (firstSlide) {
      setActiveSlide(firstSlide.slide)
      setActiveNodeId(firstSlide.nodeId)
      setActiveSlideIndex(1)
      setTotalSlidesInSubtopic(firstSlide.siblingCount || 4)
    }

    // Initialize flashcard statuses
    const initialStatuses: Record<string, "NEW" | "LEARNING" | "MASTERED"> = {}
    course.flashcards.forEach((fc) => {
      initialStatuses[fc.id] = fc.status
    })
    setFlashcardStatuses(initialStatuses)
    setCurrentFlashcardIdx(0)
    setIsFlashcardFlipped(false)

    setViewMode("reader")
  }

  // Find first slide helper
  const findFirstSlide = (nodes: HierarchyNode[]): { slide: SlideNote; nodeId: string; siblingCount: number } | null => {
    for (const node of nodes) {
      if (node.slides && node.slides.length > 0) {
        return { slide: node.slides[0], nodeId: node.id, siblingCount: node.slides.length }
      }
      if (node.children) {
        const found = findFirstSlide(node.children)
        if (found) return found
      }
    }
    return null
  }

  // Toggle node expand/collapse
  const toggleNodeExpand = (nodeId: string) => {
    setExpandedNodes((prev) => ({ ...prev, [nodeId]: !prev[nodeId] }))
  }

  // Toggle slide completed state
  const toggleSlideComplete = (slideId: string) => {
    setCompletedSlideIds((prev) => {
      const next = new Set(prev)
      if (next.has(slideId)) {
        next.delete(slideId)
      } else {
        next.add(slideId)
      }
      return next
    })
  }

  // AI Explain concept helper
  const handleExplainConcept = (slide: SlideNote) => {
    setIsAiExplainOpen(true)
    setAiExplanationText(
      `✨ AHub AI Explanation for: "${slide.title}"\n\n` +
      `Here is a simplified breakdown for practical agricultural application:\n` +
      `1. Core Concept: ${slide.title}\n` +
      `2. Why it matters: This learning outcome guarantees operational accuracy and field readiness for your plot.\n` +
      `3. Practical Example: In daily operations, this concept ensures that soil, feeding, moisture, and crop health decisions are verified before implementation.`
    )
  }

  // Keyboard navigation listener (Arrow Left / Right for slides)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (viewMode === "reader" && readerTab === "slide" && !isStudyDeckOpen && !isAiExplainOpen) {
        if (e.key === "ArrowLeft") {
          handlePrevSlide()
        } else if (e.key === "ArrowRight") {
          handleNextSlide()
        }
      }
      if (isStudyDeckOpen && e.code === "Space") {
        e.preventDefault()
        setIsFlashcardFlipped((prev) => !prev)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [viewMode, readerTab, isStudyDeckOpen, isAiExplainOpen, activeSlideIndex, totalSlidesInSubtopic])

  const handleNextSlide = () => {
    if (activeSlideIndex < totalSlidesInSubtopic) {
      setActiveSlideIndex((prev) => prev + 1)
    }
  }

  const handlePrevSlide = () => {
    if (activeSlideIndex > 1) {
      setActiveSlideIndex((prev) => prev - 1)
    }
  }

  // Filter Catalog Books
  const filteredCatalogBooks = registeredPlotBooks.filter((c) => {
    const matchesSearch =
      !catalogSearch ||
      c.title.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      c.code.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      c.description.toLowerCase().includes(catalogSearch.toLowerCase())
    const matchesCat = categoryFilter === "all" || c.category === categoryFilter
    return matchesSearch && matchesCat
  })

  // Flashcards Mastered / Learning counters
  const activeDeck = selectedCourse?.flashcards || []
  const masteredCount = activeDeck.filter((fc) => (flashcardStatuses[fc.id] || fc.status) === "MASTERED").length
  const learningCount = activeDeck.filter((fc) => (flashcardStatuses[fc.id] || fc.status) === "LEARNING").length

  return (
    <div className="min-h-screen bg-[#0A1A12] text-white flex flex-col font-sans select-none">
      {/* CATALOG VIEW SCREEN */}
      {viewMode === "catalog" && (
        <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 flex flex-col gap-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#184734] pb-6">
            <div className="flex items-center gap-4">
              {onBack && (
                <button
                  onClick={onBack}
                  className="p-2 rounded-xl bg-[#133A2B] hover:bg-[#1B4D3A] text-[#A8D5BA] hover:text-white border border-[#27875B]/40 transition-colors"
                  title="Back"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <BookMarked className="w-6 h-6 text-[#10B981]" />
                  <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
                    Guide Me • Registered Plot Books
                  </h1>
                </div>
                <p className="text-xs md:text-sm text-[#A8D5BA] mt-1">
                  Gemini AI auto-generated books covering planning, care, disease control & harvesting for your registered farm plots.
                </p>
              </div>
            </div>
          </div>

          {/* DYNAMIC GEMINI AI GUIDE GENERATOR BANNER */}
          <div className="bg-gradient-to-r from-[#133A2B] via-[#184734] to-[#123D30] rounded-2xl border border-[#10B981]/50 p-5 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white">Gemini AI Plot Guidebook Generator</h2>
                  <span className="px-2 py-0.5 rounded-full bg-[#10B981] text-black text-[10px] font-bold">
                    AI Powered
                  </span>
                </div>
                <p className="text-xs text-[#A8D5BA] mt-0.5">
                  Type any crop or livestock species (e.g. "Avocado", "Tilapia", "Irish Potato", "Pigs") to generate an end-to-end 5-level guide book!
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
              <input
                type="text"
                value={customCropInput}
                onChange={(e) => setCustomCropInput(e.target.value)}
                placeholder="Enter crop or livestock name..."
                onKeyDown={(e) => e.key === "Enter" && handleGenerateCustomGuide()}
                className="px-4 py-2.5 rounded-xl bg-[#0D2218] border border-[#27875B] text-xs text-white placeholder-[#6B9B7B] focus:outline-none focus:border-[#10B981] w-full md:w-64"
              />
              <button
                onClick={handleGenerateCustomGuide}
                disabled={isGeneratingCustom || !customCropInput.trim()}
                className="px-4 py-2.5 rounded-xl bg-[#10B981] hover:bg-[#059669] text-black font-bold text-xs transition-all flex items-center gap-1.5 shrink-0 disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isGeneratingCustom ? "Generating..." : "Generate Book"}</span>
              </button>
            </div>
          </div>

          {/* Search & Category Filter Toolbar */}
          <div className="bg-[#133A2B] rounded-2xl border border-[#27875B]/60 p-4 flex flex-col md:flex-row gap-4 justify-between items-center shadow-lg">
            {/* Search */}
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B9B7B]" />
              <input
                type="text"
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                placeholder="Search plot guides by crop, animal, or code..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#123D30] border border-[#27875B]/50 text-white placeholder-[#6B9B7B] text-sm focus:outline-none focus:border-[#10B981] transition-all"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
              {[
                { key: "all", label: "All Plot Books" },
                { key: "crops", label: "Crops & Soil" },
                { key: "livestock", label: "Livestock" },
                { key: "engineering", label: "Engineering" },
              ].map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => setCategoryFilter(cat.key as any)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                    categoryFilter === cat.key
                      ? "bg-[#10B981] text-black border-[#10B981] shadow-md"
                      : "bg-[#123D30] text-[#A8D5BA] border-[#27875B]/40 hover:bg-[#1B4D3A] hover:text-white"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Course Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            {filteredCatalogBooks.map((course) => {
              const IconComp = course.icon

              return (
                <div
                  key={course.id}
                  onClick={() => handleSelectCourse(course)}
                  className="group bg-[#133A2B] hover:bg-[#1B4D3A] border border-[#27875B]/50 hover:border-[#10B981] rounded-2xl p-6 transition-all duration-300 flex flex-col justify-between cursor-pointer shadow-xl relative overflow-hidden"
                >
                  {/* Glowing Top Edge Accent */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#10B981] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div>
                    {/* Course Code Badge & Stats */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-md bg-[#123D30] border border-[#27875B]/70 font-mono text-xs font-bold text-[#10B981]">
                          {course.code}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-[#10B981]/20 text-[#34D399] text-[10px] font-bold border border-[#10B981]/40 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> Gemini AI Plot Book
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-[#10B981]/15 text-[#10B981] text-[11px] font-semibold capitalize border border-[#10B981]/30">
                          {course.category}
                        </span>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-[#123D30] text-[11px] font-mono text-[#A8D5BA] border border-[#27875B]/40">
                        {course.progressPercent}% Complete
                      </span>
                    </div>

                    {/* Course Title & Icon */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className="p-2.5 rounded-xl bg-[#123D30] text-[#10B981] group-hover:scale-110 transition-transform shrink-0">
                        <IconComp className="w-6 h-6" />
                      </div>
                      <h2 className="text-lg font-bold text-white group-hover:text-[#10B981] transition-colors leading-snug">
                        {course.title}
                      </h2>
                    </div>

                    {/* Course Description */}
                    <p className="text-xs text-[#A8D5BA] leading-relaxed mb-6 line-clamp-3">
                      {course.description}
                    </p>
                  </div>

                  {/* Footer Meta & CTA */}
                  <div>
                    <div className="w-full bg-[#123D30] rounded-full h-1.5 mb-4 overflow-hidden">
                      <div
                        className="bg-[#10B981] h-full rounded-full transition-all duration-500"
                        style={{ width: `${course.progressPercent}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[#184734] text-xs text-[#6B9B7B]">
                      <span>{course.totalModules} Modules • {course.totalTopics} Topics</span>
                      <div className="flex items-center gap-1 font-semibold text-[#10B981] group-hover:translate-x-1 transition-transform">
                        <span>Study Deck & Reader</span>
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* READER & SLIDE DECK WORKSPACE INTERFACE */}
      {viewMode === "reader" && selectedCourse && (
        <div className="flex-1 flex flex-col h-[calc(100vh-160px)] min-h-[600px] max-h-[850px] w-full rounded-2xl overflow-hidden relative border border-[#184734] shadow-2xl bg-[#0A1A12]">
          {/* Top Navigation Bar - Matching Screenshot Layout */}
          <header className="h-[56px] px-4 md:px-6 bg-[#0D2218] border-b border-[#184734] flex items-center justify-between z-20 shrink-0">
            {/* Left Controls: Back button & Course Code */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setViewMode("catalog")}
                className="p-1.5 rounded-lg bg-[#133A2B] hover:bg-[#1B4D3A] text-[#A8D5BA] hover:text-white transition-colors border border-[#27875B]/40"
                title="Back to Catalog"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-[#6B9B7B]">/</span>
              <span className="px-2.5 py-1 rounded-md bg-[#133A2B] font-mono text-xs font-bold text-white border border-[#27875B]/60 shadow-sm">
                {selectedCourse.code}
              </span>
            </div>

            {/* Right Controls: Read Progress, Focus Mode, Study Deck button, Notification Bell */}
            <div className="flex items-center gap-2 md:gap-3">
              {/* Read Progress Pill */}
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#133A2B] border border-[#27875B]/40 text-xs font-mono text-[#A8D5BA]">
                <BookOpen className="w-3.5 h-3.5 text-[#10B981]" />
                <span>{selectedCourse.progressPercent}% Read</span>
              </div>

              {/* Focus Mode Toggle Button */}
              <button
                onClick={() => setFocusMode(!focusMode)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  focusMode
                    ? "bg-[#10B981] text-black border-[#10B981]"
                    : "bg-[#133A2B] text-[#A8D5BA] border-[#27875B]/40 hover:bg-[#1B4D3A] hover:text-white"
                }`}
                title="Toggle Focus Mode"
              >
                {focusMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                <span className="hidden md:inline">Focus Mode</span>
              </button>

              {/* Study Deck CTA Button - Triggers Flashcard Overlay */}
              <button
                onClick={() => setIsStudyDeckOpen(true)}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#133A2B] hover:bg-[#1B4D3A] border border-[#27875B] text-white text-xs font-semibold transition-all shadow-md group relative"
              >
                <Layers className="w-4 h-4 text-[#10B981] group-hover:scale-110 transition-transform" />
                <span>Study Deck</span>
                <span className="px-1.5 py-0.2 rounded-full bg-[#10B981] text-black font-mono text-[10px] font-bold">
                  {selectedCourse.flashcards.length}
                </span>
              </button>

              {/* Notification Bell Icon */}
              <div className="relative p-2 rounded-lg bg-[#133A2B] text-[#A8D5BA] hover:text-white cursor-pointer border border-[#27875B]/40">
                <Bell className="w-4 h-4" />
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#EF4444] text-white text-[10px] font-bold flex items-center justify-center">
                  1
                </span>
              </div>
            </div>
          </header>

          {/* Main Body: Left 5-Level Hierarchy Sidebar + Right Workspace */}
          <div className="flex-1 flex overflow-hidden relative">
            {/* LEFT SIDEBAR: 5-LEVEL HIERARCHY TREE */}
            {!focusMode && (
              <aside className="w-72 md:w-80 bg-[#0D2218] border-r border-[#184734] flex flex-col h-full shrink-0 z-10 overflow-hidden">
                {/* Course Header inside Sidebar */}
                <div className="p-4 border-b border-[#184734] flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-md bg-[#133A2B] border border-[#27875B]/60 flex items-center justify-center text-xs font-mono font-bold text-[#10B981]">
                        {selectedCourse.code.slice(0, 3)}
                      </div>
                      <span className="font-mono text-sm font-bold text-white">
                        {selectedCourse.code}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-[#133A2B] font-mono text-[11px] text-[#A8D5BA] border border-[#27875B]/40">
                        {selectedCourse.progressPercent}% Complete
                      </span>
                      <button
                        onClick={() => setFocusMode(true)}
                        className="p-1 text-[#6B9B7B] hover:text-white"
                        title="Collapse Sidebar"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <h2 className="text-sm font-semibold text-white leading-snug line-clamp-2">
                    {selectedCourse.title}
                  </h2>

                  {/* Search 5-level hierarchy input */}
                  <div className="relative mt-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6B9B7B]" />
                    <input
                      type="text"
                      value={hierarchySearch}
                      onChange={(e) => setHierarchySearch(e.target.value)}
                      placeholder="Search 5-level hierarchy..."
                      className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#123D30] border border-[#27875B]/40 text-xs text-white placeholder-[#6B9B7B] focus:outline-none focus:border-[#10B981]"
                    />
                  </div>
                </div>

                {/* Collapsible Multi-Level Hierarchy List */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {selectedCourse.hierarchy.map((moduleNode) => (
                    <div key={moduleNode.id} className="space-y-1">
                      {/* Level 1: Module Header */}
                      <button
                        onClick={() => toggleNodeExpand(moduleNode.id)}
                        className="w-full text-left flex items-center gap-2 p-2 rounded-lg hover:bg-[#133A2B] text-xs font-bold text-white transition-colors"
                      >
                        <ChevronDown
                          className={`w-3.5 h-3.5 text-[#10B981] transition-transform ${
                            expandedNodes[moduleNode.id] ? "" : "-rotate-90"
                          }`}
                        />
                        <BookMarked className="w-4 h-4 text-[#10B981]" />
                        <span className="truncate">{moduleNode.title}</span>
                      </button>

                      {/* Level 2: Topic Nodes */}
                      {expandedNodes[moduleNode.id] &&
                        moduleNode.children?.map((topicNode) => (
                          <div key={topicNode.id} className="pl-4 space-y-1 border-l border-[#184734]/60 ml-3">
                            <button
                              onClick={() => toggleNodeExpand(topicNode.id)}
                              className="w-full text-left flex items-center gap-2 p-1.5 rounded-lg hover:bg-[#133A2B] text-xs font-semibold text-[#A8D5BA] transition-colors"
                            >
                              <ChevronDown
                                className={`w-3 h-3 text-[#EAB308] transition-transform ${
                                  expandedNodes[topicNode.id] ? "" : "-rotate-90"
                                }`}
                              />
                              <Folder className="w-3.5 h-3.5 text-[#EAB308]" />
                              <span className="truncate">{topicNode.title}</span>
                            </button>

                            {/* Level 3: Subtopic Nodes */}
                            {expandedNodes[topicNode.id] &&
                              topicNode.children?.map((subtopicNode) => (
                                <div key={subtopicNode.id} className="pl-4 space-y-1 border-l border-[#184734]/40 ml-3">
                                  <button
                                    onClick={() => toggleNodeExpand(subtopicNode.id)}
                                    className="w-full text-left flex items-center gap-2 p-1.5 rounded-lg hover:bg-[#133A2B] text-[11px] font-semibold text-white/90 transition-colors"
                                  >
                                    <ChevronDown
                                      className={`w-3 h-3 text-[#6B9B7B] transition-transform ${
                                        expandedNodes[subtopicNode.id] ? "" : "-rotate-90"
                                      }`}
                                    />
                                    <Layers className="w-3.5 h-3.5 text-[#6B9B7B]" />
                                    <span className="truncate">{subtopicNode.title}</span>
                                  </button>

                                  {/* Level 4/5: Slide / Page Items */}
                                  {expandedNodes[subtopicNode.id] &&
                                    subtopicNode.slides?.map((slide, sIdx) => {
                                      const isSelected = activeSlide?.id === slide.id
                                      const isCompleted = completedSlideIds.has(slide.id)

                                      return (
                                        <div
                                          key={slide.id}
                                          onClick={() => {
                                            setActiveSlide(slide)
                                            setActiveNodeId(subtopicNode.id)
                                            setActiveSlideIndex(sIdx + 1)
                                            setTotalSlidesInSubtopic(subtopicNode.slides?.length || 4)
                                          }}
                                          className={`ml-4 p-2 rounded-lg text-xs flex items-center justify-between cursor-pointer transition-all border ${
                                            isSelected
                                              ? "bg-[#133A2B] text-white border-[#10B981] font-semibold shadow-md"
                                              : "bg-transparent text-[#A8D5BA] border-transparent hover:bg-[#123D30] hover:text-white"
                                          }`}
                                        >
                                          <div className="flex items-center gap-2 min-w-0 pr-2">
                                            <FileText className="w-3.5 h-3.5 text-[#6B9B7B] shrink-0" />
                                            <span className="truncate">{slide.title}</span>
                                          </div>

                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              toggleSlideComplete(slide.id)
                                            }}
                                            className="text-[#6B9B7B] hover:text-[#10B981] shrink-0"
                                          >
                                            {isCompleted ? (
                                              <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                                            ) : (
                                              <Circle className="w-4 h-4" />
                                            )}
                                          </button>
                                        </div>
                                      )
                                    })}
                                </div>
                              ))}
                          </div>
                        ))}
                    </div>
                  ))}
                </div>
              </aside>
            )}

            {/* RIGHT WORKSPACE AREA: Slide Deck View / Page View */}
            <main className="flex-1 flex flex-col h-full min-w-0 overflow-y-auto p-4 md:p-8 bg-[#0A1A12] items-center">
              <div className="w-full max-w-4xl flex flex-col gap-6">
                {/* View Mode Switcher Header - Matching Screenshot Layout */}
                <div className="w-full bg-[#133A2B]/60 border border-[#27875B]/40 rounded-2xl p-2.5 flex items-center justify-between shadow-lg">
                  <div className="flex items-center gap-2 text-xs text-[#A8D5BA] font-semibold px-2">
                    <Sparkles className="w-4 h-4 text-[#10B981]" />
                    <span>Slide Deck</span>
                  </div>

                  {/* Mode Toggle Switch [ Slide Deck | Page View ] */}
                  <div className="bg-[#123D30] p-1 rounded-xl border border-[#27875B]/30 flex items-center gap-1">
                    <button
                      onClick={() => setReaderTab("slide")}
                      className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
                        readerTab === "slide"
                          ? "bg-white text-black font-bold shadow-md"
                          : "text-[#A8D5BA] hover:text-white"
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Slide Deck</span>
                    </button>
                    <button
                      onClick={() => setReaderTab("page")}
                      className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
                        readerTab === "page"
                          ? "bg-white text-black font-bold shadow-md"
                          : "text-[#A8D5BA] hover:text-white"
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Page View</span>
                    </button>
                  </div>
                </div>

                {/* MAIN SLIDE CONTENT CARD - Exact screenshot structure */}
                {activeSlide && readerTab === "slide" && (
                  <div className="w-full bg-[#133A2B] border border-[#27875B] rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col justify-between min-h-[460px] relative overflow-hidden">
                    <div>
                      {/* Top Action Bar inside Card */}
                      <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#184734]">
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 rounded-md bg-[#123D30] border border-[#27875B]/60 font-mono text-xs font-bold text-white">
                            SLIDE {activeSlideIndex}/{totalSlidesInSubtopic}
                          </span>
                          <span className="text-xs text-[#6B9B7B] hidden sm:inline">
                            • Use ← → Arrow Keys
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Explain Concept AI Button */}
                          <button
                            onClick={() => handleExplainConcept(activeSlide)}
                            className="px-3.5 py-1.5 rounded-xl bg-[#2563EB]/20 hover:bg-[#2563EB]/30 border border-[#3B82F6]/50 text-[#60A5FA] hover:text-white text-xs font-semibold transition-all flex items-center gap-1.5"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Explain Concept</span>
                          </button>

                          {/* Mark Complete Toggle Button */}
                          <button
                            onClick={() => toggleSlideComplete(activeSlide.id)}
                            className={`px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5 ${
                              completedSlideIds.has(activeSlide.id)
                                ? "bg-[#10B981]/20 border-[#10B981] text-[#10B981]"
                                : "bg-[#123D30] border-[#27875B]/50 text-[#A8D5BA] hover:text-white"
                            }`}
                          >
                            {completedSlideIds.has(activeSlide.id) ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Completed</span>
                              </>
                            ) : (
                              <>
                                <Circle className="w-3.5 h-3.5" />
                                <span>Mark Complete</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Level & Subtopic Title Header */}
                      <div className="mb-6">
                        <span className="font-mono text-xs font-bold text-[#6B9B7B] uppercase tracking-wider block mb-1">
                          {activeSlide.levelLabel}
                        </span>
                        <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                          {activeSlide.title}
                        </h2>
                      </div>

                      {/* White Mapped Notes Content Canvas */}
                      <div className="bg-white text-black rounded-2xl p-6 md:p-8 shadow-inner leading-relaxed mb-6 font-sans">
                        <div className="text-sm md:text-base text-gray-800 whitespace-pre-wrap font-medium">
                          {activeSlide.content}
                        </div>

                        {/* Code Snippet / Visual SVG Diagram */}
                        {activeSlide.codeSnippet && (
                          <div className="mt-4">
                            {activeSlide.codeSnippet.trim().startsWith("<svg") ? (
                              <div
                                className="w-full flex justify-center bg-[#0D2218] p-3 rounded-xl border border-emerald-900/50 shadow-md"
                                dangerouslySetInnerHTML={{ __html: activeSlide.codeSnippet }}
                              />
                            ) : (
                              <div className="p-4 rounded-xl bg-gray-900 text-emerald-400 font-mono text-xs overflow-x-auto border border-gray-800">
                                <pre>{activeSlide.codeSnippet}</pre>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Key Terms Mapped Pills */}
                        {activeSlide.keyTerms && (
                          <div className="mt-6 pt-4 border-t border-gray-200 flex flex-wrap gap-2">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider self-center mr-2">
                              Mapped Concepts:
                            </span>
                            {activeSlide.keyTerms.map((term, i) => (
                              <span
                                key={i}
                                className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 font-mono text-xs font-semibold border border-emerald-200"
                              >
                                {term}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Slide Navigation Bar */}
                    <div className="bg-[#123D30] border border-[#27875B]/60 rounded-2xl p-3 flex items-center justify-between">
                      <button
                        onClick={handlePrevSlide}
                        disabled={activeSlideIndex <= 1}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                          activeSlideIndex <= 1
                            ? "opacity-40 cursor-not-allowed text-[#6B9B7B]"
                            : "bg-[#133A2B] hover:bg-[#1B4D3A] text-white border border-[#27875B]"
                        }`}
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Slide</span>
                      </button>

                      <div className="px-4 py-1.5 rounded-lg bg-[#133A2B] border border-[#27875B]/40 font-mono text-xs font-bold text-white">
                        {activeSlideIndex} / {totalSlidesInSubtopic}
                      </div>

                      <button
                        onClick={handleNextSlide}
                        disabled={activeSlideIndex >= totalSlidesInSubtopic}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                          activeSlideIndex >= totalSlidesInSubtopic
                            ? "opacity-40 cursor-not-allowed text-[#6B9B7B]"
                            : "bg-[#10B981] hover:bg-[#059669] text-black font-bold shadow-md"
                        }`}
                      >
                        <span>Slide</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* PAGE VIEW MODE */}
                {readerTab === "page" && activeSlide && (
                  <div className="w-full bg-[#133A2B] border border-[#27875B] rounded-3xl p-6 md:p-8 text-white space-y-6">
                    <div className="border-b border-[#184734] pb-4">
                      <span className="font-mono text-xs text-[#10B981]">Page Document View</span>
                      <h2 className="text-2xl font-bold text-white mt-1">{activeSlide.title}</h2>
                    </div>
                    <div className="bg-[#123D30] p-6 rounded-2xl text-sm leading-relaxed text-[#A8D5BA] whitespace-pre-wrap border border-[#27875B]/40">
                      {activeSlide.content}
                    </div>
                  </div>
                )}
              </div>
            </main>
          </div>
        </div>
      )}

      {/* FLASHCARD STUDY DECK MODAL OVERLAY - Matching Screenshot 3 */}
      {isStudyDeckOpen && selectedCourse && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          onClick={() => setIsStudyDeckOpen(false)}
        >
          <div
            className="w-full max-w-2xl bg-[#0D2218] border border-[#27875B] rounded-3xl shadow-2xl flex flex-col overflow-hidden relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header Bar */}
            <div className="p-6 border-b border-[#184734] flex items-start justify-between bg-[#133A2B]/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#133A2B] border border-[#27875B] flex items-center justify-center text-[#10B981]">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white">Course Study Deck & Flashcards</h3>
                    <span className="px-2 py-0.5 rounded bg-[#123D30] font-mono text-xs font-bold text-[#10B981] border border-[#27875B]/40">
                      {selectedCourse.code}
                    </span>
                  </div>
                  <p className="text-xs text-[#A8D5BA] mt-0.5">
                    Spaced repetition card deck built from syllabus learning outcomes
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsStudyDeckOpen(false)}
                className="p-1.5 rounded-lg bg-[#133A2B] text-[#6B9B7B] hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Deck Stats & Progress Bar */}
            <div className="px-6 py-3 bg-[#123D30]/60 border-b border-[#184734] flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-4">
                <span className="text-white font-semibold">
                  Card {currentFlashcardIdx + 1} of {activeDeck.length}
                </span>
                <span className="text-[#10B981] flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> {masteredCount} Mastered
                </span>
                <span className="text-[#EAB308] flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5" /> {learningCount} Learning
                </span>
              </div>

              <div className="w-32 bg-[#133A2B] rounded-full h-2 overflow-hidden border border-[#27875B]/40">
                <div
                  className="bg-[#10B981] h-full transition-all duration-300"
                  style={{
                    width: `${((currentFlashcardIdx + 1) / activeDeck.length) * 100}%`,
                  }}
                />
              </div>
            </div>

            {/* Interactive Flashcard Main Container */}
            <div className="p-6 flex flex-col items-center">
              {activeDeck.length > 0 && (
                <div
                  onClick={() => setIsFlashcardFlipped(!isFlashcardFlipped)}
                  className={`w-full bg-[#133A2B] border border-[#27875B] hover:border-[#10B981] rounded-2xl p-8 cursor-pointer transition-all duration-500 shadow-xl min-h-[260px] flex flex-col justify-between relative group ${
                    isFlashcardFlipped ? "bg-[#184734]" : ""
                  }`}
                >
                  {/* Card Header prompt indicator */}
                  <div className="flex items-center justify-between text-xs font-mono text-[#6B9B7B] mb-4">
                    <span>
                      {isFlashcardFlipped ? "BACK: DETAILED ANSWER" : "FRONT: PROMPT & CONCEPT"}
                    </span>
                    <div className="flex items-center gap-1 text-[#10B981] group-hover:scale-105 transition-transform">
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>Click to Flip</span>
                    </div>
                  </div>

                  {/* Card Main Body */}
                  <div className="my-auto text-center py-4">
                    {!isFlashcardFlipped ? (
                      <h4 className="text-xl md:text-2xl font-bold text-white leading-snug">
                        "{activeDeck[currentFlashcardIdx]?.prompt}"
                      </h4>
                    ) : (
                      <div className="space-y-4 text-left">
                        <p className="text-base text-white leading-relaxed font-medium">
                          {activeDeck[currentFlashcardIdx]?.answer}
                        </p>
                        <div className="p-3 rounded-xl bg-[#123D30] border border-[#27875B]/50 text-xs font-mono text-[#10B981]">
                          💡 Key Takeaway: {activeDeck[currentFlashcardIdx]?.keyTakeaway}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Footer Status */}
                  <div className="flex items-center justify-between pt-4 border-t border-[#184734] text-xs">
                    <span className="text-[#A8D5BA] truncate max-w-[70%]">
                      {activeDeck[currentFlashcardIdx]?.subtopicTitle}
                    </span>
                    <span className="px-2.5 py-1 rounded bg-[#123D30] font-mono text-[11px] font-bold text-[#EAB308] border border-[#27875B]/40">
                      Status: {flashcardStatuses[activeDeck[currentFlashcardIdx]?.id] || "NEW"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Flashcard Modal Navigation Bar */}
            <div className="p-6 border-t border-[#184734] bg-[#133A2B]/40 flex items-center justify-between">
              <button
                onClick={() => {
                  if (currentFlashcardIdx > 0) {
                    setCurrentFlashcardIdx((prev) => prev - 1)
                    setIsFlashcardFlipped(false)
                  }
                }}
                disabled={currentFlashcardIdx === 0}
                className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                  currentFlashcardIdx === 0
                    ? "opacity-40 cursor-not-allowed text-[#6B9B7B]"
                    : "bg-[#133A2B] hover:bg-[#1B4D3A] text-white border border-[#27875B]"
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <span className="text-xs text-[#6B9B7B] font-mono hidden sm:inline">
                Spacebar / Click card to reveal
              </span>

              <button
                onClick={() => {
                  if (currentFlashcardIdx < activeDeck.length - 1) {
                    setCurrentFlashcardIdx((prev) => prev + 1)
                    setIsFlashcardFlipped(false)
                  }
                }}
                disabled={currentFlashcardIdx >= activeDeck.length - 1}
                className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                  currentFlashcardIdx >= activeDeck.length - 1
                    ? "opacity-40 cursor-not-allowed text-[#6B9B7B]"
                    : "bg-[#10B981] hover:bg-[#059669] text-black font-bold shadow-md"
                }`}
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI CONCEPT EXPLAINER MODAL OVERLAY */}
      {isAiExplainOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          onClick={() => setIsAiExplainOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-[#123D30] border border-[#27875B] rounded-3xl p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#27875B]/40 pb-3">
              <div className="flex items-center gap-2 text-[#10B981]">
                <Brain className="w-5 h-5" />
                <h3 className="font-bold text-white text-base">AHub AI Concept Explainer</h3>
              </div>
              <button onClick={() => setIsAiExplainOpen(false)} className="text-[#6B9B7B] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs md:text-sm text-[#A8D5BA] leading-relaxed whitespace-pre-wrap bg-[#0D2218] p-4 rounded-2xl border border-[#27875B]/40">
              {aiExplanationText}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsAiExplainOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#10B981] text-black font-bold text-xs"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
