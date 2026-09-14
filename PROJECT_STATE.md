# FoodRescue AI — Project State & Ground Truth Reconnaissance

**Audit Date:** 2026-09-14  
**Audit Scope:** Full codebase reconnaissance (Frontend, Backend, Database, Git, Configuration, Security)  
**Mode:** READ-ONLY / Reconnaissance & Ground Truth (Stage 0)  

---

## 1. Current Architecture

- **Architecture Style:** Decoupled Client-Server Monorepo (Frontend SPA + Backend REST API). [CONFIRMED]
- **Frontend:** Single-page application built with **React 19.2.7**, **Vite 8.1.1**, and **React Router DOM 7.18.1**. Styled with custom Vanilla CSS and inline styles. [CONFIRMED]
- **Backend:** Monolithic REST API built with **Node.js** and **Express 5.2.1** (CommonJS modules). Uses `mysql2` (3.22.6) for direct SQL database queries. [CONFIRMED]
- **Database:** **MySQL** database (standalone server expected at `localhost:3306`), referenced as `foodrescue_ai`. [CONFIRMED]
  - No ORM (Prisma, Sequelize, TypeORM) is used. [CONFIRMED]
  - No database migration tool or schema DDL script exists in the repository. [CONFIRMED]
- **Hardware / IoT Layer:** Folder `hardware/` exists at the root, but is completely empty (0 files). Planned support for Arduino UNO R4 WiFi, ESP32-CAM, and temperature sensors is documented in `docs/PROJECT_PLAN.md` but completely unimplemented. [CONFIRMED]
- **AI / Matching Layer:** Platform name is `FoodRescueAI` and landing page advertises "AI Matching", but there is **zero AI/ML code, models, or algorithms** implemented anywhere in the repository. [CONFIRMED]
- **Python Environment:** A `.venv/` directory exists at root containing standard Python site-packages (ZeroMQ, etc.), but contains no project application code or scripts. [CONFIRMED]

---

## 2. Frontend Structure

### Routing & Navigation (`frontend/src/App.jsx`) [CONFIRMED]
- **Public Routes:**
  - `/` -> `Home` (`pages/Home.jsx`)
  - `/login` -> `Login` (`pages/Login.jsx`)
  - `/register` -> `Register` (`pages/Register.jsx`)
- **Restaurant Routes:**
  - `/restaurant` -> `RestaurantDashboard` (`pages/RestaurantDashboard.jsx`)
  - `/add-food` -> `AddFood` (`pages/AddFood.jsx`)
  - `/my-donations` -> `MyDonations` (`pages/MyDonations.jsx`)
  - `/edit/:id` -> `EditDonation` (`pages/EditDonation.jsx`)
- **NGO Routes:**
  - `/ngo` -> `NGODashboard` (`pages/NGODashboard.jsx`)
  - `/ngo/my-donations` -> `MyAcceptedDonations` (`pages/MyAcceptedDonations.jsx`)
- **Admin Routes:**
  - `/admin` -> `AdminDashboard` (`pages/AdminDashboard.jsx`)
- **Volunteer Routes:**
  - `/volunteer` -> `VolunteerDashboard` (`pages/VolunteerDashboard.jsx`)

### Components (`frontend/src/components/`) [CONFIRMED]
- `Navbar.jsx`: Brand logo, anchor navigation links, Login and Register CTA buttons.
- `Hero.jsx`: Marketing banner with stats badges and navigation CTAs.
- `Stats.jsx`: Static marketing counters (12,450+ meals rescued, 320+ restaurants, etc.).
- `Features.jsx`: Static cards highlighting AI Matching, Live Tracking, Instant Alerts, Secure Platform.
- `HowItWorks.jsx`: 4-step infographic. *(Note: Contains trailing syntax bug; see Section 15).*
- `Footer.jsx`: 0-byte empty file. Never imported or rendered.

### UI & Styling Consistency [CONFIRMED]
- High visual design polish on Landing Page (`Navbar.css`, `Hero.css`, `Stats.css`, `Features.css`, `HowItWorks.css`) and Restaurant Dashboard (`RestaurantDashboard.css`).
- Zero styling / raw HTML tables (`<table border="1">`) and ad-hoc inline styles on `NGODashboard.jsx`, `MyAcceptedDonations.jsx`, `AdminDashboard.jsx`, `VolunteerDashboard.jsx`, and `EditDonation.jsx`.

