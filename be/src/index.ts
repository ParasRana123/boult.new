import { config } from "dotenv";
import express, { Request, Response } from "express";
import { BASE_PROMPT , getSystemPrompt } from "./prompts.js";
import { basePrompt as nodeBasePrompt } from "./defaults/node.js";
import { basePrompt as reactBasePrompt } from "./defaults/react.js";
import cors from 'cors';

// Load environment variables
config();
const GROQ_API_KEY: string = process.env.GROQ_API_KEY || "";

if (!GROQ_API_KEY) {
  throw new Error("Missing GROQ_API_KEY in environment variables.");
}

const app = express();
app.use(express.json());
app.use(cors());

app.post("/template", async (req: Request, res: Response): Promise<void> => {
  try {
    const prompt: string = req.body.prompt;
    if (!prompt) {
      res.status(400).json({ error: "Prompt is required" });
      return;
    }

    const { default: fetch } = await import("node-fetch");

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        stream: false,
        messages: [
          {
            role: "system",
            content:
              "Return either node or react based on what you think the project should be. Only return a single word either 'node' or 'react'. Do not return anything extra.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    const json = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
    };

    console.log("GROQ API raw response:", JSON.stringify(json, null, 2));

    if (!json.choices || !Array.isArray(json.choices) || !json.choices[0]) {
      res.status(500).json({
        error: "Invalid response structure from GROQ",
        data: json,
      });
      return;
    }

    const content = json.choices[0]?.message?.content;
    if(!content) {
      res.status(500).json({
        error: "Missing data in Groq api response",
        debugData: json
      })
      return;
    }

    const answer = content.trim().toLowerCase();
    console.log("Extracted answer" , answer);

    if (answer === "react") {
      res.json({ prompts: [BASE_PROMPT, `Here is an artifact that contains all files of the project visible to you.\n You should ALWAYS CONSIDER all the files.\nConsider the contents of ALL files in the project.\n\n${reactBasePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`] , 
                 uiPrompts: [reactBasePrompt] });
      return;
    }

    if (answer === "node") {
      res.json({ prompts: [`Here is an artifact that contains all files of the project visible to you.\n You should ALWAYS CONSIDER all the files. \nConsider the contents of ALL files in the project.\n\n${reactBasePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`] , 
                 uiPrompts: [nodeBasePrompt]});
      return;
    }

    res.status(403).json({
      message: "Unexpected classification result",
      debugAnswer: answer,
    });
  } catch (err: any) {
    console.error("Unexpected error:", err);
    res.status(500).json({
      error: "Unexpected error occurred",
      details: err?.message || String(err),
    });
  }
});

app.post("/chat" , async (req , res) => {
    const messages = req.body.messages;
    const finalMessages = [
      {
        role: "system",
        content: getSystemPrompt()
      },
      ...messages,    // User and Assistant messages
    ]

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        stream: false,
        messages: finalMessages
      }),
    });

    const json = await response.json();
    console.log("GROQ Chat Response:", JSON.stringify(json, null, 2));

    res.json(json);
})

app.listen(3000, () => {
  console.log("Server listening on port 3000");
});


// async function main() {
//   const { default: fetch } = await import("node-fetch");

