import React, { useEffect, useState } from "react"
import { authenticatedAuthApi } from "../lib/authApi"

interface AccountRequestItem {
  _id: string
  fullName: string
  phone: string
  email: string
  position: string
  organization: string
  portal: string
  regionScope: string
  status: "pending_approval" | "approved" | "rejected" | "activated"
  createdAt: string
  canApprove: boolean
  canIssueCode: boolean
}

interface AccountApprovalsQueueProps {
  portal: string
}

const roleLabels: Record<string, string> = {
  nsg: "NSG security admin",
  rab: "RAB admin",
  province: "Province veterinary",
  district: "District veterinary",
  sector: "Sector team",
  farmer: "Farmer",
  customer: "Customer",
}

export const AccountApprovalsQueue: React.FC<AccountApprovalsQueueProps> = ({
  portal,
}) => {
  const [requests, setRequests] = useState<AccountRequestItem[]>([])
  const [issuedCodes, setIssuedCodes] = useState<Record<string, string>>({})
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState("")
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const loadRequests = async () => {
    setLoading(true)
    setError("")
    try {
      const result = await authenticatedAuthApi<{
        requests: AccountRequestItem[]
      }>("/requests", "GET")
      setRequests(result.requests)
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load account requests.",
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadRequests()
  }, [])

  const handleDecision = async (requestId: string, approved: boolean) => {
    setBusyId(requestId)
    setError("")
    try {
      const result = await authenticatedAuthApi<{
        message: string
        accessCode?: string
      }>("/approve-request", "POST", {
        requestId,
        approved,
        reason: rejectionReason,
      })
      setNotice(
        result.accessCode
          ? `${result.message} Code: ${result.accessCode}`
          : result.message,
      )
      setRejectingId(null)
      setRejectionReason("")
      await loadRequests()
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to process this request.",
      )
    } finally {
      setBusyId(null)
    }
  }

  const handleIssueCode = async (requestId: string) => {
    setBusyId(requestId)
    setError("")
    try {
      const result = await authenticatedAuthApi<{
        accessCode: string
        message: string
      }>(`/requests/${requestId}/access-code`, "POST")
      setIssuedCodes((previous) => ({
        ...previous,
        [requestId]: result.accessCode,
      }))
      setNotice(result.message)
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to issue the access code.",
      )
    } finally {
      setBusyId(null)
    }
  }

  const pendingCount = requests.filter(
    (request) => request.status === "pending_approval",
  ).length

  return (
    <section
      id="account-requests"
      className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Account requests</h2>
          <p className="mt-1 text-sm text-slate-600">
            {portal === "nsg"
              ? "Read-only national request and account activity."
              : "Requests assigned to your authority and region."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-800">
            Pending {pendingCount}
          </span>
          <button
            type="button"
            onClick={() => void loadRequests()}
            className="secondary-button"
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </header>

      {error && (
        <p
          className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800"
          role="alert"
        >
          {error}
        </p>
      )}
      {notice && (
        <p
          className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800"
          role="status"
        >
          {notice}
        </p>
      )}

      {loading ? (
        <p className="py-8 text-center text-sm text-slate-500">
          Loading assigned requests...
        </p>
      ) : requests.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">
          No account requests are assigned to this portal.
        </p>
      ) : (
        <div className="mt-5 divide-y divide-slate-100">
          {requests.map((request) => (
            <article
              key={request._id}
              className="grid gap-4 py-4 md:grid-cols-[1fr_auto] md:items-center"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-slate-900">
                    {request.fullName}
                  </h3>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                    {roleLabels[request.portal] || request.portal}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                    {request.status.replace(/_/g, " ")}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  {request.email} · {request.phone}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {[request.position, request.organization, request.regionScope]
                    .filter(Boolean)
                    .join(" · ") || "No role details supplied"}
                  {" · "}
                  {new Date(request.createdAt).toLocaleDateString()}
                </p>
                {issuedCodes[request._id] && (
                  <p className="mt-2 inline-flex rounded-md bg-emerald-50 px-3 py-2 font-mono text-sm font-bold text-emerald-900">
                    One-time code: {issuedCodes[request._id]}
                  </p>
                )}
                {rejectingId === request._id && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <input
                      aria-label="Rejection reason"
                      className="min-w-56 rounded-md border border-slate-300 px-3 py-2 text-sm"
                      placeholder="Reason for rejection"
                      value={rejectionReason}
                      onChange={(event) =>
                        setRejectionReason(event.target.value)
                      }
                    />
                    <button
                      type="button"
                      disabled={
                        !rejectionReason.trim() || busyId === request._id
                      }
                      onClick={() => void handleDecision(request._id, false)}
                      className="rounded-md bg-red-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      Confirm rejection
                    </button>
                    <button
                      type="button"
                      onClick={() => setRejectingId(null)}
                      className="px-3 py-2 text-sm text-slate-600"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {request.canApprove && (
                  <>
                    <button
                      type="button"
                      disabled={busyId === request._id}
                      onClick={() => void handleDecision(request._id, true)}
                      className="rounded-md bg-emerald-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={busyId === request._id}
                      onClick={() => setRejectingId(request._id)}
                      className="rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-800 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </>
                )}
                {request.canIssueCode && (
                  <button
                    type="button"
                    disabled={busyId === request._id}
                    onClick={() => void handleIssueCode(request._id)}
                    className="rounded-md border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-800 disabled:opacity-50"
                  >
                    {busyId === request._id
                      ? "Working..."
                      : issuedCodes[request._id]
                        ? "Rotate code"
                        : "Issue access code"}
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