---

## 3. Backend Structure

### Entry Point (`backend/server.js`) [CONFIRMED]
- Express 5 application initializing CORS (`app.use(cors())`) and JSON parser (`app.use(express.json())`).
- Routes mounted:
  - `/api/auth` -> `routes/authRoutes.js`
  - `/api/food` -> `routes/foodRoutes.js`
  - `/api/ngo` -> `routes/ngoRoutes.js`
  - `/api/admin` -> `routes/adminRoutes.js`
  - `/api/volunteer` -> `routes/volunteerRoutes` *(Note: Extensionless file name; see Section 15).*
- Health-check root route: `GET /` returning `"🚀 FoodRescue AI Backend Running Successfully!"`.
- Server listens on `process.env.PORT || 5000`.

### Middleware (`backend/middleware/`) [CONFIRMED]
- `authMiddleware.js`: Verifies `req.headers.authorization`, decodes JWT with `process.env.JWT_SECRET`, sets `req.user`.
- `verifyToken.js`: Duplicate implementation of `authMiddleware.js` with slightly different header checks (`startsWith("Bearer ")`).
- No role-checking middleware (e.g. `authorize(['admin'])`) exists in either file.

### Controllers (`backend/controllers/`) [CONFIRMED]
- `authController.js`: Registration (`bcrypt.hash`) and login (`bcrypt.compare`, `jwt.sign`).
- `foodController.js`: Add food, list donor donations, fetch stats, delete donation, get donation by ID, update donation.
- `ngoController.js`: List available food, accept donation, list NGO's accepted donations, mark delivered.
- `adminController.js`: Dashboard statistics, list all users, list all donations, delete donation.
- `volunteerController.js`: List available deliveries, accept delivery, list my deliveries, mark delivery completed.

### Missing / Dead Backend Folders [CONFIRMED]
- `backend/models/`: Completely empty (0 files).
- `backend/utils/`: Completely empty (0 files).
- `backend/uploads/`: Empty folder (Multer is installed in dependencies but never used in any route).

---

## 4. Authentication & Authorization Flow

### Authentication [CONFIRMED]
1. **Registration (`POST /api/auth/register`):**
   - Client sends `{ full_name, email, password, phone, role, organization_name, address }`.
   - Checks if email exists in `users` table.
   - Hashes password using `bcrypt` (10 rounds).
   - Inserts new row into `users` table.
2. **Login (`POST /api/auth/login`):**
   - Validates email and compares password using `bcrypt.compare`.
   - Signs JWT containing `{ id: user.id, role: user.role }` with expiration `1d`.
   - Returns `{ success: true, token, user: { id, full_name, email, role } }`.
3. **Client Storage & Propagation:**
   - Client persists `token` and `user` object in browser `localStorage`.
   - Client passes token in HTTP headers as `Authorization: Bearer <token>`.

### Authorization Flaws [CONFIRMED]
- **Missing Role-Based Access Control (RBAC) in Middleware:**
  - `adminRoutes.js` only applies `verifyToken`. It does NOT verify `req.user.role === 'admin'`. Any authenticated user of any role can access admin metrics, list all users, and delete any food donation.
  - `foodRoutes.js` `POST /` (`addFood`) only checks `verifyToken`. Any authenticated user can create food donations, not just restaurants.
  - `ngoRoutes.js` `GET /available-food` has **zero** authentication or authorization middleware (completely public).
- **Zero Frontend Route Guards:**
  - `frontend/src/App.jsx` defines open routes. There is no `<ProtectedRoute>` or navigation guard. An unauthenticated user can browse to `/admin`, `/restaurant`, `/ngo`, `/volunteer`.

---

## 5. User Roles and Permissions

| Role | Intended Purpose [INFERRED] | Enforced in Backend [CONFIRMED] | Enforced in Frontend [CONFIRMED] |
|---|---|---|---|
| **restaurant** | Donates surplus food, views donation stats, edits/deletes own donations | Ownership checked by `donor_id = req.user.id` on update/delete; no role check on food creation | Client redirect on login only |
| **ngo** | Browses available food, accepts donations, marks received | Role verified in `ngoController.js` (`req.user.role === 'ngo'`) for accept & deliver | Client redirect on login only |
| **volunteer** | Claims deliveries, picks up from restaurant, delivers to NGO | Role verified in `volunteerController.js` (`req.user.role === 'volunteer'`) | Client redirect on login only |
| **admin** | Monitors system stats, audits all users and donations, moderates | **NO ROLE CHECK ENFORCED**. Any logged-in user can execute admin endpoints | Client redirect on login only |

