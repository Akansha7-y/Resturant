# ✦ L'Étoile Reserve

> **Premier AI-Powered Fine Dining & Table Reservation Platform**  
> Securing reservations, predicting wait times, and discovering culinary venues with natural language search.

---

## 📖 Overview

**L'Étoile Reserve** is a full-stack restaurant reservation and culinary discovery platform built with **React 19** and **Node.js (Express)**. It combines a luxury user experience with modern AI capabilities: natural-language intent search, dynamic wait-time predictions, review sentiment analytics, calendar integrations, and dedicated role-based portals for diners, restaurant owners, and administrators.

---

## ✨ Features

- **🤖 AI Dining Concierge & Natural Language Search**:
  - Understands requests like *"romantic dinner under 2500"* or *"spicy Indian near Downtown"*.
  - Voice search powered by Web Speech API.
  - Review summarizer extracting customer sentiment and common keywords.
  - Predictive venue wait times and occupancy scoring.
- **📅 Table Reservation & Mock Payment**:
  - Step-by-step reservation workflow with seating preference selection (VIP, Standard, Outdoor).
  - Credit card hold deposit processing and transaction receipt generation.
  - Instant Google Calendar and `.ics` event downloads.
- **🔐 Multi-Method Authentication**:
  - JWT session management with role-based access (`user`, `owner`, `admin`).
  - Password login & registration.
  - 6-digit passwordless OTP email authentication via **Brevo API** or SMTP (with local development fallback).
  - One-click instant demo logins for testing.
- **🏪 Owner Management Portal**:
  - Complete control over menus, seating tables, staff roster, active promotional discounts, customer reviews, and reservation approval/rejection.
  - Real-time restaurant occupancy, revenue analytics, and performance charts.
- **🛡️ Executive Admin Audit Suite**:
  - System-wide booking audits, platform revenue tracking, and restaurant onboarding.
- **💾 Dual-Storage Engine**:
  - Seamless automatic connection to **MongoDB** via Mongoose.
  - Zero-configuration fallback to an internal JSON file database (`backend/data/`) with auto-seeding mock data when MongoDB is offline.

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, React Router v7, Vite 8, Native Web APIs (Speech Recognition, Share, Clipboard) |
| **Backend** | Node.js (ES Modules), Express.js, JWT, Bcrypt.js, CORS |
| **Database** | MongoDB 8 via Mongoose (with automated Local JSON fallback) |
| **Email Service** | Brevo (Sendinblue) Transactional API, Nodemailer |
| **Styling** | Custom Luxury Glassmorphism Design System (CSS Variables, Responsive) |
| **Deployment** | Vercel (Serverless Functions for Backend, Static Hosting for Frontend) |

---

## 📁 Project Directory Structure

```text
Resturant/
├── backend/
│   ├── config/
│   │   └── db.js                 # Unified MongoDB & LocalDB fallback manager
│   ├── data/                     # Local JSON mock stores & seed files
│   ├── middleware/
│   │   └── authMiddleware.js     # JWT verification & role authorization (admin/owner)
│   ├── models/
│   │   ├── bookingModel.js       # Unified reservation data layer
│   │   ├── restaurantModel.js    # Restaurant, menu, table, and review schema
│   │   └── userModel.js          # User, OTP, and reward points layer
│   ├── routes/
│   │   ├── aiRoutes.js           # AI search, chat concierge & wait-time routes
│   │   ├── authRoutes.js         # Register, login, OTP & password reset
│   │   ├── bookingRoutes.js      # Table booking & mock payment flow
│   │   ├── ownerRoutes.js        # Restaurant management portal endpoints
│   │   └── restaurantRoutes.js   # Public restaurant discovery & reviews
│   ├── services/
│   │   └── aiService.js          # Natural-language query parsing & scoring
│   ├── utils/
│   │   └── emailService.js       # Brevo & SMTP transactional email client
│   ├── tests/                    # Automated test suites (JWT & Brevo)
│   ├── server.js                 # Express server entry point (Vercel-ready)
│   ├── vercel.json               # Vercel deployment configuration
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/           # AISearchBar, ChatSupport, AIInsights, Map
│   │   ├── context/              # AuthContext session management
│   │   ├── pages/                # Home, RestaurantList, Details, Dashboards, Auth
│   │   ├── utils/                # Calendar & Share helpers
│   │   ├── App.jsx               # Navigation, routing & route protection
│   │   └── main.jsx
│   ├── vite.config.js            # Vite configuration with API proxy
│   └── package.json
├── docker-compose.yaml           # Local MongoDB container definition
├── issue.md                      # Codebase audit & identified issues log
└── README.md
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm** or **pnpm**
- **Docker** *(Optional, for running MongoDB locally)*

### 2. Environment Configuration

#### Backend Setup
Copy the example environment file in `backend/`:
```bash
cp backend/.env.example backend/.env
```

Configure your parameters in `backend/.env`:
```env
PORT=5000
MONGO_URI=mongodb://admin:admin123@localhost:27017/mydb?authSource=admin
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d
OTP_EXPIRY_MINUTES=10