//   const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
//     method: "POST",
//     headers: {
//       Authorization: `Bearer ${GROQ_API_KEY}`,
//       "Content-Type": "application/json",
//     },
//     body: JSON.stringify({
//       model: "llama3-8b-8192",
//       stream: true,
//       messages: [
//         {
//           role: "system",
//           content: getSystemPrompt(),
//         },
//         {
//           role: "user",
//           content: "Project Files:\n\nThe following is a list of all project files and their complete contents that are currently visible and accessible to you.\n\neslint.config.js:\n```\nimport js from '@eslint/js';\nimport globals from 'globals';\nimport reactHooks from 'eslint-plugin-react-hooks';\nimport reactRefresh from 'eslint-plugin-react-refresh';\nimport tseslint from 'typescript-eslint';\n\nexport default tseslint.config(\n  { ignores: ['dist'] },\n  {\n    extends: [js.configs.recommended, ...tseslint.configs.recommended],\n    files: ['**/*.{ts,tsx}'],\n    languageOptions: {\n      ecmaVersion: 2020,\n      globals: globals.browser,\n    },\n    plugins: {\n      'react-hooks': reactHooks,\n      'react-refresh': reactRefresh,\n    },\n    rules: {\n      ...reactHooks.configs.recommended.rules,\n      'react-refresh/only-export-components': [\n        'warn',\n        { allowConstantExport: true },\n      ],\n    },\n  }\n);\n\n```\n\nindex.html:\n```\n<!doctype html>\n<html lang=\"en\">\n  <head>\n    <meta charset=\"UTF-8\" />\n    <link rel=\"icon\" type=\"image/svg+xml\" href=\"/vite.svg\" />\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />\n    <title data-default>Vite + React + TS</title>\n  </head>\n  <body>\n    <div id=\"root\"></div>\n    <script type=\"module\" src=\"/src/main.tsx\"></script>\n  </body>\n</html>\n\n```\n\npackage.json:\n```\n{\n  \"name\": \"vite-react-typescript-starter\",\n  \"private\": true,\n  \"version\": \"0.0.0\",\n  \"type\": \"module\",\n  \"scripts\": {\n    \"dev\": \"vite\",\n    \"build\": \"vite build\",\n    \"lint\": \"eslint .\",\n    \"preview\": \"vite preview\"\n  },\n  \"dependencies\": {\n    \"lucide-react\": \"^0.344.0\",\n    \"react\": \"^18.3.1\",\n    \"react-dom\": \"^18.3.1\"\n  },\n  \"devDependencies\": {\n    \"@eslint/js\": \"^9.9.1\",\n    \"@types/react\": \"^18.3.5\",\n    \"@types/react-dom\": \"^18.3.0\",\n    \"@vitejs/plugin-react\": \"^4.3.1\",\n    \"autoprefixer\": \"^10.4.18\",\n    \"eslint\": \"^9.9.1\",\n    \"eslint-plugin-react-hooks\": \"^5.1.0-rc.0\",\n    \"eslint-plugin-react-refresh\": \"^0.4.11\",\n    \"globals\": \"^15.9.0\",\n    \"postcss\": \"^8.4.35\",\n    \"tailwindcss\": \"^3.4.1\",\n    \"typescript\": \"^5.5.3\",\n    \"typescript-eslint\": \"^8.3.0\",\n    \"vite\": \"^5.4.2\"\n  }\n}\n\n```\n\npostcss.config.js:\n```\nexport default {\n  plugins: {\n    tailwindcss: {},\n    autoprefixer: {},\n  },\n};\n\n```\n\nsrc/App.tsx:\n```\nimport React from 'react';\n\nfunction App() {\n  return (\n    <div className=\"min-h-screen bg-gray-100 flex items-center justify-center\">\n      <p>Start prompting (or editing) to see magic happen :)</p>\n    </div>\n  );\n}\n\nexport default App;\n\n```\n\nsrc/index.css:\n```\n@tailwind base;\n@tailwind components;\n@tailwind utilities;\n\n```\n\nsrc/main.tsx:\n```\nimport { StrictMode } from 'react';\nimport { createRoot } from 'react-dom/client';\nimport App from './App.tsx';\nimport './index.css';\n\ncreateRoot(document.getElementById('root')!).render(\n  <StrictMode>\n    <App />\n  </StrictMode>\n);\n\n```\n\nsrc/vite-env.d.ts:\n```\n/// <reference types=\"vite/client\" />\n\n```\n\ntailwind.config.js:\n```\n/** @type {import('tailwindcss').Config} */\nexport default {\n  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],\n  theme: {\n    extend: {},\n  },\n  plugins: [],\n};\n\n```\n\ntsconfig.app.json:\n```\n{\n  \"compilerOptions\": {\n    \"target\": \"ES2020\",\n    \"useDefineForClassFields\": true,\n    \"lib\": [\"ES2020\", \"DOM\", \"DOM.Iterable\"],\n    \"module\": \"ESNext\",\n    \"skipLibCheck\": true,\n\n    /* Bundler mode */\n    \"moduleResolution\": \"bundler\",\n    \"allowImportingTsExtensions\": true,\n    \"isolatedModules\": true,\n    \"moduleDetection\": \"force\",\n    \"noEmit\": true,\n    \"jsx\": \"react-jsx\",\n\n    /* Linting */\n    \"strict\": true,\n    \"noUnusedLocals\": true,\n    \"noUnusedParameters\": true,\n    \"noFallthroughCasesInSwitch\": true\n  },\n  \"include\": [\"src\"]\n}\n\n```\n\ntsconfig.json:\n```\n{\n  \"files\": [],\n  \"references\": [\n    { \"path\": \"./tsconfig.app.json\" },\n    { \"path\": \"./tsconfig.node.json\" }\n  ]\n}\n\n```\n\ntsconfig.node.json:\n```\n{\n  \"compilerOptions\": {\n    \"target\": \"ES2022\",\n    \"lib\": [\"ES2023\"],\n    \"module\": \"ESNext\",\n    \"skipLibCheck\": true,\n\n    /* Bundler mode */\n    \"moduleResolution\": \"bundler\",\n    \"allowImportingTsExtensions\": true,\n    \"isolatedModules\": true,\n    \"moduleDetection\": \"force\",\n    \"noEmit\": true,\n\n    /* Linting */\n    \"strict\": true,\n    \"noUnusedLocals\": true,\n    \"noUnusedParameters\": true,\n    \"noFallthroughCasesInSwitch\": true\n  },\n  \"include\": [\"vite.config.ts\"]\n}\n\n```\n\nvite.config.ts:\n```\nimport { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\n\n// https://vitejs.dev/config/\nexport default defineConfig({\n  plugins: [react()],\n  optimizeDeps: {\n    exclude: ['lucide-react'],\n  },\n});\n\n```\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n  - .bolt/prompt",
//         },
//         {
//           role: "user",
//           content: "For all designs I ask you to make, have them be beautiful, not cookie cutter. Make webpages that are fully featured and worthy for production.\n\nBy default, this template supports JSX syntax with Tailwind CSS classes, React hooks, and Lucide React for icons. Do not install other packages for UI themes, icons, etc unless absolutely necessary or I request them.\n\nUse icons from lucide-react for logos.",
//         },
//         {
//             role: "user",
//             content: "Create a TODO application\n\n<-- M391YLV6GngX3Myc2iwMX9lI -->\n\n<-- nwALEkrNSi94GUCOHmx2oDnY -->\n\n### Additional Context ###\n\n<bolt_running_commands>\n</bolt_running_commands>\n\nFile Changes:\n\nHere is a list of all files that have been modified since the start of the conversation.\nThis information serves as the true contents of these files!\n\nThe contents include either the full file contents or a diff (when changes are smaller and localized).\n\nUse it to:\n - Understand the latest file modifications\n - Ensure your suggestions build upon the most recent version of the files\n - Make informed decisions about changes\n - Ensure suggestions are compatible with existing code\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - /home/project/.bolt/config.json",
//           },
//       ],
//     }),
//   });

