# AI-Powered Web Generator using LLAMA

An end-to-end AI-based web project generator that transforms natural language prompts into full-fledged website codebases using the LLAMA model. Includes real-time code preview using Web Containers—no need for external deployment!

## Features

●  Converts user prompts into website projects using the LLAMA language model  
●  Parses LLAMA-generated XML into development steps and structured frontend files  
●  Dynamically generates code and file structures on-the-fly  
●  In-browser live preview using Web Containers (no local setup needed)  
●  Session-based storage with on-demand file regeneration

## Tech Stack

- **AI Model**: LLAMA
- **Frontend**: React, HTML, CSS, JavaScript
- **Backend**: Node.js, Express.js
- **Code Execution**: Web Containers

## Project Structure

```bash
├── backend/
│   ├── src/              
│        ├── defaults/     # Default prompts for node and react
│            ├── react.ts
│            └── node.ts
│   ├── index.ts           # All main routes in this file
│   ├── prompts.ts         # format in which the response returned
│   ├── constants.ts       # Utility file
│   └── stripindents.ts    # Utility file
├── frontend/
│   ├── components/        # Contains various components
│   ├── hooks/             # Web Container config file
│   ├── pages/             # Contains landing page
│   └── types/             # Defined the types of file structure
└── README.md
```

## Installation

> **Note**: Ensure Node.js (v16+) is installed on your machine.

1. **Clone the Repository**

```bash
git clone [repository-url]
cd boult.new
```

2. **Install the Backend dependencies**

```bash
cd be
npm install
```

3. **Install the Frontend dependencies**

```bash
cd frontend
npm install
```

4. **Set up environment varaibles**

> **Note**: Create the .env file in the be foolder.
```bash
echo. > .env
```

5. **Start the backend server**

```bash
cd backend
npm run dev
```

6. **Start the frontend application**

```bash
cd frontend
npm run dev
```