- **Role Self-Escalation:** The public registration form (`Register.jsx`) exposes a `<select name="role">` dropdown containing `<option value="admin">Admin</option>`. Any user can register as an Admin without verification or authorization. [CONFIRMED]

---

## 6. Donation Lifecycle as ACTUALLY Implemented

State transitions currently implemented in SQL queries:

```
[ POST /api/food ]
       │
       ▼
   "Available"
       │
       ├──────────────────────────────────────────────────────┐
       │ (PUT /api/ngo/accept/:id)                            │
       ▼                                                      ▼
   "Reserved"                                           "Available"
 (accepted_by = ngoId)                                (Unaccepted)
       │
       ├────────────────────────────────────┐
       │ Path A: NGO Direct                 │ Path B: Volunteer Flow
       │ (PUT /api/ngo/deliver/:id)         │ (PUT /api/volunteer/accept/:id)
       ▼                                    ▼
   "Completed"                          "Assigned"
                                    (volunteer_id = volId)
                                            │
                                            │ (PUT /api/volunteer/complete/:id)
                                            ▼
                                        "Completed"
```

### Lifecycle Discrepancies & Conflicts [CONFIRMED]
1. **Status String Mismatch:**
   - `foodController.js` calculates restaurant dashboard stats using:
     `SUM(status='Delivered') AS completedDonations`.
   - But both `ngoController.js` and `volunteerController.js` transition final state to `'Completed'`, NEVER `'Delivered'`.
   - **Result:** Restaurant dashboard `Completed Donations` metric will always return `0`.
2. **Dual Conflicting Delivery Transitions:**
   - An NGO can bypass volunteer delivery completely by calling `/api/ngo/deliver/:id`, instantly changing status from `Reserved` to `Completed`.
   - Alternatively, a volunteer claims the delivery (`Assigned`), then marks it `Completed`. There is no coordination between these paths.
3. **Database Column Mismatch Between Controllers:**
   - `foodController.js` inserts and references `food_items.donor_id`.
   - `volunteerController.js` and `adminController.js` join on `food_items.restaurant_id`.
   - If the database schema has `donor_id`, volunteer and admin queries crash with SQL error (`Unknown column 'food_items.restaurant_id'`). If it has `restaurant_id`, donor queries crash (`Unknown column 'donor_id'`).

---

## 7. Important API Endpoints

### Authentication (`/api/auth`)
| Method | Path | Auth Middleware | Role Check | Description |
|---|---|---|---|---|
| `POST` | `/api/auth/register` | None | None | Registers user (`bcrypt` hashed password) |
| `POST` | `/api/auth/login` | None | None | Validates credentials, issues JWT (1d expiry) |

### Food & Donations (`/api/food`)
| Method | Path | Auth Middleware | Role Check | Description |
|---|---|---|---|---|
| `POST` | `/api/food` | `verifyToken` | None | Inserts food item with status `Available` |
| `PUT` | `/api/food/:id` | `verifyToken` | None (Owner `donor_id`) | Updates food item owned by logged-in donor |
| `GET` | `/api/food/my-donations` | `verifyToken` | None (Owner `donor_id`) | Returns all food items matching `donor_id` |
| `GET` | `/api/food/dashboard-stats` | `verifyToken` | None (Owner `donor_id`) | Returns total, available, completed donation counts |
| `GET` | `/api/food/:id` | `verifyToken` | None (Owner `donor_id`) | Fetches single food item owned by donor |
| `DELETE` | `/api/food/:id` | `verifyToken` | None (Owner `donor_id`) | Deletes single food item owned by donor |

