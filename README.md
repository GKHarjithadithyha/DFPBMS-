# Dhavanam Finance PBMS ERP System

Enterprise Financial ERP Web Application for Dhavanam Finance.

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js**: v18.x or later (recommended: Node.js v20.x or later)
- **npm**: v9.x or later

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Development Server
```bash
npm run dev
```
The server will start at: **`http://localhost:3000`**

### 4. Build for Production
```bash
npm run build
```

---

## ☁️ Deploying to Vercel

This repository is pre-configured with `vercel.json` for seamless zero-config deployment to Vercel:

1. Go to [Vercel](https://vercel.com/) and click **Add New Project**.
2. Import the GitHub repository: `https://github.com/GKHarjithadithyha/DFPBMS-`.
3. Vercel will automatically detect:
   - **Framework Preset**: Vite
   - **Root Directory**: `./` (Root)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Click **Deploy**.
5. Once deployment completes, your ERP web app will be live with full client-side routing support (SPA rewrites configured in `vercel.json`).

---

## 🔑 Login Credentials

The ERP has pre-configured roles with one-click quick login buttons or direct credentials:

| Role | Username | Password |
|---|---|---|
| **Admin** | `admin` | `admin123` |
| **Employee** | `karthik` | `emp123` |

---

## 📂 Core ERP Modules Available

- **Financial Core**: Cash Book, Bank Book, Central Ledger
- **Finance Module**: Overview, Loan Applications, Loan Register, Disbursements, Collections, Top-ups, NPA Tracker, Closures, New Loan Creation
- **Chit Fund Module**: Overview, Chit Groups, Chit Schemes, Members Directory, Auctions
- **Business Modules**: Rental Management, Expense Tracker, Investments, Receivables & Payables
- **Shared Tools**: Profile Directory, Calendar, Document Repository, Audit Logs, Master Data