//   if (!response.ok || !response.body) {
//     console.error(`Error ${response.status}: ${response.statusText}`);
//     const errorText = await response.text();
//     console.error(errorText);
//     return;
//   }

//   console.log("Streaming response from GROQ:\n");

//   let buffer = "";

//   const body = response.body as Readable;

//   for await (const chunk of body) {
//     buffer += chunk.toString("utf-8");

//     const lines = buffer.split("\n").filter(line => line.trim() !== "");

//     for (const line of lines) {
//       if (line.startsWith("data: ")) {
//         const jsonStr = line.replace(/^data:\s*/, "");
//         if (jsonStr === "[DONE]") {
//           console.log("\n[Stream complete]");
//           body.destroy();
//           return;
//         }

//         try {
//           const parsed = JSON.parse(jsonStr);
//           const content = parsed.choices?.[0]?.delta?.content;
//           if (content) {
//             await new Promise(resolve => setTimeout(resolve, 50)); // ⏱️ Add delay here
//             process.stdout.write(content);
//           }
//         } catch (err) {
//           console.error("Error parsing JSON chunk:", err);
//         }
//       }
//     }

//     buffer = lines[lines.length - 1]?.endsWith("}") ? "" : lines[lines.length - 1];
//   }

//   console.log("\n[Stream ended]");
// }

// main();