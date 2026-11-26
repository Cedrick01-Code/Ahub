# AHub implementation branch notes

This branch adds a first implementation layer for the AHub platform while preserving the existing routes and data models.

## Included

- Shared bearer-token authentication middleware in `backend/src/middleware/auth.js`.
- Explicit MongoDB configuration; the backend no longer silently falls back to a local database.
- No hard-coded JWT signing/verification fallback.
- Geographic authorization helpers for RAB, province, district and sector scope.
- Production-unit PATCH field allow-list to prevent changing farmer ownership and location through over-posting.
- Announcement visibility and management checks constrained to the author's region and officer hierarchy.
- Marketplace customer demand requests, farmer interest, and customer request status.
- Independent conversations and messages, separate from the existing order-message workflow.
- Veterinary cases and farmer-requested visits, including officer assignment, regional visibility and notifications.
- RAB-managed official commodity prices.
- Audit events for key actions in the new workflows.
- Regional access unit tests and GitHub Actions CI for backend tests and frontend build.

## New API base

All endpoints below are mounted under `/api/workflows`.

- `POST/GET /market/demand`
- `POST /market/demand/:id/interest`
- `PATCH /market/demand/:id/status`
- `GET/POST /conversations`
- `GET/POST /conversations/:id/messages`
- `POST/GET /veterinary/cases`
- `GET/PATCH /veterinary/cases/:id`
- `POST /veterinary/cases/:id/visits`
- `GET/PATCH /veterinary/visits`
- `GET/POST /prices`
- `PATCH /prices/:id`
- `GET /audit/events`

Existing `/api/operations`, `/api/production-units`, `/api/sector`, `/api/auth` and `/api/learning` routes remain mounted.

## Required deployment configuration

Set `MONGODB_URI` and a strong, unique `JWT_SECRET` in the backend deployment environment. Do not commit `.env` files or production credentials. Use `backend/.env.example` only as a template.

**Security action required:** an earlier version of `backend/.env.example` contained a MongoDB credential. Removing it from the current branch does not erase it from Git history or revoke it. Rotate the MongoDB database user's password in MongoDB Atlas immediately, update the Render/deployment `MONGODB_URI`, and arrange a history cleanup if the repository's exposure policy requires it. Do not reuse the old password.

## Review limitations

This branch has not been run in a local Node environment from this session. The included GitHub Actions workflow is intended to run the backend test suite and frontend production build after the pull request is opened. Review CI results and test against a staging database before deploying.