# Brevo Transactional Email (Optional - simulated in console if omitted)
BREVO_API_KEY=YOUR_BREVO_API_KEY
BREVO_SENDER_EMAIL=noreply@yourdomain.com
BREVO_SENDER_NAME="L'Étoile Reserve"
```

---

### 3. Running Locally

#### Step A: Launch Database (Optional)
If you have Docker installed, start the MongoDB container:
```bash
docker compose up -d
```
*(If Docker is not running, the backend automatically activates the local file database fallback in `backend/data/`.)*

#### Step B: Install & Start Backend
```bash
cd backend
npm install
npm run dev
```
The API server starts at `http://localhost:5000`.

#### Step C: Install & Start Frontend
Open a new terminal tab:
```bash
cd frontend
npm install
npm run dev
```
The frontend dev server starts at `http://localhost:5173`.

---

## 🧪 Running Tests

The backend includes standalone verification scripts:

```bash
# Test JWT authentication & role-based middleware
npm --prefix backend run test:jwt

# Test Brevo email service configuration
npm --prefix backend run test:brevo
```

---

## 🌐 Deploying Backend to Vercel

The backend includes a configured [`backend/vercel.json`](file:///home/varun/web/Resturant/backend/vercel.json) and exports the Express app for Vercel Serverless Functions.

### Option 1: Deploy via Vercel CLI
```bash
# Navigate to the backend directory
cd backend

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### Option 2: Deploy via Vercel Dashboard (Git Integration)
1. In the Vercel Dashboard, import your repository.
2. Set the **Root Directory** to `backend`.
3. Add the following **Environment Variables**:
   - `MONGO_URI`: Your MongoDB connection string (e.g. MongoDB Atlas).
   - `JWT_SECRET`: A secure random secret string.
   - `JWT_EXPIRES_IN`: e.g. `7d`.
   - `OTP_EXPIRY_MINUTES`: e.g. `10`.
   - `BREVO_API_KEY` & `BREVO_SENDER_EMAIL`: Your Brevo transactional email credentials.
4. Click **Deploy**.

> **Note on Persistent Storage**: Vercel Serverless Functions use ephemeral execution environments. Ensure you provide a live MongoDB Atlas connection string in `MONGO_URI` so data persists across function invocations.

---

## 📡 API Reference Overview

| Endpoint | Method | Access | Description |
| :--- | :---: | :---: | :--- |
| `/api/auth/register` | `POST` | Public | Create customer account & receive JWT session |
| `/api/auth/login` | `POST` | Public | Authenticate with email & password |
| `/api/auth/send-otp` | `POST` | Public | Request a 6-digit login or registration OTP |
| `/api/auth/verify-otp` | `POST` | Public | Verify OTP code & authenticate |
| `/api/auth/me` | `GET` | User | Get current logged-in user profile |
| `/api/restaurants` | `GET` | Public | Query restaurants with filters (cuisine, price, rating) |
| `/api/restaurants/:id` | `GET` | Public | Retrieve full restaurant details and menu |
| `/api/restaurants/:id/reviews` | `POST` | User | Post a verified review with ratings & photos |
| `/api/bookings` | `POST` | User | Create a table reservation |
| `/api/bookings/:id/pay` | `POST` | User | Process hold deposit payment for reservation |
| `/api/bookings/:id/cancel` | `PUT` | User | Cancel an existing reservation |
| `/api/owner/restaurant` | `GET/POST/PUT` | Owner | Manage restaurant profile, gallery, hours |
| `/api/owner/menu` | `GET/POST/DELETE`| Owner | Manage dining menu catalog and pricing |
| `/api/owner/bookings` | `GET` | Owner | View all reservations for owned venue |
| `/api/owner/bookings/:id/accept` | `PUT` | Owner | Approve booking and assign table |
| `/api/ai/search` | `POST` | Public | Natural-language query parsing and ranked matching |
| `/api/ai/wait-time/:id` | `GET` | Public | Predictive wait-time analysis for restaurant |
| `/api/ai/chat` | `POST` | Public | Concierge assistant answering culinary questions |

---

## 📄 License

This project is licensed under the MIT License.

