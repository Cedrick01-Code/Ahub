import { useEffect, useState, useMemo, type FormEvent } from "react"
import { learningApi } from "../lib/learningApi"
import {
  BookOpen,
  ClipboardCheck,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Award,
  Send,
  Sparkles,
  Layers,
  FileText,
  UserCheck,
  RefreshCw,
  Trash2,
  ChevronRight,
  HelpCircle
} from "lucide-react"

type Row = {
  _id: string
  title?: string
  text?: string
  status: string
  assignmentId?: string
  maxScore?: number
  farmerName?: string
  submittedAt?: string
}

type AttemptRow = {
  id: string
  examId: string
  examTitle: string
  status: string
  farmerId?: string
  farmerName?: string
  score?: number
  answers?: Record<string, string>
  submittedAt?: string
}

type ExamRow = {
  _id: string
  title: string
  resultsReleased: boolean
  status: string
}

type QuizQuestion = {
  prompt: string
  options: string[]
  answerKey: string
  marks: number
}

const input =
  "mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-100 transition"

export function SectorLearningTools({
  announce,
}: {
  announce: (message: string) => void
}) {
  const [activeTab, setActiveTab] = useState<"courses" | "quizzes" | "marking" | "exams">("courses")

  // Course builder state
  const [title, setTitle] = useState("")
  const [code, setCode] = useState("")
  const [enterprise, setEnterprise] = useState("")
  const [lessonTitle, setLessonTitle] = useState("")
  const [lessonContent, setLessonContent] = useState("")
  const [courseId, setCourseId] = useState("")

  // Quiz builder state
  const [examTitle, setExamTitle] = useState("")
  const [prompt, setPrompt] = useState("")
  const [options, setOptions] = useState("")
  const [answerKey, setAnswerKey] = useState("")
  const [examId, setExamId] = useState("")

  // Search & Filters for Marking Desk
  const [farmerSearch, setFarmerSearch] = useState("")
  const [markingFilter, setMarkingFilter] = useState<"all" | "submitted" | "graded">("submitted")

  // Submissions state
  const [rows, setRows] = useState<Row[]>([])
  const [score, setScore] = useState<Record<string, string>>({})
  const [feedback, setFeedback] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [attempts, setAttempts] = useState<AttemptRow[]>([])
  const [exams, setExams] = useState<ExamRow[]>([])
  const [attemptScores, setAttemptScores] = useState<Record<string, string>>({})

  const refresh = async () => {
    try {
      const [submissions, examAttempts, examList] = await Promise.all([
        learningApi<{ data: Row[] }>("/submissions"),
        learningApi<{ data: AttemptRow[] }>("/attempts"),
        learningApi<{ data: ExamRow[] }>("/exams"),
      ])
      setRows(submissions.data || [])
      setAttempts(examAttempts.data || [])
      setExams(examList.data || [])
      setError("")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load submissions.")
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  const createCourse = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    try {
      const result = await learningApi<{ data: { _id: string } }>(
        "/courses",
        "POST",
        {
          title,
          code,
          enterpriseIds: [enterprise],
          lessons: [{ title: lessonTitle, content: lessonContent, order: 1 }],
        },
      )
      setCourseId(result.data._id)
      announce("Course draft saved! Submit it for RAB review when complete.")
    } catch (e) {
      announce(e instanceof Error ? e.message : "Course draft failed.")
    } finally {
      setBusy(false)
    }
  }

  const submitCourse = async () => {
    if (!courseId) return
    try {
      await learningApi(`/courses/${courseId}/submit-review`, "POST", {})
      setCourseId("")
      announce("Course sent to RAB for national review & publication.")
    } catch (e) {
      announce(e instanceof Error ? e.message : "Course review request failed.")
    }
  }

  const createExam = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    try {
      const questionOptions = options
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
      if (
        questionOptions.length < 2 ||
        !questionOptions.includes(answerKey.trim())
      )
        throw new Error(
          "Add at least two options and choose an answer key matching one option.",
        )
      const result = await learningApi<{ data: { _id: string } }>(
        "/exams",
        "POST",
        {
          title: examTitle,
          type: "quiz",
          status: "draft",
          timeLimitMinutes: 15,
          maxAttempts: 0,
          questions: [
            {
              prompt,
              type: "single_choice",
              options: questionOptions,
              answerKey: answerKey.trim(),
              marks: 1,
            },
          ],
        },
      )
      setExamId(result.data._id)
      announce("Quiz draft saved! Submit it to RAB for review.")
    } catch (e) {
      announce(e instanceof Error ? e.message : "Quiz draft failed.")
    } finally {
      setBusy(false)
    }
  }

  const submitExam = async () => {
    if (!examId) return
    try {
      await learningApi(`/exams/${examId}/submit-review`, "POST", {})
      setExamId("")
      announce("Quiz sent to RAB for review.")
    } catch (e) {
      announce(e instanceof Error ? e.message : "Quiz review request failed.")
    }
  }

  const grade = async (row: Row) => {
    const maxScore = Number(row.maxScore) || 100
    const value = Number(score[row._id])
    try {
      await learningApi(`/submissions/${row._id}/grade`, "PATCH", {
        score: value,
        maxScore,
        feedback: feedback[row._id] || "",
      })
      announce("Score and farmer feedback saved successfully.")
      await refresh()
    } catch (e) {
      announce(e instanceof Error ? e.message : "Mark could not be saved.")
    }
  }

  const gradeAttempt = async (attempt: AttemptRow) => {
    try {
      await learningApi(`/attempts/${attempt.id}/grade`, "PATCH", {
        score: Number(attemptScores[attempt.id]),
      })
      announce("Exam attempt mark saved.")
      await refresh()
    } catch (e) {
      announce(e instanceof Error ? e.message : "Exam mark could not be saved.")
    }
  }

  const releaseResults = async (exam: ExamRow) => {
    try {
      await learningApi(`/exams/${exam._id}/release-results`, "POST", {})
      announce(`Exam results for "${exam.title}" released to all farmers!`)
      await refresh()
    } catch (e) {
      announce(e instanceof Error ? e.message : "Results could not be released.")
    }
  }

  // Filtered Farmer Submissions
  const filteredSubmissions = useMemo(() => {
    return rows.filter((row) => {
      const matchesSearch = (row.farmerName || row.text || "").toLowerCase().includes(farmerSearch.toLowerCase())
      const matchesStatus = markingFilter === "all" || row.status === markingFilter
      return matchesSearch && matchesStatus
    })
  }, [rows, farmerSearch, markingFilter])

  const pendingSubmissionsCount = rows.filter((r) => r.status === "submitted").length
  const pendingAttemptsCount = attempts.filter((a) => a.status === "submitted").length

  return (
    <div className="mt-6 space-y-6 font-sans">
      {/* Sector Learning Desk Header */}
      <div className="rounded-3xl border border-emerald-200 bg-emerald-900 p-6 text-white shadow-xl sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid size-9 place-items-center rounded-xl bg-white/10 ring-1 ring-white/20">
                <BookOpen size={20} className="text-emerald-300" />
              </span>
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-200">
                Sector Field Operations · Agricultural Education Desk
              </p>
            </div>
            <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
              Sector Learning & Assessment Portal
            </h1>
            <p className="mt-1 text-sm text-emerald-100/80">
              Author regional agricultural courses, manage farmer quizzes, grade field assignments, and publish exam results for your sector.
            </p>
          </div>

          <button
            onClick={() => void refresh()}
            className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/20"
          >
            <RefreshCw size={16} /> Refresh Desk
          </button>
        </div>

        {/* Sector KPI Summary */}
        <div className="mt-6 grid grid-cols-2 gap-3 border-t border-white/15 pt-5 sm:grid-cols-4">
          <div className="rounded-2xl bg-white/10 p-3.5 backdrop-blur-xs">
            <p className="text-xl font-black">{pendingSubmissionsCount}</p>
            <p className="text-xs text-emerald-200">Submissions To Mark</p>
          </div>
          <div className="rounded-2xl bg-white/10 p-3.5 backdrop-blur-xs">
            <p className="text-xl font-black">{pendingAttemptsCount}</p>
            <p className="text-xs text-emerald-200">Exam Attempts To Grade</p>
          </div>
          <div className="rounded-2xl bg-white/10 p-3.5 backdrop-blur-xs">
            <p className="text-xl font-black">{exams.filter((e) => e.status === "published" && !e.resultsReleased).length}</p>
            <p className="text-xs text-emerald-200">Exams Ready for Release</p>
          </div>
          <div className="rounded-2xl bg-white/10 p-3.5 backdrop-blur-xs">
            <p className="text-xl font-black">{rows.length}</p>
            <p className="text-xs text-emerald-200">Total Farmer Submissions</p>
          </div>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-900">
          ⚠️ {error}
        </div>
      )}

      {/* Navigation Workspace Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        {[
          { id: "courses", label: "Course & Lesson Builder", icon: BookOpen },
          { id: "quizzes", label: "Quiz Creator", icon: ClipboardCheck },
          { id: "marking", label: "Farmer Marking Desk", icon: UserCheck, count: pendingSubmissionsCount },
          { id: "exams", label: "Exam Marking & Results", icon: Award, count: pendingAttemptsCount },
        ].map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 rounded-2xl px-5 py-3 text-xs font-bold transition ${
                activeTab === tab.id
                  ? "bg-emerald-700 text-white shadow-md"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-emerald-50 hover:text-emerald-900"
              }`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`rounded-full px-2 py-0.5 text-[10px] ${activeTab === tab.id ? "bg-emerald-900 text-white" : "bg-rose-500 text-white font-bold"}`}>
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* TAB 1: Course & Lesson Builder */}
      {activeTab === "courses" && (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <BookOpen size={20} className="text-emerald-700" />
                <span>Agricultural Course & Lesson Authoring</span>
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Draft sector-specific courses (e.g. Maize Pests, Soil Nutrition, Dairy Management). Saved drafts are submitted to RAB for national verification.
              </p>
            </div>
          </div>

          <form onSubmit={createCourse} className="mt-6 space-y-4 max-w-3xl">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-xs font-bold text-slate-700">
                Course Title
                <input
                  required
                  className={input}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Modern Maize Disease Prevention"
                />
              </label>

              <label className="block text-xs font-bold text-slate-700">
                Course Code
                <input
                  required
                  className={input}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. MAIZE-101"
                />
              </label>
            </div>

            <label className="block text-xs font-bold text-slate-700">
              Crop / Livestock Type (Enterprise)
              <input
                required
                className={input}
                value={enterprise}
                onChange={(e) => setEnterprise(e.target.value)}
                placeholder="e.g. Maize, Dairy Cattle, Irish Potatoes"
              />
            </label>

            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 space-y-3">
              <h3 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">Lesson Module #1</h3>
              <label className="block text-xs font-bold text-slate-700">
                Lesson Title
                <input
                  required
                  className={input}
                  value={lessonTitle}
                  onChange={(e) => setLessonTitle(e.target.value)}
                  placeholder="e.g. Identifying Fall Armyworm Symptoms"
                />
              </label>
              <label className="block text-xs font-bold text-slate-700">
                Lesson Content & Technical Steps
                <textarea
                  required
                  rows={5}
                  className={input}
                  value={lessonContent}
                  onChange={(e) => setLessonContent(e.target.value)}
                  placeholder="Write clear, step-by-step instructions for farmers in your sector…"
                />
              </label>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                disabled={busy}
                type="submit"
                className="rounded-xl bg-emerald-700 px-5 py-3 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-50 shadow-md transition"
              >
                Save Course Draft
              </button>

              {courseId && (
                <button
                  type="button"
                  onClick={() => void submitCourse()}
                  className="rounded-xl border border-emerald-700 bg-emerald-50 px-5 py-3 text-xs font-bold text-emerald-900 hover:bg-emerald-100 transition"
                >
                  Submit to RAB for Review & Publication
                </button>
              )}
            </div>
          </form>
        </section>
      )}

      {/* TAB 2: Quiz Creator */}
      {activeTab === "quizzes" && (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <ClipboardCheck size={20} className="text-blue-700" />
                <span>Farmer Assessment Quiz Creator</span>
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Design single choice evaluation quizzes for farmers to test their practical knowledge.
              </p>
            </div>
          </div>

          <form onSubmit={createExam} className="mt-6 space-y-4 max-w-3xl">
            <label className="block text-xs font-bold text-slate-700">
              Quiz Title
              <input
                required
                className={input}
                value={examTitle}
                onChange={(e) => setExamTitle(e.target.value)}
                placeholder="e.g. Fertilizer Application Quiz"
              />
            </label>

            <label className="block text-xs font-bold text-slate-700">
              Question Prompt
              <input
                required
                className={input}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. What is the recommended NPK ratio for maize planting?"
              />
            </label>

            <label className="block text-xs font-bold text-slate-700">
              Answer Options (separated by commas)
              <input
                required
                className={input}
                value={options}
                onChange={(e) => setOptions(e.target.value)}
                placeholder="e.g. 17-17-17, 10-20-10, Urea 46%, Organic Compost"
              />
            </label>

            <label className="block text-xs font-bold text-slate-700">
              Correct Answer Key (must match one option exactly)
              <input
                required
                className={input}
                value={answerKey}
                onChange={(e) => setAnswerKey(e.target.value)}
                placeholder="e.g. 17-17-17"
              />
            </label>

            <div className="flex items-center gap-3 pt-2">
              <button
                disabled={busy}
                type="submit"
                className="rounded-xl bg-blue-700 px-5 py-3 text-xs font-bold text-white hover:bg-blue-800 disabled:opacity-50 shadow-md transition"
              >
                Save Quiz Draft
              </button>

              {examId && (
                <button
                  type="button"
                  onClick={() => void submitExam()}
                  className="rounded-xl border border-blue-700 bg-blue-50 px-5 py-3 text-xs font-bold text-blue-900 hover:bg-blue-100 transition"
                >
                  Submit Quiz to RAB for Review
                </button>
              )}
            </div>
          </form>
        </section>
      )}

      {/* TAB 3: Farmer Marking Desk */}
      {activeTab === "marking" && (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm animate-in fade-in duration-150">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <UserCheck size={20} className="text-emerald-700" />
                <span>Farmer Practical Submissions Desk</span>
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Review submitted practice reports and assigned field homework from farmers in your sector.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="search"
                  placeholder="Search farmer name or text…"
                  value={farmerSearch}
                  onChange={(e) => setFarmerSearch(e.target.value)}
                  className="w-56 rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <select
                value={markingFilter}
                onChange={(e) => setMarkingFilter(e.target.value as any)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 focus:border-emerald-500 focus:outline-none"
              >
                <option value="submitted">Awaiting Marking ({pendingSubmissionsCount})</option>
                <option value="graded">Graded Work</option>
                <option value="all">All Submissions</option>
              </select>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {filteredSubmissions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-500 text-xs">
                No farmer work found matching your current filter.
              </div>
            ) : (
              filteredSubmissions.map((row) => (
                <article
                  key={row._id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 hover:border-emerald-200 hover:shadow-md transition"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="rounded-lg bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                        {row.assignmentId ? "Assigned Homework" : "Practice Report"}
                      </span>
                      <h4 className="mt-1 text-sm font-bold text-slate-900">
                        {row.farmerName || "Farmer Submission"}
                      </h4>
                    </div>

                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${row.status === "graded" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                      {row.status}
                    </span>
                  </div>

                  <p className="mt-3 text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed whitespace-pre-wrap">
                    {row.text || "No text attachment provided."}
                  </p>

                  <div className="mt-4 grid gap-3 sm:grid-cols-[140px_1fr_auto] items-end border-t border-slate-100 pt-3">
                    <label className="block text-[11px] font-bold text-slate-700">
                      Score (out of {row.maxScore || 100})
                      <input
                        type="number"
                        min="0"
                        max={row.maxScore || 100}
                        className={input}
                        value={score[row._id] ?? ""}
                        onChange={(e) =>
                          setScore((current) => ({
                            ...current,
                            [row._id]: e.target.value,
                          }))
                        }
                        placeholder="Enter score"
                      />
                    </label>

                    <label className="block text-[11px] font-bold text-slate-700">
                      Feedback for Farmer
                      <input
                        className={input}
                        value={feedback[row._id] ?? ""}
                        onChange={(e) =>
                          setFeedback((current) => ({
                            ...current,
                            [row._id]: e.target.value,
                          }))
                        }
                        placeholder="Add constructive notes on crop technique…"
                      />
                    </label>

                    <button
                      onClick={() => void grade(row)}
                      className="rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-800 transition shadow-xs"
                    >
                      Save Mark & Feedback
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      )}

      {/* TAB 4: Exam Marking & Results Release */}
      {activeTab === "exams" && (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm animate-in fade-in duration-150">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Award size={20} className="text-amber-700" />
                <span>Exam Attempts Grading & Results Release Desk</span>
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Grade written exam responses and release final results to farmers across your sector.
              </p>
            </div>
          </div>

          {/* Exam Attempts List */}
          <div className="mt-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Submitted Exam Attempts ({attempts.filter((a) => a.status === "submitted").length}):</h3>

            {attempts.filter((a) => a.status === "submitted").length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-slate-500 text-xs">
                No exam attempts currently waiting for marking.
              </div>
            ) : (
              attempts
                .filter((item) => item.status === "submitted")
                .map((attempt) => (
                  <article key={attempt.id} className="rounded-2xl border border-slate-200 p-4 bg-white space-y-3">
                    <div className="flex justify-between items-center">
                      <b className="text-sm font-bold text-slate-900">{attempt.examTitle || "Farmer Exam Attempt"}</b>
                      <span className="text-xs text-slate-500">{attempt.farmerName || attempt.farmerId}</span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl text-xs text-slate-700 whitespace-pre-wrap">
                      {Object.values(attempt.answers || {}).join("\n") || "No written answer provided."}
                    </div>

                    <div className="flex gap-2 items-center">
                      <input
                        type="number"
                        min="0"
                        className="w-32 rounded-xl border border-slate-200 p-2 text-xs"
                        value={attemptScores[attempt.id] || ""}
                        onChange={(e) =>
                          setAttemptScores((current) => ({
                            ...current,
                            [attempt.id]: e.target.value,
                          }))
                        }
                        placeholder="Enter Score"
                      />
                      <button
                        onClick={() => void gradeAttempt(attempt)}
                        className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800 transition"
                      >
                        Save Attempt Mark
                      </button>
                    </div>
                  </article>
                ))
            )}

            {/* Results Release Buttons */}
            <div className="mt-8 border-t border-slate-100 pt-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Release Published Exam Results:</h3>
              <p className="text-xs text-slate-500">Releasing results notifies farmers of their final grades and scores on their portal.</p>

              <div className="flex flex-wrap gap-3 pt-1">
                {exams.filter((exam) => exam.status === "published" && !exam.resultsReleased).length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No published exams waiting for result release.</p>
                ) : (
                  exams
                    .filter((exam) => exam.status === "published" && !exam.resultsReleased)
                    .map((exam) => (
                      <button
                        key={exam._id}
                        onClick={() => void releaseResults(exam)}
                        className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-950 hover:bg-emerald-100 shadow-xs transition"
                      >
                        <Sparkles size={15} className="text-emerald-700" />
                        <span>Release Results: {exam.title}</span>
                      </button>
                    ))
                )}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
