import { useEffect, useMemo, useState, useCallback, type FormEvent } from "react"
import { BookOpen, ClipboardCheck, Send, Sprout, Plus, MapPin, Wheat, PawPrint, Edit, Eye, Trash2, ChevronRight } from "lucide-react"
import { learningApi } from "../lib/learningApi"
import { PlotRegistrationWizard, PlotListView, type PlotData } from "./PlotRegistrationWizard"
import {
  readLearningOutbox,
  syncLearningOutbox,
  type OutboxItem,
} from "../lib/learningOutbox"
import { SectorLearningTools } from "./SectorLearningTools"

type LearningProps = {
  role: "farmer" | "sector"
  announce: (message: string) => void
}

type LearningAssignment = {
  _id: string
  title: string
  instructions?: string
  enterpriseIds?: string[]
  dueAt?: string
  status: string
  allowGroup?: boolean
  mySubmission?: {
    status: string
    submittedAt?: string
    late?: boolean
    score?: number
    feedback?: string
  } | null
}
type LearningCourse = {
  _id: string
  title: string
  enterpriseIds?: string[]
  lessons?: {
    _id: string
    title: string
    content: string
    order?: number
    sources?: string[]
  }[]
}
type LearningExam = {
  _id: string
  title: string
  type: string
  timeLimitMinutes: number
  questions: { _id: string; prompt: string; options?: string[] }[]
}