### NGO (`/api/ngo`)
| Method | Path | Auth Middleware | Role Check | Description |
|---|---|---|---|---|
| `GET` | `/api/ngo/available-food` | **None** | None | Returns all food items where `status='Available'` |
| `GET` | `/api/ngo/my-donations` | `verifyToken` | None (`accepted_by`) | Returns food items accepted by logged-in user |
| `PUT` | `/api/ngo/accept/:id` | `verifyToken` | `role === 'ngo'` | Transitions status to `Reserved`, sets `accepted_by` |
| `PUT` | `/api/ngo/deliver/:id` | `verifyToken` | None | Transitions status from `Reserved` to `Completed` |

### Volunteer (`/api/volunteer`)
| Method | Path | Auth Middleware | Role Check | Description |
|---|---|---|---|---|
| `GET` | `/api/volunteer/available-deliveries` | `verifyToken` | `role === 'volunteer'` | Returns `Reserved` food items joined with users |
| `PUT` | `/api/volunteer/accept/:id` | `verifyToken` | `role === 'volunteer'` | Transitions status from `Reserved` to `Assigned` |
| `GET` | `/api/volunteer/my-deliveries` | `verifyToken` | `role === 'volunteer'` | Returns items assigned to `volunteer_id` |
| `PUT` | `/api/volunteer/complete/:id` | `verifyToken` | `role === 'volunteer'` | Transitions status from `Assigned` to `Completed` |

### Admin (`/api/admin`)
| Method | Path | Auth Middleware | Role Check | Description |
|---|---|---|---|---|
| `GET` | `/api/admin/dashboard` | `verifyToken` | **None** | Returns platform aggregate user and donation counts |
| `GET` | `/api/admin/users` | `verifyToken` | **None** | Returns all users (`id`, `full_name`, `email`, `phone`, `role`, etc.) |
| `GET` | `/api/admin/donations` | `verifyToken` | **None** | Returns all food items joined with restaurant user |
| `DELETE` | `/api/admin/donation/:id`| `verifyToken` | **None** | Deletes any food item by ID |

---

## 8. Database Tables & Relationships Verified from Code

*(No SQL migration or DDL files exist in repository; the following schema is reconstructed strictly from SQL queries in controller files).* [CONFIRMED from code]

### Table: `users`
| Column Name | Inferred Data Type | Usage in Code |
|---|---|---|
| `id` | INT AUTO_INCREMENT PRIMARY KEY | Foreign key target for donations, accepted_by, volunteer_id |
| `full_name` | VARCHAR | Registration, Login response, Dashboard lists |
| `email` | VARCHAR UNIQUE | Registration check, Login lookup, Admin list |
| `password` | VARCHAR | Bcrypt hash storage |
| `phone` | VARCHAR | Registration, Admin user list |
| `role` | VARCHAR / ENUM | Values used: `'restaurant'`, `'ngo'`, `'volunteer'`, `'admin'` |
| `organization_name`| VARCHAR | Registration, Admin user list |
| `address` | VARCHAR / TEXT | Registration |

### Table: `food_items`
| Column Name | Inferred Data Type | Usage in Code |
|---|---|---|
| `id` | INT AUTO_INCREMENT PRIMARY KEY | Primary key for donation records |
| `donor_id` | INT (FK -> users.id) | Referenced in `foodController.js` (insert, select, update, delete) |
| `restaurant_id` | INT (FK -> users.id) | Referenced in `adminController.js` and `volunteerController.js` **(Schema Inconsistency)** |
| `food_name` | VARCHAR | Food title / description |
| `quantity` | VARCHAR | e.g. "50 Plates" |
| `food_type` | VARCHAR | e.g. "Veg", "Non-Veg", "Vegan", "Other" |
| `expiry_time` | DATETIME | Expiration timestamp |
| `pickup_address` | TEXT | Physical address for food collection |
| `status` | VARCHAR / ENUM | Observed values: `'Available'`, `'Reserved'`, `'Assigned'`, `'Completed'` |
| `image_url` | VARCHAR (Nullable) | Optional image URL |
| `accepted_by` | INT (FK -> users.id) | Populated with NGO user ID on acceptance |
| `accepted_time` | DATETIME | Timestamp when NGO accepted |
| `volunteer_id` | INT (FK -> users.id) | Populated with Volunteer user ID on acceptance |
| `volunteer_assigned_time` | DATETIME | Timestamp when Volunteer accepted |

### Relationships
- `users.id` 1 ──< N `food_items.donor_id` (or `restaurant_id`)
- `users.id` 1 ──< N `food_items.accepted_by`
- `users.id` 1 ──< N `food_items.volunteer_id`

