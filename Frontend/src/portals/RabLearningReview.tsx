import { useEffect, useState, useMemo } from "react"
import { learningApi } from "../lib/learningApi"
import {
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  CheckSquare,
  BookOpen,
  ClipboardCheck,
  Building2,
  ShieldAlert,
  Eye,
  RefreshCw,
  Sparkles,
  Layers,
  FileText,
  ChevronRight,
  X,
  Megaphone,
  Award,
  Check,
  RotateCcw
} from "lucide-react"

type ReviewCourse = {
  _id: string
  title: string
  code: string
  description?: string
  requiresExpertReview: boolean
  ownerSectorId: string
  enterpriseIds?: string[]
  lessons?: { _id?: string; title: string; content: string; order?: number }[]
  createdAt?: string
}

type ReviewExam = {
  _id: string
  title: string
  type: string
  ownerSectorId: string
  questions: { prompt: string; type: string; options?: string[]; answerKey?: string; marks: number }[]
  createdAt?: string
}

type Queue = { courses: ReviewCourse[]; exams: ReviewExam[] }

export function RabLearningReview({
  announce,
}: {
  announce: (message: string) => void
}) {
  const [queue, setQueue] = useState<Queue>({ courses: [], exams: [] })
  const [approvals, setApprovals] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [searchQuery, setSearchQuery] = useState("")
  const [sectorFilter, setSectorFilter] = useState("all")
  const [activeTab, setActiveTab] = useState<"all" | "courses" | "exams" | "expert">("all")

  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([])
  const [selectedExamIds, setSelectedExamIds] = useState<string[]>([])

  const [previewItem, setPreviewItem] = useState<{
    type: "course" | "exam"
    course?: ReviewCourse
    exam?: ReviewExam
  } | null>(null)

  const [returnModal, setReturnModal] = useState<{
    isOpen: boolean
    kind: "courses" | "exams"
    id: string
    title: string
  } | null>(null)
  const [returnReason, setReturnReason] = useState("")

  const refresh = async () => {
    setLoading(true)
    try {
      const result = await learningApi<{ data: Queue }>("/review-queue")
      setQueue(result.data || { courses: [], exams: [] })
      setError("")
      setSelectedCourseIds([])
      setSelectedExamIds([])
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Review queue could not be loaded.",
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  // Sectors list for dropdown
  const uniqueSectors = useMemo(() => {
    const set = new Set<string>()
    queue.courses.forEach((c) => c.ownerSectorId && set.add(c.ownerSectorId))
    queue.exams.forEach((e) => e.ownerSectorId && set.add(e.ownerSectorId))
    return Array.from(set).sort()
  }, [queue])

  // Filtered lists
  const filteredCourses = useMemo(() => {
    return queue.courses.filter((course) => {
      const matchesSearch =
        course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (course.ownerSectorId || "").toLowerCase().includes(searchQuery.toLowerCase())
      const matchesSector = sectorFilter === "all" || course.ownerSectorId === sectorFilter
      const matchesTab = activeTab === "all" || activeTab === "courses" || (activeTab === "expert" && course.requiresExpertReview)
      return matchesSearch && matchesSector && matchesTab
    })
  }, [queue.courses, searchQuery, sectorFilter, activeTab])

  const filteredExams = useMemo(() => {
    return queue.exams.filter((exam) => {
      const matchesSearch =
        exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (exam.ownerSectorId || "").toLowerCase().includes(searchQuery.toLowerCase())
      const matchesSector = sectorFilter === "all" || exam.ownerSectorId === sectorFilter
      const matchesTab = activeTab === "all" || activeTab === "exams"
      return matchesSearch && matchesSector && matchesTab
    })
  }, [queue.exams, searchQuery, sectorFilter, activeTab])

  const expertCount = useMemo(() => {
    return queue.courses.filter((c) => c.requiresExpertReview).length
  }, [queue.courses])

  const decide = async (
    kind: "courses" | "exams",
    id: string,
    decision: "approve" | "return",
    expertApproval = false,
    reason?: string
  ) => {
    try {
      await learningApi(`/${kind}/${id}/review`, "POST", {
        decision,
        expertApproval,
        reason,
      })
      announce(
        decision === "approve"
          ? "Item approved for national publication!"
          : "Item returned to sector author with review feedback."
      )
      await refresh()
    } catch (e) {
      announce(
        e instanceof Error ? e.message : "Review decision could not be saved."
      )
    }
  }

  const handleBulkApprove = async () => {
    if (!selectedCourseIds.length && !selectedExamIds.length) return
    if (!confirm(`Are you sure you want to approve ${selectedCourseIds.length} course(s) and ${selectedExamIds.length} exam(s) for national distribution?`)) return

    try {
      for (const id of selectedCourseIds) {
        const course = queue.courses.find((c) => c._id === id)
        await learningApi(`/courses/${id}/review`, "POST", {
          decision: "approve",
          expertApproval: Boolean(approvals[id] || !course?.requiresExpertReview),
        })
      }
      for (const id of selectedExamIds) {
        await learningApi(`/exams/${id}/review`, "POST", {
          decision: "approve",
        })
      }
      announce("Bulk approval completed successfully!")
      await refresh()
    } catch (e) {
      announce(e instanceof Error ? e.message : "Bulk approval failed.")
    }
  }

  const toggleSelectCourse = (id: string) => {
    setSelectedCourseIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const toggleSelectExam = (id: string) => {
    setSelectedExamIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  return (
    <div className="mt-6 space-y-6 font-sans">
      {/* Top Banner KPI Overview */}
      <div className="rounded-3xl border border-emerald-200 bg-gradient-to-r from-emerald-900 via-emerald-800 to-slate-900 p-6 text-white shadow-xl sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid size-9 place-items-center rounded-xl bg-white/10 ring-1 ring-white/20">
                <Building2 size={20} className="text-emerald-300" />
              </span>
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-200">
                Rwanda Agriculture Board (RAB) · National Directorate
              </p>
            </div>
            <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
              National Learning Quality Review Desk
            </h1>
            <p className="mt-1 text-sm text-emerald-100/80">
              Audit and publish sector-authored agricultural courses, technical guides, and farmer assessment quizzes across all 416 Sectors.
            </p>
          </div>

          <button
            onClick={() => void refresh()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/20 disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh Queue
          </button>
        </div>

        {/* National Stats Pills */}
        <div className="mt-6 grid grid-cols-2 gap-3 border-t border-white/15 pt-5 sm:grid-cols-4">
          <div className="rounded-2xl bg-white/10 p-3.5 backdrop-blur-xs">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-xl bg-emerald-500/20 text-emerald-300">
                <BookOpen size={18} />
              </span>
              <div>
                <p className="text-xl font-black">{queue.courses.length}</p>
                <p className="text-xs text-emerald-200">Courses Awaiting Review</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white/10 p-3.5 backdrop-blur-xs">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-xl bg-blue-500/20 text-blue-300">
                <ClipboardCheck size={18} />
              </span>
              <div>
                <p className="text-xl font-black">{queue.exams.length}</p>
                <p className="text-xs text-emerald-200">Quizzes Awaiting Review</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white/10 p-3.5 backdrop-blur-xs">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-xl bg-amber-500/20 text-amber-300">
                <ShieldAlert size={18} />
              </span>
              <div>
                <p className="text-xl font-black">{expertCount}</p>
                <p className="text-xs text-emerald-200">Requires Expert Audit</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white/10 p-3.5 backdrop-blur-xs">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-xl bg-purple-500/20 text-purple-300">
                <Building2 size={18} />
              </span>
              <div>
                <p className="text-xl font-black">{uniqueSectors.length}</p>
                <p className="text-xs text-emerald-200">Submitting Sectors</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-900">
          ⚠️ {error}
        </div>
      )}

      {/* Main Workspace Panel */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        {/* Controls Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-100">
          {/* Tab Filter Chips */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: "all", label: "All Items", count: queue.courses.length + queue.exams.length },
              { id: "courses", label: "Courses", count: queue.courses.length },
              { id: "exams", label: "Quizzes", count: queue.exams.length },
              { id: "expert", label: "Expert Audit", count: expertCount },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                  activeTab === tab.id
                    ? "bg-emerald-700 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <span>{tab.label}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] ${activeTab === tab.id ? "bg-emerald-900/60 text-white" : "bg-slate-200 text-slate-700"}`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search & Sector Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="search"
                placeholder="Search title, code, or sector…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-100"
              />
            </div>

            <select
              value={sectorFilter}
              onChange={(e) => setSectorFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100"
            >
              <option value="all">All Sectors</option>
              {uniqueSectors.map((sec) => (
                <option key={sec} value={sec}>
                  {sec}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Bulk Action Bar */}
        {(selectedCourseIds.length > 0 || selectedExamIds.length > 0) && (
          <div className="mt-4 flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 animate-in fade-in duration-150">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-950">
              <CheckSquare size={16} className="text-emerald-700" />
              <span>Selected {selectedCourseIds.length} course(s) and {selectedExamIds.length} quiz(zes)</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setSelectedCourseIds([]); setSelectedExamIds([]); }}
                className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Clear Selection
              </button>
              <button
                onClick={handleBulkApprove}
                className="rounded-xl bg-emerald-700 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-800 shadow-sm"
              >
                Approve Selected Items
              </button>
            </div>
          </div>
        )}

        {/* Review Queue Grid */}
        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          {/* Courses Column */}
          {(activeTab === "all" || activeTab === "courses" || activeTab === "expert") && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <BookOpen size={18} className="text-emerald-700" />
                  <span>Draft Courses ({filteredCourses.length})</span>
                </h3>
              </div>

              {filteredCourses.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-500 text-xs">
                  No courses matching filter criteria.
                </div>
              ) : (
                filteredCourses.map((course) => {
                  const isSelected = selectedCourseIds.includes(course._id)
                  return (
                    <article
                      key={course._id}
                      className={`rounded-2xl border p-5 transition duration-200 ${
                        isSelected
                          ? "border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-200"
                          : "border-slate-200 bg-white hover:border-emerald-200 hover:shadow-md"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectCourse(course._id)}
                            className="mt-1 size-4 rounded text-emerald-600 focus:ring-emerald-500"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="rounded-lg bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                                {course.code}
                              </span>
                              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                                <Building2 size={13} /> {course.ownerSectorId || "Sector Draft"}
                              </span>
                            </div>
                            <h4 className="mt-1 text-base font-bold text-slate-900">{course.title}</h4>
                          </div>
                        </div>

                        <button
                          onClick={() => setPreviewItem({ type: "course", course })}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
                        >
                          <Eye size={14} /> Inspect
                        </button>
                      </div>

                      {course.description && (
                        <p className="mt-3 text-xs text-slate-600 line-clamp-2">{course.description}</p>
                      )}

                      {course.requiresExpertReview && (
                        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                          <label className="flex items-start gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(approvals[course._id])}
                              onChange={(e) =>
                                setApprovals((current) => ({
                                  ...current,
                                  [course._id]: e.target.checked,
                                }))
                              }
                              className="mt-0.5 size-4 rounded text-amber-600 focus:ring-amber-500"
                            />
                            <span>
                              <b>Technical Guidance Audit Required:</b> I verify that sensitive pesticide/veterinary guidelines comply with RAB standards.
                            </span>
                          </label>
                        </div>
                      )}

                      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                        <span className="text-xs text-slate-400">
                          {course.lessons?.length || 0} lesson modules included
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              setReturnModal({
                                isOpen: true,
                                kind: "courses",
                                id: course._id,
                                title: course.title,
                              })
                            }
                            className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
                          >
                            Return for Edits
                          </button>
                          <button
                            onClick={() =>
                              void decide(
                                "courses",
                                course._id,
                                "approve",
                                Boolean(approvals[course._id])
                              )
                            }
                            className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800 shadow-sm"
                          >
                            Approve Course
                          </button>
                        </div>
                      </div>
                    </article>
                  )
                })
              )}
            </div>
          )}

          {/* Quizzes Column */}
          {(activeTab === "all" || activeTab === "exams") && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ClipboardCheck size={18} className="text-blue-700" />
                  <span>Draft Quizzes & Exams ({filteredExams.length})</span>
                </h3>
              </div>

              {filteredExams.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-500 text-xs">
                  No quizzes matching filter criteria.
                </div>
              ) : (
                filteredExams.map((exam) => {
                  const isSelected = selectedExamIds.includes(exam._id)
                  return (
                    <article
                      key={exam._id}
                      className={`rounded-2xl border p-5 transition duration-200 ${
                        isSelected
                          ? "border-blue-500 bg-blue-50/40 ring-2 ring-blue-200"
                          : "border-slate-200 bg-white hover:border-blue-200 hover:shadow-md"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectExam(exam._id)}
                            className="mt-1 size-4 rounded text-blue-600 focus:ring-blue-500"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="rounded-lg bg-blue-100 px-2.5 py-0.5 text-[10px] font-bold text-blue-800 uppercase tracking-wider">
                                {exam.type || "quiz"}
                              </span>
                              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                                <Building2 size={13} /> {exam.ownerSectorId || "Sector Draft"}
                              </span>
                            </div>
                            <h4 className="mt-1 text-base font-bold text-slate-900">{exam.title}</h4>
                          </div>
                        </div>

                        <button
                          onClick={() => setPreviewItem({ type: "exam", exam })}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
                        >
                          <Eye size={14} /> Preview Questions
                        </button>
                      </div>

                      <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs">
                        <p className="font-bold text-slate-700">Questions snippet:</p>
                        <ul className="mt-1.5 space-y-1 list-disc list-inside text-slate-600">
                          {exam.questions.slice(0, 2).map((q, i) => (
                            <li key={i} className="truncate">
                              {q.prompt} ({q.marks} marks)
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                        <span className="text-xs text-slate-400">
                          {exam.questions.length} total questions
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              setReturnModal({
                                isOpen: true,
                                kind: "exams",
                                id: exam._id,
                                title: exam.title,
                              })
                            }
                            className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
                          >
                            Return for Edits
                          </button>
                          <button
                            onClick={() => void decide("exams", exam._id, "approve")}
                            className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800 shadow-sm"
                          >
                            Approve Quiz
                          </button>
                        </div>
                      </div>
                    </article>
                  )
                })
              )}
            </div>
          )}
        </div>
      </section>

      {/* Preview Modal Drawer */}
      {previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setPreviewItem(null)}>
          <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="rounded-lg bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 uppercase">
                  {previewItem.type === "course" ? "Course Inspection" : "Quiz Inspection"}
                </span>
                <h3 className="mt-1 text-xl font-bold text-slate-900">
                  {previewItem.course?.title || previewItem.exam?.title}
                </h3>
              </div>
              <button onClick={() => setPreviewItem(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            {previewItem.type === "course" && previewItem.course && (
              <div className="mt-4 space-y-4">
                <div className="rounded-xl bg-slate-50 p-4 text-xs text-slate-600">
                  <p><b>Course Code:</b> {previewItem.course.code}</p>
                  <p className="mt-1"><b>Author Sector:</b> {previewItem.course.ownerSectorId}</p>
                  <p className="mt-1"><b>Description:</b> {previewItem.course.description || "N/A"}</p>
                </div>

                <h4 className="font-bold text-sm text-slate-900">Lesson Modules ({previewItem.course.lessons?.length || 0}):</h4>
                <div className="space-y-3">
                  {(previewItem.course.lessons || []).map((lesson, idx) => (
                    <div key={idx} className="rounded-2xl border border-slate-200 p-4 bg-white">
                      <b className="text-sm text-emerald-900">Module {idx + 1}: {lesson.title}</b>
                      <p className="mt-2 text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">{lesson.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {previewItem.type === "exam" && previewItem.exam && (
              <div className="mt-4 space-y-4">
                <div className="rounded-xl bg-slate-50 p-4 text-xs text-slate-600">
                  <p><b>Exam Type:</b> {previewItem.exam.type}</p>
                  <p className="mt-1"><b>Author Sector:</b> {previewItem.exam.ownerSectorId}</p>
                </div>

                <h4 className="font-bold text-sm text-slate-900">Questions ({previewItem.exam.questions.length}):</h4>
                <div className="space-y-3">
                  {previewItem.exam.questions.map((q, idx) => (
                    <div key={idx} className="rounded-2xl border border-slate-200 p-4 bg-white space-y-2">
                      <div className="flex justify-between items-start">
                        <b className="text-sm text-slate-900">Q{idx + 1}. {q.prompt}</b>
                        <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg">{q.marks} mark(s)</span>
                      </div>
                      {q.options && q.options.length > 0 && (
                        <div className="pl-3 text-xs text-slate-600 space-y-1">
                          {q.options.map((opt, optIdx) => (
                            <div key={optIdx} className={`p-2 rounded-lg border ${opt === q.answerKey ? "bg-emerald-50 border-emerald-300 font-bold text-emerald-900" : "bg-slate-50 border-slate-100"}`}>
                              {opt} {opt === q.answerKey && "✓ (Correct Answer)"}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Return Reason Modal */}
      {returnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setReturnModal(null)}>
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Return to Author Sector</h3>
              <button onClick={() => setReturnModal(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <p className="mt-3 text-xs text-slate-600">
              Explain required edits for <b>{returnModal.title}</b> so the sector author can update it before re-submitting.
            </p>
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                await decide(returnModal.kind, returnModal.id, "return", false, returnReason)
                setReturnReason("")
                setReturnModal(null)
              }}
              className="mt-4 space-y-4"
            >
              <textarea
                required
                rows={4}
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder="Specific guidance or corrections required…"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-100"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReturnModal(null)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!returnReason.trim()}
                  className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  Return for Edits
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
