# LeanAxis Accounts v2.0 — Full-Stack Professional App

A complete professional accounting platform for creative agencies, featuring a **Node.js/Express REST API backend** and **React + Vite frontend**, backed by Firebase Firestore.

## Architecture Overview

```
leanaxis/
├── server/                    # Node.js + Express Backend
│   ├── index.js               # Main server entry point
│   ├── config/
│   │   └── firebase.js        # Firebase Admin SDK setup
│   ├── middleware/
│   │   └── auth.js            # JWT authentication middleware
│   └── routes/
│       ├── auth.js            # Login, logout, /me endpoints
│       ├── crud.js            # Generic CRUD factory
│       ├── invoices.js        # Invoice + payment endpoints
│       ├── vendorBills.js     # Bill + payment endpoints
│       ├── users.js           # User management
│       └── settings.js        # App settings, export, import
│
├── client/                    # React + Vite Frontend
│   ├── src/
│   │   ├── main.jsx           # Entry point + providers
│   │   ├── App.jsx            # All UI components + orchestration
│   │   ├── context/
│   │   │   ├── AuthContext.jsx  # JWT auth state
│   │   │   └── DataContext.jsx  # Central data store (API-backed)
│   │   ├── components/
│   │   │   └── Toast.jsx      # Notification system
│   │   └── utils/
│   │       ├── api.js         # Axios API client + all endpoints
│   │       └── helpers.js     # Formatting, calculations
│   └── public/
│       └── logo.png           # Your company logo
│
└── package.json               # Monorepo scripts
```

## Features

- ✅ **JWT Authentication** — Secure token-based auth, role-based access (Admin/Editor/Viewer)
- ✅ **Full CRUD** — Clients, Vendors, Invoices, Quotations, Expenses, Petty Cash, Salaries, Bank Records, Vendor Bills
- ✅ **Invoice Management** — Generate, send, track payments, partial payments, WHT, recurring
- ✅ **Balance Tracking** — Real-time balance due per invoice and per client
- ✅ **Client Profiles** — Full ledger, payment history, aging, statement PDF
- ✅ **Vendor Management** — Bills, payments, vendor profiles
- ✅ **Financial Reports** — P&L Analytics, Tax Liability, Receivables & Payables
- ✅ **Salary Slips** — Generate and print professional payslips
- ✅ **Data Backup** — Export/Import JSON backup via secure API
- ✅ **Dark Mode** — Full dark theme support
- ✅ **Command Palette** — Ctrl+K search across all records
- ✅ **Rate Limiting** — API protected against abuse
- ✅ **Security** — Helmet.js headers, CORS, JWT expiry, bcrypt passwords

## Quick Setup

### 1. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Your existing project: `leanaxis-accounts`
3. Go to **Project Settings → Service Accounts**
4. Click **"Generate new private key"** → download JSON file
5. Use values from that JSON file in your `.env`

### 2. Backend Setup

```bash
cd server
npm install

# Copy env template and fill in your values
cp .env.example .env
# Edit .env with your Firebase credentials and JWT secret
```

**`.env` required values:**
```
PORT=3001
JWT_SECRET=your-32-char-minimum-secret-here
FIREBASE_PROJECT_ID=leanaxis-accounts
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@leanaxis-accounts.iam.gserviceaccount.com
CLIENT_URL=http://localhost:5173
```

### 3. Frontend Setup

```bash
cd client
npm install
```

Optional: create `client/.env` for custom API URL:
```
VITE_API_URL=/api
```

### 4. Run in Development

From the root directory:
```bash
npm install   # installs concurrently
npm run dev   # starts both server (3001) and client (5173)
```

Or separately:
```bash
# Terminal 1 - Backend
cd server && node index.js

# Terminal 2 - Frontend  
cd client && npm run dev
```

### 5. Production Build

```bash
# Build the React frontend
cd client && npm run build

# Start the server (serves built frontend from /client/dist)
cd server && NODE_ENV=production node index.js
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login with username/email + password |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/clients` | List all clients |
| POST | `/api/clients` | Create client |
| PUT | `/api/clients/:id` | Update client |
| DELETE | `/api/clients/:id` | Delete client (Admin) |
| GET | `/api/invoices` | List all invoices |
| POST | `/api/invoices` | Create invoice |
| POST | `/api/invoices/:id/payment` | Record payment |
| POST | `/api/invoices/generate-recurring` | Generate retainer invoices |
| POST | `/api/vendor-bills/:id/payment` | Pay a vendor bill |
| GET | `/api/settings/export` | Download JSON backup |
| POST | `/api/settings/import` | Restore from backup |
| ... | (same pattern for vendors, expenses, petty-cash, etc.) | |

## Default Login

On first launch, the server creates an admin account:
- **Username:** `admin`
- **Password:** `admin123`

⚠️ **Change this immediately** in User Management after first login.

## Deployment

### Deploy to Railway / Render / Fly.io

1. Push to GitHub
2. Connect your repo to Railway/Render
3. Set environment variables from your `.env`
4. Set build command: `cd client && npm install && npm run build`
5. Set start command: `cd server && npm install && node index.js`

### Deploy to VPS (Ubuntu)

```bash
# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone repo and install
git clone <your-repo>
cd leanaxis/server && npm install
cd ../client && npm install && npm run build

# Use PM2 for process management
npm install -g pm2
cd ../server
pm2 start index.js --name leanaxis-api
pm2 startup && pm2 save

# Configure Nginx as reverse proxy
# Proxy /api/* to localhost:3001
# Serve /client/dist for everything else
```

## Security Notes

- JWT tokens expire after 7 days (configurable via `JWT_EXPIRES_IN`)
- Passwords are hashed with bcrypt (12 rounds)
- Legacy SHA-256 passwords from v1 are auto-upgraded to bcrypt on login
- Rate limiting: 1000 req/15min general, 20 req/15min for login
- All write operations require authentication
- Delete operations require Admin role
- Firebase Admin SDK runs server-side only (credentials never exposed to browser)


---

## GitHub Pages Deployment

### Step 1 — Deploy the backend first (free options)

**Railway** (recommended, free tier):
1. Push the `server/` folder to a GitHub repo
2. Connect to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Add environment variables (same as `server/.env`)
4. Note the deployed URL, e.g. `https://leanaxis-server.up.railway.app`

**Render** (alternative):
1. New Web Service → connect your repo
2. Build command: `npm install`
3. Start command: `node index.js`
4. Add environment variables

### Step 2 — Build the frontend for GitHub Pages

```bash
cd client

# Create .env.production with your backend URL:
echo 'VITE_API_URL=https://your-server.railway.app/api' > .env.production

# Build
npm run build
```

### Step 3 — Deploy dist/ to GitHub Pages

Option A — Manual:
```bash
# Copy dist/ contents to your gh-pages branch
cd dist
git init
git add .
git commit -m "deploy"
git push -f https://github.com/YOUR_USER/leanaxis-accounts.git main:gh-pages
```

Option B — GitHub Actions (auto-deploy on push):
Create `.github/workflows/deploy.yml` in your repo with the workflow below.

### GitHub Actions workflow

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - name: Install & Build
        working-directory: client
        env:
          VITE_API_URL: ${{ secrets.VITE_API_URL }}
        run: |
          npm install
          npm run build
      - name: Deploy
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: client/dist
```

Add `VITE_API_URL` as a **Repository Secret** in GitHub → Settings → Secrets.

### vite.config.js base path

The `base` is set to `/leanaxis-accounts/` by default.
If your GitHub repo has a different name, edit `client/vite.config.js`:
```js
base: command === 'build' ? '/YOUR-REPO-NAME/' : '/',
```