---

## 9. Environment Variables & Configuration

### Backend Configuration (`backend/.env`) [CONFIRMED]
File is currently present in workspace and **committed to Git**:
```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=[REDACTED]
DB_NAME=foodrescue_ai
JWT_SECRET=[REDACTED]
```

### Frontend Configuration [CONFIRMED]
- No `.env` or `.env.example` file exists in `frontend/`.
- Backend API base URL is hardcoded as `http://localhost:5000` across 10 different frontend source files.

---

## 10. Important Dependencies

### Backend (`backend/package.json`) [CONFIRMED]
- `express` (^5.2.1) — Web framework
- `mysql2` (^3.22.6) — MySQL client
- `bcrypt` (^6.0.0) — Password hashing
- `jsonwebtoken` (^9.0.3) — JWT generation & verification
- `cors` (^2.8.6) — CORS support
- `dotenv` (^17.4.2) — Environment loader
- `multer` (^2.2.0) — File multipart/form-data handling *(installed but completely unused)*
- `nodemon` (^3.1.14) — Development reloader

### Frontend (`frontend/package.json`) [CONFIRMED]
- `react` (^19.2.7) — Core UI library
- `react-dom` (^19.2.7) — React DOM rendering
- `react-router-dom` (^7.18.1) — Client routing
- `axios` (^1.19.0) — HTTP client *(coexists redundantly with native `fetch`)*
- `react-icons` (^5.7.0) — Icon set
- `vite` (^8.1.1) — Build tool & dev server

---

## 11. Hardcoded Configuration & Localhost References

- **Hardcoded API URLs:** `http://localhost:5000` is hardcoded across:
  - `frontend/src/pages/Login.jsx`
  - `frontend/src/pages/Register.jsx`
  - `frontend/src/pages/RestaurantDashboard.jsx`
  - `frontend/src/pages/AddFood.jsx`
  - `frontend/src/pages/MyDonations.jsx`
  - `frontend/src/pages/EditDonation.jsx`
  - `frontend/src/pages/NGODashboard.jsx`
  - `frontend/src/pages/MyAcceptedDonations.jsx`
  - `frontend/src/pages/AdminDashboard.jsx`
  - `frontend/src/pages/VolunteerDashboard.jsx`
- **Database Connection:** Single connection created synchronously in `backend/config/db.js` using `mysql.createConnection()` instead of a connection pool (`createPool`). Fails immediately on network drop or MySQL timeout (`PROTOCOL_CONNECTION_LOST`).

---

## 12. Duplicate or Inconsistent Implementations

1. **Duplicate JWT Middleware:** `backend/middleware/authMiddleware.js` and `backend/middleware/verifyToken.js` perform identical token decoding logic with slight syntactic differences.
2. **Duplicate HTTP Clients in Frontend:** Part of the application uses native `fetch` (`Login`, `Register`, `RestaurantDashboard`, `AddFood`, `MyDonations`, `EditDonation`, `NGODashboard`, `MyAcceptedDonations`), while newer pages (`AdminDashboard`, `VolunteerDashboard`) use `axios`. No unified Axios instance or base configuration exists.
3. **Foreign Key Column Inconsistency:** `donor_id` vs `restaurant_id` in `food_items`.
4. **Status Lifecycle Inconsistency:** `status = 'Delivered'` queried in `foodController.js`, while `status = 'Completed'` written in `ngoController.js` and `volunteerController.js`.
5. **Two Conflicting Delivery Fulfillment Flows:** NGO can mark completed directly via `ngoController.js`, or volunteer can claim and mark completed via `volunteerController.js`.

---

## 13. Dead or Unreachable Functionality

1. `hardware/`: Directory exists at root, but is completely empty.
2. `database/`: Directory exists at root, but is completely empty (no schema, seed, or migration files).
3. `backend/models/`: Empty directory.
4. `backend/utils/`: Empty directory.
5. `backend/uploads/`: Empty directory; Multer package is installed but never wired up to routes.
6. `frontend/src/components/Footer.jsx`: 0 bytes, empty file, never mounted.
7. `.venv/`: Leftover Python virtual environment with no Python scripts in the project.
8. AI Redistribution: Advertised in marketing components, zero code exists.

---

## 14. Security Concerns