export function FarmerLearning({ role, announce }: LearningProps) {
  const [enterprise, setEnterprise] = useState("All")
  const [assignments, setAssignments] = useState<LearningAssignment[]>([])
  const [courses, setCourses] = useState<LearningCourse[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [saving, setSaving] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newInstructions, setNewInstructions] = useState("")
  const [newEnterprise, setNewEnterprise] = useState("")
  const [newDue, setNewDue] = useState("")
  const [allowGroup, setAllowGroup] = useState(false)
  const [guide, setGuide] = useState("All")
  const [openGuide, setOpenGuide] = useState("")
  const [responses, setResponses] = useState<Record<string, string>>({})
  const [groupMembers, setGroupMembers] = useState<Record<string, string>>({})
  const [trackerFilter, setTrackerFilter] = useState("All")
  const [outbox, setOutbox] = useState<OutboxItem[]>([])
  const [exams, setExams] = useState<LearningExam[]>([])
  const [activeExam, setActiveExam] = useState<{
    id: string
    questions: LearningExam["questions"]
    deadlineAt: string
  } | null>(null)
  const [examAnswers, setExamAnswers] = useState<Record<string, string>>({})
  const [practiceTitle, setPracticeTitle] = useState("")
  const [practiceText, setPracticeText] = useState("")
  const [practiceCourse, setPracticeCourse] = useState("")
  const [courseTitle, setCourseTitle] = useState("")
  const [courseCode, setCourseCode] = useState("")
const [lessonTitle, setLessonTitle] = useState("")
  const [lessonContent, setLessonContent] = useState("")

  // Plot registration state
  const [plots, setPlots] = useState<PlotData[]>([])
  const [plotsLoading, setPlotsLoading] = useState(true)
  const [showPlotWizard, setShowPlotWizard] = useState(false)
  const [editingPlot, setEditingPlot] = useState<PlotData | null>(null)

  const loadPlots = useCallback(async () => {
    try {
      setPlotsLoading(true)
      const result = await learningApi<{ data: PlotData[] }>("/plots")
      setPlots(result.data || [])
    } catch (error) {
      console.error("Failed to load plots:", error)
    } finally {
      setPlotsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPlots()
  }, [loadPlots])

  const handlePlotSubmit = async (plot: PlotData) => {
    try {
      const result = await learningApi<{ data: PlotData }>("/plots", "POST", plot)
      setPlots(prev => [...prev, result.data])
      setShowPlotWizard(false)
      setEditingPlot(null)
      announce("Plot registered successfully")
    } catch (error) {
      announce(error instanceof Error ? error.message : "Failed to register plot")
      throw error
    }
  }

  const handlePlotUpdate = async (plot: PlotData) => {
    try {
      const result = await learningApi<{ data: PlotData }>(`/plots/${plot.plotId}`, "PUT", plot)
      setPlots(prev => prev.map(p => p.plotId === plot.plotId ? result.data : p))
      setShowPlotWizard(false)
      setEditingPlot(null)
      announce("Plot updated successfully")
    } catch (error) {
      announce(error instanceof Error ? error.message : "Failed to update plot")
      throw error
    }
  }

  const handlePlotDelete = async (plotId: string) => {
    if (!confirm("Are you sure you want to delete this plot?")) return
    try {
      await learningApi(`/plots/${plotId}`, "DELETE")
      setPlots(prev => prev.filter(p => p.plotId !== plotId))
      announce("Plot deleted")
    } catch (error) {
      announce(error instanceof Error ? error.message : "Failed to delete plot")
    }
  }

  const enterprises = useMemo(
    () =>
      [
        ...new Set([
          ...assignments.flatMap((item) => item.enterpriseIds || []),
          ...courses.flatMap((item) => item.enterpriseIds || []),
        ]),
      ].sort((a, b) => a.localeCompare(b)),
    [assignments, courses],
  )
  const scopedAssignments = useMemo(
    () =>
      assignments.filter(
        (item) =>
          enterprise === "All" ||
          !item.enterpriseIds?.length ||
          item.enterpriseIds.includes(enterprise),
      ),
    [assignments, enterprise],
  )
  const guides = useMemo(
    () =>
      courses
        .flatMap((course) =>
          (course.lessons || []).map((lesson) => ({
            ...lesson,
            courseTitle: course.title,
            enterpriseIds: course.enterpriseIds || [],
          })),
        )
        .filter(
          (lesson) =>
            enterprise === "All" ||
            !lesson.enterpriseIds.length ||
            lesson.enterpriseIds.includes(enterprise),
        ),
    [courses, enterprise],
  )

  useEffect(() => {
    let active = true
    const load = async () => {
      setLoading(true)
      setLoadError("")
      try {
        const [assignmentResult, courseResult, examResult] = await Promise.all([
          learningApi<{ data: LearningAssignment[] }>("/assignments"),
          learningApi<{ data: LearningCourse[] }>("/courses"),
          learningApi<{ data: LearningExam[] }>("/exams").catch(() => ({
            data: [],
          })),
        ])
        if (active) {
          setAssignments(assignmentResult.data || [])
          setCourses(courseResult.data || [])
          setExams(examResult.data || [])
        }
      } catch (error) {
        if (active)
          setLoadError(
            error instanceof Error
              ? error.message
              : "Could not load learning content.",
          )
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [role])

  useEffect(() => {
    const refresh = async () => {
      try {
        await syncLearningOutbox()
        setOutbox(await readLearningOutbox())
      } catch {
        /* IndexedDB may be disabled in private browsing. */
      }
    }
    void refresh()
    window.addEventListener("online", refresh)
    return () => window.removeEventListener("online", refresh)
  }, [])

  const submitAssignment = (id: string) => {
    const response = responses[id]?.trim() || ""
    if (!response) return announce("Add a note before submitting your work.")
    setSaving(true)
    const memberIds = (groupMembers[id] || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
    void learningApi<{
        data?: { _id: string; status?: string; submittedAt?: string; late?: boolean }
  receipt?: { id: string; submittedAt: string }
  queued?: boolean
  capturedAt?: string
     
    }>(`/assignments/${id}/submissions`, "POST", { text: response, memberIds })
      .then(async (result) => {
        if (result.queued) {
          setOutbox(await readLearningOutbox())
          announce("Saved on this device. Waiting to send when you are online.")
          return
        }
        setAssignments((items) =>
          items.map((item) =>
            item._id === id
              ? {
                  ...item,
                  mySubmission: {
                    status: "submitted",
                    submittedAt: result.data?.submittedAt,
                    late: result.data?.late,
                  },
                }
              : item,
          ),
        )
        setResponses((current) => ({ ...current, [id]: "" }))
        announce(
          `Submission received · ${result.receipt?.id || result.data?._id} · ${new Date(result.receipt?.submittedAt || result.data?.submittedAt || Date.now()).toLocaleString()}`,
        )
      })
      .catch((error) =>
        announce(
          error instanceof Error
            ? error.message
            : "Submission failed. Please try again.",
        ),
      )
      .finally(() => setSaving(false))
  }

  const createCourseDraft = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    try {
      await learningApi("/courses", "POST", {
        title: courseTitle,
        code: courseCode,
        enterpriseIds: [newEnterprise.trim()],
        lessons: [{ title: lessonTitle, content: lessonContent, order: 1 }],
      })
      setCourseTitle("")
      setCourseCode("")
      setLessonTitle("")
      setLessonContent("")
      announce(
        "Course draft saved. Submit it for review before farmers can see it.",
      )
    } catch (error) {
      announce(
        error instanceof Error
          ? error.message
          : "Course draft could not be saved.",
      )
    } finally {
      setSaving(false)
    }
  }

  const startExam = async (exam: LearningExam) => {
    try {
      const result = await learningApi<{
        data: {
          id: string
          questions: LearningExam["questions"]
          deadlineAt: string
        }
      }>(`/exams/${exam._id}/start`, "POST", {})
      setActiveExam(result.data)
    } catch (error) {
      announce(
        error instanceof Error ? error.message : "Exam could not be started.",
      )
    }
  }

  const saveExamAnswer = async (questionId: string, value: string) => {
    if (!activeExam) return
    const nextAnswers = { ...examAnswers, [questionId]: value }
    setExamAnswers(nextAnswers)
    try {
      await learningApi(`/attempts/${activeExam.id}/answers`, "PUT", {
        answers: nextAnswers,
      })
    } catch (error) {
      announce(
        error instanceof Error ? error.message : "Answer could not be saved.",
      )
    }
  }

  const submitExam = async () => {
    if (!activeExam) return
    try {
      await learningApi(`/attempts/${activeExam.id}/answers`, "PUT", {
        answers: examAnswers,
      })
      const result = await learningApi<{
        data: { receiptCode: string ; score?: number }
      }>(`/attempts/${activeExam.id}/submit`, "POST", {})
      setActiveExam(null)
      setExamAnswers({})
      announce(
        result.data.score === undefined
          ? `Exam submitted. Receipt ${result.data.receiptCode}.`
          : `Exam submitted. Your released score is ${result.data.score}.`,
      )
    } catch (error) {
      announce(
        error instanceof Error ? error.message : "Exam submission failed.",
      )
    }
  }

  const submitPracticeReport = async (event: FormEvent) => {
    event.preventDefault()
    try {
      const result = await learningApi<{ queued?: boolean }>(
        "/practice-reports",
        "POST",
        { courseId: practiceCourse, title: practiceTitle, text: practiceText },
      )
      if (result.queued) {
        setOutbox(await readLearningOutbox())
        announce("Practice report saved on this device and waiting to sync.")
      } else announce("Practice report received by the server.")
      setPracticeTitle("")
      setPracticeText("")
    } catch (error) {
      announce(
        error instanceof Error
          ? error.message
          : "Practice report could not be submitted.",
      )
    }
  }

  return (
    <div className="space-y-6">
      {loading && (
        <p
          role="status"
          className="rounded-xl bg-blue-50 p-3 text-sm text-blue-900"
        >
          Loading learning from your sector…
        </p>
      )}
      {loadError && (
        <div
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
        >
          {loadError}{" "}
          <button
            className="ml-2 font-bold underline"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      )}
      {outbox.some((item) => item.status !== "sent") && (
        <section
          aria-live="polite"
          className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-950"
        >
          <strong>Offline outbox</strong>
          <ul className="mt-1 space-y-1">
            {outbox
              .filter((item) => item.status !== "sent")
              .map((item) => (
                <li key={item.key}>
                  {item.status === "failed"
                    ? `Needs retry: ${item.error}`
                    : item.status === "sending"
                      ? "Sending your saved work…"
                      : "Waiting to send when online"}{" "}
                  · captured {new Date(item.capturedAt).toLocaleString()}
                </li>
              ))}
          </ul>
          <button
            className="mt-2 font-semibold underline"
            onClick={async () => {
              await syncLearningOutbox()
              setOutbox(await readLearningOutbox())
            }}
          >
            Sync now
          </button>
        </section>
      )}
      {role === "farmer" ? (
        <>
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                  Learning for your farm
                </p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  Crops, livestock and practical learning
                </h2>
                <p className="mt-1 text-sm text-slate-700">
                  Tasks and guides are matched to the enterprise selected for
                  your farm.
                </p>
              </div>
              <Sprout className="text-emerald-700" />
            </div>
            <label className="mt-4 block text-sm font-semibold text-slate-800">
              Show learning for
              <select
                value={enterprise}
                onChange={(e) => setEnterprise(e.target.value)}
                className="mt-1 block w-full rounded-xl border border-slate-300 bg-white p-3 sm:max-w-xs"
              >
                <option value="All">All enterprises</option>
                {enterprises.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          </section>
          <section className="grid gap-5 xl:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <BookOpen className="text-emerald-700" />
                <div>
                  <h2 className="text-lg font-bold">Farm guides</h2>
                  <p className="text-sm text-slate-500">
                    Short practical notes for your crop or animal.
                  </p>
                </div>
              </div>
              <label className="mt-4 block text-xs font-semibold text-slate-600">
                Filter guides
                <select
                  value={guide}
                  onChange={(e) => setGuide(e.target.value)}
                  className="ml-2 rounded-lg border border-slate-200 p-2"
                >
                  <option value="All">All enterprises</option>
                  {enterprises.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <div className="mt-3 space-y-3">
                {guides
                  .filter(
                    (n) => guide === "All" || n.enterpriseIds.includes(guide),
                  )
                  .map((note) => (
                    <div key={note._id} className="rounded-xl bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-slate-900">
                          {note.title}
                        </h3>
                        <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-800">
                          {note.courseTitle}
                        </span>
                      </div>
                      {openGuide === note._id && (
                        <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                          {note.content}
                          {note.sources?.length ? (
                            <span className="mt-2 block text-xs text-slate-500">
                              Sources: {note.sources.join(", ")}
                            </span>
                          ) : null}
                        </div>
                      )}
                      <button
                        aria-expanded={openGuide === note._id}
                        className="mt-2 text-sm font-semibold text-emerald-800"
                        onClick={() =>
                          setOpenGuide(openGuide === note._id ? "" : note._id)
                        }
                      >
                        {openGuide === note._id
                          ? "Close guide ↑"
                          : "Read guide →"}
                      </button>
                    </div>
                  ))}
              </div>
              {!loading && !loadError && guides.length === 0 && (
                <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
                  No published guide matches this farm enterprise yet. Ask your
                  sector officer for guidance.
                </p>
              )}
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="text-emerald-700" />
                <div>
                  <h2 className="text-lg font-bold">My farm assignments</h2>
                  <p className="text-sm text-slate-500">
                    Submit a short field note when you finish.
                  </p>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {scopedAssignments.map((item) => {
                  const mySubmission = item.mySubmission
                  return (
                    <div
                      key={item._id}
                      className="rounded-xl border border-slate-200 p-4"
                    >
                      <div className="flex flex-wrap justify-between gap-2">
                        <h3 className="font-semibold">{item.title}</h3>
                        <span
                          className={
                            mySubmission
                              ? "rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-800"
                              : "rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-900"
                          }
                        >
                          {mySubmission?.status || item.status}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {item.enterpriseIds?.join(", ") ||
                          "All matching enterprises"}
                        {item.dueAt
                          ? ` · Due ${new Date(item.dueAt).toLocaleDateString()}`
                          : ""}
                        {mySubmission?.late ? " · Late" : ""}
                      </p>
                      <p className="mt-2 text-sm text-slate-700">
                        {item.instructions}
                      </p>
                      {mySubmission?.status === "graded" && (
                        <p className="mt-2 rounded-lg bg-emerald-50 p-3 text-sm">
                          Mark: {mySubmission.score} · {mySubmission.feedback}
                        </p>
                      )}
                      {!mySubmission && item.status === "published" && (
                        <div className="mt-3 space-y-2">
                          <input
                            aria-label={`Response for ${item.title}`}
                            value={responses[item._id] || ""}
                            onChange={(e) =>
                              setResponses((current) => ({
                                ...current,
                                [item._id]: e.target.value,
                              }))
                            }
                            placeholder="What did you observe or do?"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                          />
                          {item.allowGroup && (
                            <input
                              aria-label="Group member farmer IDs, separated by commas"
                              value={groupMembers[item._id] || ""}
                              onChange={(e) =>
                                setGroupMembers((current) => ({
                                  ...current,
                                  [item._id]: e.target.value,
                                }))
                              }
                              placeholder="Optional group member IDs, separated by commas"
                              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            />
                          )}
                          <button
                            disabled={saving}
                            aria-label={`Submit ${item.title}`}
                            className="rounded-lg bg-emerald-700 px-4 py-2 text-white disabled:opacity-50"
                            onClick={() => submitAssignment(item._id)}
                          >
                            <Send size={16} /> Submit
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </article>
          </section>

          <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                  Production Units
                </p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  Register and track your farm plots & livestock
                </h2>
                <p className="mt-1 text-sm text-slate-700">
                  Manage crop plots and livestock units with detailed tracking.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Sprout className="text-emerald-700" />
                <Wheat className="text-emerald-700" />
                <PawPrint className="text-emerald-700" />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => { setEditingPlot(null); setShowPlotWizard(true); }}
                className="px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-colors"
                style={{ backgroundColor: "#10B981", color: "#FFFFFF", boxShadow: "0 0 12px rgba(16, 185, 129, 0.4)" }}
              >
                <Plus className="w-5 h-5" />
                Register Production Unit
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">My Production Units</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {plots.length} unit{plots.length !== 1 ? "s" : ""} registered
                </p>
              </div>
            </div>
            <div className="mt-4">
              <PlotListView
                plots={plots}
                loading={plotsLoading}
                onRegister={() => { setEditingPlot(null); setShowPlotWizard(true); }}
                onEdit={setEditingPlot}
                onView={(plot) => { setEditingPlot(plot); setShowPlotWizard(true); }}
                onDelete={handlePlotDelete}
              />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold">Available quizzes and exams</h2>
            <p className="mt-1 text-sm text-slate-500">
              Only released exams in their open window appear here.
            </p>
            {activeExam ? (
              <div className="mt-4 rounded-xl bg-emerald-50 p-4">
                <p className="text-xs font-semibold">
                  Attempt active · server deadline{" "}
                  {new Date(activeExam.deadlineAt).toLocaleTimeString()}
                </p>
                {activeExam.questions.map((q, index) => (
                  <div
                    key={q._id}
                    className="mt-4 rounded-xl border border-emerald-100 bg-white p-4"
                  >
                    <p className="font-semibold">
                      {index + 1}. {q.prompt}
                    </p>
                    {q.options?.length ? (
                      q.options.map((option) => (
                        <label
                          key={option}
                          className="mt-2 flex gap-2 rounded-lg border p-3 text-sm"
                        >
                          <input
                            type="radio"
                            name={`exam-${q._id}`}
                            checked={examAnswers[q._id] === option}
                            onChange={() => void saveExamAnswer(q._id, option)}
                          />
                          {option}
                        </label>
                      ))
                    ) : (
                      <textarea
                        value={examAnswers[q._id] || ""}
                        onChange={(e) =>
                          void saveExamAnswer(q._id, e.target.value)
                        }
                        className="mt-2 w-full rounded-lg border p-3"
                      />
                    )}
                  </div>
                ))}
                <button
                  onClick={() => void submitExam()}
                  className="mt-4 rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white"
                >
                  Submit attempt
                </button>
              </div>
            ) : (
              exams.map((exam) => (
                <article
                  key={exam._id}
                  className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4"
                >
                  <div>
                    <h3 className="font-semibold">{exam.title}</h3>
                    <p className="text-xs text-slate-500">
                      {exam.type.replace("_", " ")} · {exam.timeLimitMinutes}{" "}
                      minutes · {exam.questions.length} questions
                    </p>
                  </div>
                  <button
                    onClick={() => void startExam(exam)}
                    className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Start
                  </button>
                </article>
              ))
            )}
            {!activeExam && !exams.length && (
              <p className="mt-4 text-sm text-slate-500">
                No open quizzes or exams for your farm at this time.
              </p>
            )}
          </section>
          <form
            onSubmit={submitPracticeReport}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <h2 className="text-lg font-bold">My farm practice report</h2>
            <p className="mt-1 text-sm text-slate-500">
              Share a practice you tried with your sector officer.
            </p>
            <label className="mt-3 block text-sm">
              Course
              <select
                required
                value={practiceCourse}
                onChange={(e) => setPracticeCourse(e.target.value)}
                className="mt-1 w-full rounded-lg border p-2.5"
              >
                <option value="">Choose a course</option>
                {courses.map((course) => (
                  <option key={course._id} value={course._id}>
                    {course.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-3 block text-sm">
              Report title
              <input
                required
                value={practiceTitle}
                onChange={(e) => setPracticeTitle(e.target.value)}
                className="mt-1 w-full rounded-lg border p-2.5"
              />
            </label>
            <label className="mt-3 block text-sm">
              What did you try?
              <textarea
                required
                value={practiceText}
                onChange={(e) => setPracticeText(e.target.value)}
                className="mt-1 w-full rounded-lg border p-2.5"
                rows={3}
              />
            </label>
            <button className="mt-3 rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white">
              Send practice report
            </button>
          </form>
        </>
      ) : (
        <>
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              Sector learning desk
            </p>
            <h2 className="mt-1 text-xl font-bold">
              Assign field tasks and publish farm guidance
            </h2>
            <p className="mt-1 text-sm text-slate-700">
              Target farmers by enterprise, then review the assignments and
              submissions for your sector.
            </p>
          </section>
          <section className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
            <form
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              onSubmit={async (e) => {
                e.preventDefault()
                if (
                  !newTitle.trim() ||
                  !newInstructions.trim() ||
                  !newEnterprise.trim() ||
                  !newDue
                )
                  return
                setSaving(true)
                try {
                  const result = await learningApi<{
                    data: LearningAssignment
                  }>("/assignments", "POST", {
                    title: newTitle.trim(),
                    instructions: newInstructions.trim(),
                    enterpriseIds: [newEnterprise.trim()],
                    dueAt: new Date(`${newDue}T23:59:59+02:00`).toISOString(),
                    status: "published",
                    allowedTypes: ["text"],
                    allowGroup,
                  })
                  setAssignments((items) => [result.data, ...items])
                  setNewTitle("")
                  setNewInstructions("")
                  announce(
                    "Assignment published to farmers in the selected enterprise.",
                  )
                } catch (error) {
                  announce(
                    error instanceof Error
                      ? error.message
                      : "Assignment could not be published.",
                  )
                } finally {
                  setSaving(false)
                }
              }}
            >
              <h2 className="text-lg font-bold">Create assignment</h2>
              <p className="text-sm text-slate-500">
                Set the crop or livestock target and due date.
              </p>
              <label className="mt-4 block text-sm font-medium">
                Task title
                <input
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2.5"
                  placeholder="Describe the field task"
                />
              </label>
              <label className="mt-3 block text-sm font-medium">
                Instructions
                <textarea
                  required
                  rows={4}
                  value={newInstructions}
                  onChange={(e) => setNewInstructions(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2.5"
                  placeholder="Explain the task and what farmers should submit"
                />
              </label>
              <label className="mt-3 block text-sm font-medium">
                Target enterprise
                <input
                  required
                  value={newEnterprise}
                  onChange={(e) => setNewEnterprise(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2.5"
                  placeholder="Enter crop or livestock type"
                />
              </label>
              <label className="mt-3 block text-sm font-medium">
                Due date
                <input
                  required
                  type="date"
                  min={new Date().toISOString().slice(0, 10)}
                  value={newDue}
                  onChange={(e) => setNewDue(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2.5"
                />
              </label>
              <label className="mt-3 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={allowGroup}
                  onChange={(e) => setAllowGroup(e.target.checked)}
                />{" "}
                Allow group submission
              </label>
              <button
                disabled={saving}
                className="mt-4 w-full rounded-xl bg-emerald-700 px-4 py-3 font-semibold text-white disabled:opacity-50"
              >
                {saving ? "Publishing…" : "Publish assignment"}
              </button>
            </form>
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">
                    Assignment delivery and submissions
                  </h2>
                  <p className="text-sm text-slate-500">
                    Live assignments in your sector.
                  </p>
                </div>
                <label className="text-xs font-semibold">
                  Status{" "}
                  <select
                    value={trackerFilter}
                    onChange={(e) => setTrackerFilter(e.target.value)}
                    className="ml-1 rounded-lg border border-slate-200 p-2"
                  >
                    <option>All</option>
                    <option>published</option>
                    <option>closed</option>
                  </select>
                </label>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead>
                    <tr className="border-b text-xs uppercase text-slate-500">
                      <th className="py-2">Assignment</th>
                      <th>Enterprise</th>
                      <th>Status</th>
                      <th>Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignments
                      .filter(
                        (item) =>
                          trackerFilter === "All" ||
                          item.status === trackerFilter,
                      )
                      .map((item) => (
                        <tr
                          key={item._id}
                          className="border-b border-slate-100"
                        >
                          <td className="py-3 font-medium">{item.title}</td>
                          <td>{item.enterpriseIds?.join(", ") || "All"}</td>
                          <td>
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">
                              {item.status}
                            </span>
                          </td>
                          <td>
                            {item.dueAt
                              ? new Date(item.dueAt).toLocaleDateString()
                              : "—"}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              {!assignments.length && (
                <p className="mt-4 text-sm text-slate-500">
                  No assignments have been published in this sector.
                </p>
              )}
            </article>
          </section>

          <SectorLearningTools announce={announce} />
        </>
      )}
      
      {showPlotWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => { setShowPlotWizard(false); setEditingPlot(null); }}>
          <div className="bg-white rounded-2xl border max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()} style={{ borderColor: "#BBF7D0" }}>
            <PlotRegistrationWizard
              onSubmit={editingPlot ? handlePlotUpdate : handlePlotSubmit}
              onCancel={() => { setShowPlotWizard(false); setEditingPlot(null); }}
              initialData={editingPlot || undefined}
              isEditing={!!editingPlot}
            />
          </div>
        </div>
      )}

      <p className="rounded-xl bg-slate-100 p-3 text-xs text-slate-600">
        Learning content, assignments, quizzes and exams shown here are loaded
        from the server. Offline submissions sync when a connection is
        available.
      </p>
    </div>
  )
}
