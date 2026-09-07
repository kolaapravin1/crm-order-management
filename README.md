# CRM Order Management System

A lightweight MERN CRM for order intake, production tracking, and customer-facing status/approval — built for a small business running a fixed workflow:

```
Order → Photo Verification → Design → Customer Approval → Production → QC → Packing → Delivery → Completed
```

## Stack

- **MongoDB** + Mongoose
- **Express.js** REST API
- **React** (Vite) + Tailwind CSS + Framer Motion
- **JWT** authentication, bcrypt password hashing
- Local disk file storage (Multer) for photos and design proofs

## Project Structure

```
/client   React frontend (Vite)
/server   Express backend + MongoDB models
```

## Prerequisites

- Node.js 18+
- A running MongoDB instance (local `mongod` or a MongoDB Atlas connection string)

## 1. Backend Setup

```bash
cd server
npm install
cp .env.example .env
```

Edit `.env` and set `MONGO_URI` and a strong `JWT_SECRET`. Defaults assume a local MongoDB at `mongodb://127.0.0.1:27017/crm_order_management`.

Seed the database with a superadmin, two admins, sample products/combos/customers, and six sample orders spanning every workflow stage:

```bash
npm run seed
```

This prints the seeded login credentials and sample customer tracking links to the console.

Start the API server:

```bash
npm run dev      # nodemon, auto-restarts on change
# or
npm start
```

The API runs on `http://localhost:5000` by default. Uploaded files are served statically from `http://localhost:5000/uploads/...`.

## 2. Frontend Setup

```bash
cd client
npm install
npm run dev
```

The app runs on `http://localhost:5173`. It proxies `/api` and `/uploads` requests to the backend (see `vite.config.js`), so no separate `.env` is needed for local development.

## 3. Login

After seeding, sign in at `http://localhost:5173/login` with:

| Role       | Email                    | Password       |
|------------|---------------------------|----------------|
| Superadmin | superadmin@example.com    | Password123!   |
| Admin      | admin1@example.com        | Password123!   |
| Admin      | admin2@example.com        | Password123!   |

Customer-facing order tracking pages are unauthenticated and reachable at `/order/<secure-token>` — the seed script prints working links for each sample order.

## Key Design Decisions

- **Frozen pricing**: when an order is created, the current product/combo price and discount are copied onto the order line item. Changing a product's price later never alters historical orders.
- **Controlled workflow**: the order's `workflowStage` can only move along the edges defined in `server/utils/constants.js` (`STAGE_TRANSITIONS`). Every stage-changing endpoint validates the transition server-side before saving — the UI cannot force an illegal jump.
- **Audit trail over disputes**: rather than a dispute-management module, every meaningful action (pricing/discount changes, status transitions, uploads, approvals, tracking updates, admin account changes) is written to the `AuditLog` collection with the acting user, previous/new values, and a timestamp.
- **Deactivate, never delete**: products and combos are soft-deleted via `isActive: false` so historical orders that reference them remain intact.
- **Secure customer access**: each order gets a random 40-character token (`customerToken`) used to build its public tracking URL. The public routes are token-scoped only — no session, no internal fields (notes, audit history, admin identities) are ever returned to that endpoint.

## REST API Overview

```
POST   /api/auth/login
GET    /api/auth/me

GET    /api/users                              (superadmin)
POST   /api/users                               "
PUT    /api/users/:id                            "
PATCH  /api/users/:id/status                      "

GET    /api/customers
POST   /api/customers
GET    /api/customers/:id
PUT    /api/customers/:id

GET    /api/products
POST   /api/products                            (superadmin)
PUT    /api/products/:id                         (superadmin)
DELETE /api/products/:id                         (superadmin, deactivates)

GET    /api/combos
POST   /api/combos                              (superadmin)
PUT    /api/combos/:id                           (superadmin)
DELETE /api/combos/:id                           (superadmin, deactivates)

GET    /api/orders
POST   /api/orders
GET    /api/orders/:id
PUT    /api/orders/:id
PATCH  /api/orders/:id/payment
PATCH  /api/orders/:id/photo-verification/upload
PATCH  /api/orders/:id/photo-verification/status
PATCH  /api/orders/:id/design/upload
PATCH  /api/orders/:id/production
PATCH  /api/orders/:id/qc
PATCH  /api/orders/:id/packing
PATCH  /api/orders/:id/tracking                 (superadmin)

GET    /api/public/orders/:token                (no auth — token-scoped)
POST   /api/public/orders/:token/approval        "

GET    /api/audit-logs                          (superadmin)

GET    /api/dashboard/superadmin                (superadmin)
GET    /api/dashboard/admin
```

## Notes

- File uploads are capped at 10MB per file (images + PDF only) and stored under `server/uploads/{photos,design}` with randomized filenames.
- This is intentionally a lean build — no microservices, no multi-tenant layer, no ERP-style manufacturing modules. Production/QC/Packing are simple status fields, as specified.
