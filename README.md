# Boult.new

Boult.new is an AI-powered full-stack web application builder and in-browser development environment. It enables users to describe web applications in natural language, automatically scaffolds the required files, streams tailored code in real time using large language models, and executes the resulting project entirely inside the browser using WebContainers.

---

## Key Features

- **Authentication & User Management**: Integrated **Clerk Authentication** with seamless sign-in, sign-up, user profiles, and session management.
- **Persistent Database with Prisma ORM**: Cloud-hosted **Neon PostgreSQL** database storing registered users and login activity via **Prisma ORM**.
- **In-Browser Containerized Runtime**: Leverages the WebContainers API to run Node.js, Vite dev servers, and package installations directly in the browser with zero remote container overhead.
- **Multi-Model AI Failover Pool**: Integrates Google Gemini models with automatic iterator-level failover across candidate models to maintain uninterrupted streaming under rate limits or transient high-demand spikes.
- **Real-Time Token Streaming**: Server-Sent Events (SSE) streaming infrastructure with instant HTTP handshake and proxy keep-alive heartbeats.
- **Interactive & Editable Monaco Workspace**: Full interactive code editor allowing users to edit generated files directly after AI generation completes, featuring syntax highlighting, multi-tab file navigation, live project tree visualization, and one-click code copy.
- **Instant Live Preview with HMR**: Sandboxed iframe with direct WebContainer filesystem syncing for sub-second Vite Hot Module Replacement (HMR) as you code, plus instant revert to AI-generated snapshots.
- **Unified Full-Stack Deployment**: Configured for single-project monorepo deployment on modern serverless hosting platforms.

---

## System Architecture

```
                                +---------------------------+
                                |      User Web Browser     |
                                +-------------+-------------+
                                              |
                        +---------------------+---------------------+
                        |                                           |
                        v                                           v
         +-----------------------------+             +-----------------------------+
         |    React / Vite Frontend    |             |    WebContainer Runtime     |
         |  - Clerk Authentication     |             |  - In-browser Node.js       |
         |  - Monaco Code Editor       |<----------->|  - Vite Dev Server          |
         |  - File Explorer & Tabs     |             |  - Sandboxed Preview Frame  |
         |  - SSE Event Stream Reader  |             +-----------------------------+
         +--------------+--------------+
                        |
                        v (HTTPS / SSE / REST)
         +-----------------------------+
         |  Express.js Backend / API   |
         |  - /template Classifier     |
         |  - /chat SSE Streamer       |
         |  - /api/users Auth Sync     |
         |  - Prisma ORM Client        |
         +--------------+--------------+
                        |
            +-----------+-----------+
            |                       |
            v                       v
+-----------------------+   +-----------------------+
|  Google Gemini AI     |   |  Neon PostgreSQL DB   |
|  - gemini-3.6-flash   |   |  - users table        |
|  - gemini-3.5-flash   |   |  - login metadata     |
|  - gemini-3.7-flash   |   +-----------------------+
+-----------------------+
```

---

## Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Authentication**: Clerk (`@clerk/clerk-react`)
- **Bundler / Dev Server**: Vite
- **Styling**: Tailwind CSS
- **Code Editor**: Monaco Editor (`@monaco-editor/react`)
- **Runtime Sandbox**: `@webcontainer/api`
- **Routing**: React Router DOM
- **HTTP Client**: Axios & Fetch API (Streams)

### Backend
- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js
- **Database ORM**: Prisma ORM (`@prisma/client`, `prisma`)
- **Database**: PostgreSQL (Neon Serverless Postgres)
- **Language**: TypeScript
- **AI SDK**: `@google/generative-ai`
- **Protocol**: Server-Sent Events (SSE) with keep-alive heartbeat

---

## Database Schema (Prisma)

```prisma
model User {
  id          String   @id @default(uuid())
  clerkId     String   @unique
  email       String
  firstName   String?
  lastName    String?
  imageUrl    String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  lastLoginAt DateTime @default(now())

  @@map("users")
}
```

---

## Directory Structure