1. **CRITICAL: Committed Secrets in Git Repository:**
   - `backend/.env` is tracked in git history (commit `3a00810`).
   - Contains plaintext MySQL database credentials and JWT secret key ([REDACTED]).
   - Root `.gitignore` and `backend/.gitignore` are both 0 bytes / empty, meaning secrets will continue to be committed.
2. **HIGH: Missing Admin Authorization:**
   - All `/api/admin/*` endpoints lack role verification. Any authenticated user holding a valid JWT can dump all users' PII (name, email, phone) and delete donations.
3. **HIGH: Unrestricted Admin Account Creation:**
   - Anyone registering on `/register` can choose `role = 'admin'` from the HTML dropdown and gain full administrative capabilities.
4. **HIGH: Public Endpoint Exposure:**
   - `GET /api/ngo/available-food` has no authentication middleware at all. Anyone on the internet can scrape food donation listings and pickup addresses.
5. **MEDIUM: No Client-Side Route Protection:**
   - No route guards in React Router. Dashboard views are accessible without authentication (though API calls return 401).
6. **MEDIUM: Weak Input Validation & Error Leaks:**
   - No input schema validation (e.g. Joi/Zod/validator).
   - Raw database error messages (`err.message`) are returned directly to client in HTTP 500 responses.
7. **MEDIUM: Permissive CORS:**
   - `cors()` is mounted without configuration, allowing any origin to make cross-origin requests.

---

## 15. Major Bugs & Business-Logic Inconsistencies

1. **Frontend Crash in `AdminDashboard.jsx` (ReferenceError):**
   - In `AdminDashboard.jsx`, the `deleteDonation` function is placed **outside** the `AdminDashboard` component closure (lines 170–199).
   - It attempts to access `token`, `fetchDonations()`, and `fetchStats()`, which are declared inside the component.
   - Clicking "Delete" throws an immediate JavaScript runtime `ReferenceError`.
2. **Syntax Error in `frontend/src/components/HowItWorks.jsx`:**
   - Line 116 ends with: `export default HowItWorks;<div className=""></div>`.
   - Trailing JSX after the export statement is invalid syntax and breaks standard parsers / linters.
3. **Linux / Deployment Build Failure on Case Mismatch:**
   - `frontend/src/pages/Login.jsx` has `import "./Login.css";`.
   - The file on disk is `login.css` (lowercase). While Windows ignores casing, Linux CI/CD or production Docker containers will fail with `Module not found: ./Login.css`.
4. **Missing Extension in Backend Route Import:**
   - `backend/routes/volunteerRoutes` exists on disk without `.js` extension.
   - While Node's local resolution handled it, it violates standard conventions and can cause failures across build/bundling tools.
5. **SQL Column Mismatch Breaking Volunteer & Admin Features:**
   - `adminController.js` and `volunteerController.js` query `food_items.restaurant_id`.
   - `foodController.js` inserts `donor_id`.
   - Running against a schema with either column will break half the API.
6. **Restaurant Dashboard Metric Always Zero:**
   - `foodController.js` queries `SUM(status='Delivered')`, but `status` is set to `'Completed'`. Completed donations will never reflect on the restaurant dashboard.
7. **Description Dropped on Food Creation:**
   - `AddFood.jsx` collects `description`, but `foodController.js` `addFood` does not accept or persist `description`.

---

## 16. Missing Production Requirements

1. **Database Schema & Migrations:** No reproducible SQL scripts, migrations, or seed data.
2. **Centralized Configuration:** No frontend `.env` support (`VITE_API_URL`) or backend config manager.
3. **Centralized API Client:** Need an Axios instance with base URL and authorization request interceptor to eliminate duplicate `http://localhost:5000` strings and mixed `fetch`/`axios` calls.
4. **Protected Route Architecture:** Need an AuthContext / ProtectedRoute wrapper in React.
5. **Consistent Design System:** NGO, Volunteer, and Admin views require styled components matching the landing page and Restaurant dashboard.
6. **Backend Database Connection Pooling:** Must replace `mysql.createConnection` with `mysql.createPool` to prevent socket disconnects under real traffic.
7. **Input Validation & Sanitization:** Need validation schemas for auth and donation inputs.
8. **Logging & Error Middleware:** Central Express error handler to prevent leaking stack traces or raw SQL errors.

