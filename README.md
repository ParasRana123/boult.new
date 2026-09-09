# Boult.new

Boult.new is an AI-powered full-stack web application builder and in-browser development environment. It enables users to describe web applications in natural language, automatically scaffolds the required files, streams tailored code in real time using large language models, and executes the resulting project entirely inside the browser using WebContainers.

---

## Key Features

- **In-Browser Containerized Runtime**: Leverages the WebContainers API to run Node.js, Vite dev servers, and package installations directly in the browser with zero remote container overhead.
- **Multi-Model AI Failover Pool**: Integrates Google Gemini models with automatic iterator-level failover across candidate models to maintain uninterrupted streaming under rate limits or transient high-demand spikes.
- **Real-Time Token Streaming**: Server-Sent Events (SSE) streaming infrastructure with instant HTTP handshake and proxy keep-alive heartbeats.
- **Interactive Development Workspace**: Integrated Monaco Editor featuring syntax highlighting, multi-tab file navigation, and live project tree visualization.
- **Instant Live Preview**: Embedded sandboxed iframe reflecting code changes and running dev servers in real time.
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
         |  - Monaco Code Editor       |             |  - In-browser Node.js       |
         |  - File Explorer & Tabs     |<----------->|  - Vite Dev Server          |
         |  - SSE Event Stream Reader  |             |  - Sandboxed Preview Frame  |
         +--------------+--------------+             +-----------------------------+
                        |
                        v (HTTPS / SSE)
         +-----------------------------+
         |  Express.js Backend / API   |
         |  - /template Classifier     |
         |  - /chat SSE Streamer       |
         |  - Multi-Model Pool Manager |
         +--------------+--------------+
                        |
                        v
         +-----------------------------+
         |   Google Gemini AI API      |
         |  - gemini-3.6-flash         |
         |  - gemini-3.5-flash         |
         |  - gemini-3.7-flash         |
         +-----------------------------+
```

---

## Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Bundler / Dev Server**: Vite
- **Styling**: Tailwind CSS
- **Code Editor**: Monaco Editor (`@monaco-editor/react`)
- **Runtime Sandbox**: `@webcontainer/api`
- **Routing**: React Router DOM
- **HTTP Client**: Axios & Fetch API (Streams)

### Backend
- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js
- **Language**: TypeScript
- **AI SDK**: `@google/generative-ai`
- **Protocol**: Server-Sent Events (SSE) with keep-alive heartbeat

---

## Directory Structure

```
.
├── api/
│   └── index.ts                 # Serverless entry point for unified hosting
├── be/                          # Backend Express service
│   ├── src/
│   │   ├── defaults/            # Project template definitions (Node & React)
│   │   ├── constants.ts         # System constants and allowed HTML tags
│   │   ├── index.ts             # Express server and streaming failover logic
│   │   ├── prompts.ts           # System prompts and artifact format specifications
│   │   └── stripindents.ts      # Template string formatting utilities
│   ├── package.json
│   └── tsconfig.json
├── frontend/                    # React Vite client application
│   ├── src/
│   │   ├── components/          # UI components (Editor, Preview, Explorer, Steps)
│   │   ├── hooks/               # Custom hooks (useWebContainer)
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
   Create a `.env` file inside the `be/` directory:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   PORT=3000
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