```
.
├── api/
│   └── index.ts                 # Serverless entry point for unified hosting
├── be/                          # Backend Express service
│   ├── prisma/
│   │   └── schema.prisma        # Prisma ORM schema definition
│   ├── src/
│   │   ├── db.ts                # Prisma client singleton
│   │   ├── defaults/            # Project template definitions (Node & React)
│   │   ├── constants.ts         # System constants and allowed HTML tags
│   │   ├── index.ts             # Express server, user sync, and streaming failover
│   │   ├── prompts.ts           # System prompts and artifact format specifications
│   │   └── stripindents.ts      # Template string formatting utilities
│   ├── package.json
│   └── tsconfig.json
├── frontend/                    # React Vite client application
│   ├── src/
│   │   ├── components/          # UI components (Editor, Preview, Explorer, Steps)
│   │   ├── hooks/               # Custom hooks (useWebContainer, useSyncUser)
│   │   ├── pages/               # Application routes (Home, Builder)
│   │   ├── config.ts            # Dynamic environment configuration
│   │   ├── steps.ts             # XML parsing and step execution utilities
│   │   └── types.ts             # TypeScript definitions
│   ├── package.json
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── vercel.json              # Client-side headers & rewrites
│   └── vite.config.ts
├── package.json                 # Monorepo build scripts and shared dependencies
├── tsconfig.json                # Root TypeScript configuration
├── vercel.json                  # Unified platform configuration
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js (v18.0.0 or higher recommended)
- npm (v9.0.0 or higher)
- Google Gemini API Key (obtained from Google AI Studio)
- Clerk Publishable Key (obtained from Clerk Dashboard)
- PostgreSQL Database URL (e.g. Neon PostgreSQL)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/ParasRana123/boult.new.git
   cd boult.new
   ```

2. Install dependencies:
   ```bash
   # Install root dependencies
   npm install

   # Install backend dependencies
   cd be && npm install && cd ..

   # Install frontend dependencies
   cd frontend && npm install && cd ..
   ```

3. Configure Environment Variables:
   
   Create `be/.env`:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   PORT=3000
   DATABASE_URL=postgresql://user:password@host/neondb?sslmode=require
   ```

   Create `frontend/.env`:
   ```env
   VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
   VITE_BACKEND_URL=http://localhost:3000
   ```

4. Push Prisma Database Schema:
   ```bash
   cd be
   npx prisma db push
   cd ..
   ```

### Running Locally

1. Start the backend service:
   ```bash
   cd be
   npm run dev
   ```

2. In a separate terminal, start the frontend development server:
   ```bash
   cd frontend
   npm run dev
   ```

3. Open your browser and navigate to `http://localhost:5173`.

---

## API Endpoints

### 1. `GET /health`
Returns service status, provider information, and currently active candidate models.

### 2. `POST /template`
Analyzes the initial prompt and returns the matching foundational project scaffold.

- **Request Body**:
  ```json
  {
    "prompt": "Create a task manager in React"
  }
  ```
- **Response**:
  ```json
  {
    "prompts": ["...system and context prompts..."],
    "uiPrompts": ["...base template artifact..."]
  }
  ```

### 3. `POST /chat`
Streams LLM-generated code modifications and file actions via Server-Sent Events.

- **Request Body**:
  ```json
  {
    "messages": [
      {
        "role": "user",
        "content": "Add dark mode toggle to the navbar"
      }
    ],
    "stream": true
  }
  ```
- **Response**: `text/event-stream` stream containing incremental token chunks and XML action steps.

---

## Deployment

This repository is pre-configured for single-step deployment on Vercel.

### Vercel Deployment

1. Import the repository in the Vercel Dashboard.
2. Under **Environment Variables**, add:
   - `GEMINI_API_KEY`: Your Google Gemini API key.
3. Keep default settings (`./` root directory).
4. Click **Deploy**.

> **Note on Cross-Origin Isolation**: WebContainers require strict cross-origin security headers. Both `vercel.json` and `vite.config.ts` are configured with:
> - `Cross-Origin-Embedder-Policy: require-corp`
> - `Cross-Origin-Opener-Policy: same-origin`

---

## License

This project is open-source and available under the ISC License.