---

## 17. Existing Healthy Functionality (Preserve, Do Not Rewrite)

1. **Password Hashing:** `bcrypt` implementation in `authController.js` is correct and standard.
2. **JWT Generation & Parsing:** Token signing and bearer token extraction logic is functional.
3. **Landing Page Structure & Styling:** `Navbar`, `Hero`, `Stats`, `Features`, and `HowItWorks` have modern CSS animations and layout that should be retained.
4. **Restaurant Dashboard Foundations:** `RestaurantDashboard.jsx` has well-structured layout, metrics cards, and SVG icons.
5. **Core API Pattern:** The Express routes-to-controller modular pattern is sound and standard.

---

## Recommended Next Actions

Prioritized by **Risk**, **Dependency**, **Correctness**, and **Product Value**:

### Phase 1: Security & Risk Mitigation (Immediate Priority)
1. **Purge Committed Secrets & Fix `.gitignore`:**
   - Add `.env`, `node_modules`, and `.venv` to root `.gitignore` and `backend/.gitignore`.
   - Rotate database password and JWT secret.
   - Remove `backend/.env` from git tracking (`git rm --cached backend/.env`).
   - Create `backend/.env.example` and `frontend/.env.example`.
2. **Implement Role-Based Authorization Middleware:**
   - Create a unified `requireAuth` and `requireRole(['admin'])` middleware.
   - Protect all `/api/admin/*` routes with `requireRole(['admin'])`.
   - Protect `/api/food` POST with `requireRole(['restaurant'])`.
   - Protect `/api/ngo/available-food` with `requireAuth`.
3. **Remove Admin Option from Public Registration:**
   - Strip `"admin"` from `<select name="role">` in `Register.jsx` to prevent self-privilege escalation.

### Phase 2: Database Schema & Core Architecture (Dependency Priority)
4. **Establish Authoritative Database Schema:**
   - Create `database/schema.sql` with reproducible DDL (`users`, `food_items`).
   - Resolve `donor_id` vs `restaurant_id` column naming permanently across all queries.
   - Normalize donation status values (`'Available'`, `'Reserved'`, `'Assigned'`, `'Completed'`).
5. **Upgrade Backend Database Connection to Pool:**
   - Refactor `backend/config/db.js` to use `mysql.createPool` with connection retry.
6. **Consolidate Backend Auth Middleware:**
   - Merge `authMiddleware.js` and `verifyToken.js` into a single, standard auth middleware.

### Phase 3: Runtime Correctness & Bug Fixes (Correctness Priority)
7. **Fix Frontend Runtime Crashes & Syntax Errors:**
   - Fix `deleteDonation` scope in `frontend/src/pages/AdminDashboard.jsx`.
   - Remove stray trailing JSX on line 116 of `frontend/src/components/HowItWorks.jsx`.
   - Rename `login.css` to `Login.css` to prevent Linux case-sensitivity failures.
   - Rename `backend/routes/volunteerRoutes` to `volunteerRoutes.js`.
8. **Fix Business Logic & Data Flow Mismatches:**
   - Align restaurant dashboard query to look for `'Completed'` instead of `'Delivered'`.
   - Add `description` column to `food_items` or reconcile `AddFood.jsx` and `foodController.js`.
   - Unify the NGO and Volunteer delivery workflow so state transitions cannot collide.

### Phase 4: Frontend Architecture & Product Value (Product Value Priority)
9. **Implement Centralized API Client & Frontend Environment:**
   - Configure `VITE_API_URL` and create a centralized Axios client with interceptors.
   - Replace all hardcoded `http://localhost:5000` references.
10. **Implement Auth Context & Protected Routes:**
    - Create React AuthContext for user state, token management, and logout.
    - Wrap `/restaurant`, `/ngo`, `/volunteer`, and `/admin` routes in `<ProtectedRoute>`.
11. **Standardize UI/UX Across Dashboards:**
    - Upgrade `AdminDashboard`, `NGODashboard`, `VolunteerDashboard`, `MyAcceptedDonations`, and `EditDonation` from raw HTML `<table border="1">` to clean, styled responsive components matching the design system.
12. **Implement Real Matching or Notification Logic:**
    - Build actual rule-based or algorithmic food redistribution matching to deliver on the core product vision.
