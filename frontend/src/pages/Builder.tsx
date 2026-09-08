import React, { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { StepsList } from '../components/StepsList';
import { FileExplorer } from '../components/FileExplorer';
import { TabView } from '../components/TabView';
import { CodeEditor } from '../components/CodeEditor';
import { PreviewFrame } from '../components/PreviewFrame';
import { Step, FileItem, StepType } from '../types';
import axios from 'axios';
import { BACKEND_URL } from '../config';
import { parseXml } from '../steps';
import { useWebContainer } from '../hooks/useWebContainer';
import { Loader } from '../components/Loader';
import { AlertCircle, RefreshCw } from 'lucide-react';

function applyStepsToFiles(existingFiles: FileItem[], stepsToApply: Step[]): FileItem[] {
  const rootFiles: FileItem[] = JSON.parse(JSON.stringify(existingFiles));

  for (const step of stepsToApply) {
    if (step.type === StepType.CreateFile && step.path) {
      const normalizedPath = step.path.startsWith('/') ? step.path.slice(1) : step.path;
      const parts = normalizedPath.split('/');
      let currentLevel = rootFiles;
      let currentPath = '';

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        currentPath = currentPath ? `${currentPath}/${part}` : `/${part}`;
        const isFile = i === parts.length - 1;

        if (isFile) {
          const existingFile = currentLevel.find(item => item.name === part && item.type === 'file');
          if (existingFile) {
            existingFile.content = step.code || '';
          } else {
            currentLevel.push({
              name: part,
              type: 'file',
              path: currentPath,
              content: step.code || '',
            });
          }
        } else {
          let folder = currentLevel.find(item => item.name === part && item.type === 'folder');
          if (!folder) {
            folder = {
              name: part,
              type: 'folder',
              path: currentPath,
              children: [],
            };
            currentLevel.push(folder);
          }
          if (!folder.children) {
            folder.children = [];
          }
          currentLevel = folder.children;
        }
      }
    }
  }

  return rootFiles;
}

function findFileByPath(files: FileItem[], path: string): FileItem | null {
  for (const file of files) {
    if (file.type === 'file' && file.path === path) return file;
    if (file.type === 'folder' && file.children) {
      const found = findFileByPath(file.children, path);
      if (found) return found;
    }
  }
  return null;
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function Builder() {
  const location = useLocation();
  const { prompt } = location.state as { prompt: string };
  const [userPrompt, setPrompt] = useState("");
  const [llmMessages, setLlmMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [isWritingCode, setIsWritingCode] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [templateSet, setTemplateSet] = useState(false);
  const webcontainer = useWebContainer();

  const [currentStep, setCurrentStep] = useState(1);
  const [activeTab, setActiveTab] = useState<'code' | 'preview'>('code');
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const selectedFilePathRef = useRef<string | null>(null);

  const [steps, setSteps] = useState<Step[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const allCompletedStepsRef = useRef<Step[]>([]);

  // Keep track of active file path
  useEffect(() => {
    selectedFilePathRef.current = selectedFile ? selectedFile.path : null;
  }, [selectedFile]);

  // Mount structure to WebContainer when files change
  useEffect(() => {
    if (!files.length || !webcontainer) return;

    const createMountStructure = (fileList: FileItem[]): Record<string, any> => {
      const mountStructure: Record<string, any> = {};

      const processFile = (file: FileItem, isRootFolder: boolean) => {
        if (file.type === 'folder') {
          mountStructure[file.name] = {
            directory: file.children
              ? Object.fromEntries(file.children.map(child => [child.name, processFile(child, false)]))
              : {},
          };
        } else if (file.type === 'file') {
          if (isRootFolder) {
            mountStructure[file.name] = {
              file: {
                contents: file.content || '',
              },
            };
          } else {
            return {
              file: {
                contents: file.content || '',
              },
            };
          }
        }

        return mountStructure[file.name];
      };

      fileList.forEach(file => processFile(file, true));
      return mountStructure;
    };

    const mountStructure = createMountStructure(files);
    webcontainer.mount(mountStructure);
  }, [files, webcontainer]);

  // Handle clicking a step in the StepsList to view its file
  const handleStepClick = (stepId: number) => {
    setCurrentStep(stepId);
    const clickedStep = steps.find(s => s.id === stepId);
    if (clickedStep && clickedStep.path) {
      const normalizedPath = clickedStep.path.startsWith('/') ? clickedStep.path : `/${clickedStep.path}`;
      const found = findFileByPath(files, normalizedPath);
      if (found) {
        setSelectedFile(found);
        setActiveTab('code');
      }
    }
  };

  /**
   * Typewriter playback engine for starter template files
   */
  const playSequentialSteps = async (
    incomingSteps: Step[],
    baseSteps: Step[] = []
  ): Promise<Step[]> => {
    setIsWritingCode(true);
    let allSteps: Step[] = [...baseSteps];
    let currentFiles: FileItem[] = applyStepsToFiles([], baseSteps);

    // Filter out root "Project Files" folder if base steps already exist
    const stepsToAnimate = incomingSteps.filter(s => {
      if (s.type === StepType.CreateFolder && s.title === 'Project Files' && baseSteps.length > 0) {
        return false;
      }
      return true;
    });

    for (let i = 0; i < stepsToAnimate.length; i++) {
      const rawStep = stepsToAnimate[i];
      const stepId = allSteps.length + 1;

      setCurrentStep(stepId);
      setActiveTab('code');

      const inProgressStep: Step = {
        ...rawStep,
        id: stepId,
        status: 'in-progress',
        code: '',
      };

      allSteps.push(inProgressStep);
      setSteps([...allSteps]);

      if (rawStep.type === StepType.CreateFile && rawStep.path) {
        const normalizedPath = rawStep.path.startsWith('/') ? rawStep.path : `/${rawStep.path}`;
        const fullCode = rawStep.code || '';

        const totalLen = fullCode.length;
        const stepDelay = Math.min(20, Math.max(5, Math.floor(350 / Math.max(1, totalLen / 35))));
        const chunkSize = Math.max(15, Math.floor(totalLen / 25));

        for (let pos = 0; pos < totalLen; pos += chunkSize) {
          const partialCode = fullCode.slice(0, pos + chunkSize);
          inProgressStep.code = partialCode;

          currentFiles = applyStepsToFiles([], allSteps);
          setFiles([...currentFiles]);

          const activeFile = findFileByPath(currentFiles, normalizedPath);
          if (activeFile) {
            setSelectedFile(activeFile);
          }
          await sleep(stepDelay);
        }

        inProgressStep.code = fullCode;
        currentFiles = applyStepsToFiles([], allSteps);
        setFiles([...currentFiles]);

        const finalFile = findFileByPath(currentFiles, normalizedPath);
        if (finalFile) {
          setSelectedFile(finalFile);
        }
      } else {
        await sleep(60);
      }

      inProgressStep.status = 'completed';
      setSteps([...allSteps]);
      allCompletedStepsRef.current = [...allSteps];
      await sleep(80);
    }

    setIsWritingCode(false);
    return allSteps;
  };

  /**
   * Real-Time Streaming Chat Request Engine
   * Receives tokens directly from SSE stream, parses progressive XML steps,
   * live-updates the CodeEditor character-by-character, marks active steps with spinners,
   * and auto-advances to each file as it streams in from Gemini.
   */
  const executeChatRequest = async (
    messagesToSend: { role: string; content: string }[],
    baseSteps: Step[] = [],
    retryCount: number = 0
  ) => {
    setLoading(true);
    setIsWritingCode(true);
    setErrorMessage(null);
    setStatusMessage("Connecting to Gemini and generating project code...");
    setActiveTab('code');

    try {
      const response = await fetch(`${BACKEND_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({
          messages: messagesToSend,
          stream: true,
        }),
      });

      if (!response.ok) {
        if (response.status === 429 && retryCount < 3) {
          const waitTime = (retryCount + 1) * 3;
          setStatusMessage(`Gemini rate limit reached. Retrying automatically in ${waitTime}s...`);
          await sleep(waitTime * 1000);
          return await executeChatRequest(messagesToSend, baseSteps, retryCount + 1);
        }
        const errText = await response.text();
        throw new Error(`Server returned ${response.status}: ${errText}`);
      }

      if (!response.body) {
        throw new Error("No response stream available from backend");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';
      let buffer = '';
      let lastActivePath = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const dataStr = trimmed.slice(6);
          if (dataStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.error) {
              if (parsed.isRateLimit && retryCount < 3) {
                const waitTime = (retryCount + 1) * 3;
                setStatusMessage(`Rate limit encountered. Retrying in ${waitTime}s...`);
                await sleep(waitTime * 1000);
                return await executeChatRequest(messagesToSend, baseSteps, retryCount + 1);
              }
              setErrorMessage(parsed.error);
              continue;
            }

            const chunk = parsed.chunk || parsed.choices?.[0]?.delta?.content || '';
            if (chunk) {
              accumulatedText += chunk;

              // Parse live steps in progress
              const liveParsedSteps = parseXml(accumulatedText, false);

              if (liveParsedSteps.length > 0) {
                // Filter out root project folder step if base steps exist
                const cleanGenerated = liveParsedSteps.filter(s => {
                  if (s.type === StepType.CreateFolder && (s.title === 'Project Files' || s.title?.includes('Files')) && baseSteps.length > 0) {
                    return false;
                  }
                  return true;
                });

                // Renumber newly generated steps seamlessly following base steps
                const mappedGenerated: Step[] = cleanGenerated.map((s, idx) => ({
                  ...s,
                  id: baseSteps.length + idx + 1,
                }));

                const combinedSteps: Step[] = [...baseSteps, ...mappedGenerated];
                setSteps(combinedSteps);

                // Update file hierarchy with live partial code
                const updatedFiles = applyStepsToFiles([], combinedSteps);
                setFiles(updatedFiles);

                // Locate currently active step
                const currentActiveStep = mappedGenerated[mappedGenerated.length - 1];
                if (currentActiveStep) {
                  setCurrentStep(currentActiveStep.id);

                  if (currentActiveStep.path) {
                    const normalizedPath = currentActiveStep.path.startsWith('/')
                      ? currentActiveStep.path
                      : `/${currentActiveStep.path}`;

                    if (normalizedPath !== lastActivePath) {
                      lastActivePath = normalizedPath;
                      setStatusMessage(`Writing ${currentActiveStep.path}...`);
                    }

                    const activeFile = findFileByPath(updatedFiles, normalizedPath);
                    if (activeFile) {
                      setSelectedFile(activeFile);
                    }
                  }
                }
              }
            }
          } catch (e) {
            // Partial JSON chunk in stream buffer
          }
        }
      }

      // Stream completed: Finalize all steps
      const finalGeneratedSteps = parseXml(accumulatedText, true);
      const cleanFinal = finalGeneratedSteps.filter(s => {
        if (s.type === StepType.CreateFolder && (s.title === 'Project Files' || s.title?.includes('Files')) && baseSteps.length > 0) {
          return false;
        }
        return true;
      });

      const finalizedMapped: Step[] = cleanFinal.map((s, idx) => ({
        ...s,
        id: baseSteps.length + idx + 1,
        status: 'completed' as const,
      }));

      const finalAllSteps: Step[] = [...baseSteps, ...finalizedMapped];
      setSteps(finalAllSteps);
      allCompletedStepsRef.current = finalAllSteps;

      const finalFiles = applyStepsToFiles([], finalAllSteps);
      setFiles(finalFiles);

      // Keep last edited file selected or select first file
      if (lastActivePath) {
        const lastFile = findFileByPath(finalFiles, lastActivePath);
        if (lastFile) setSelectedFile(lastFile);
      }

      setLlmMessages(prev => [
        ...prev,
        ...messagesToSend.filter(m => !prev.some(p => p.content === m.content)),
        { role: 'assistant', content: accumulatedText },
      ]);

      setStatusMessage("");
    } catch (err: any) {
      console.error('Error during streaming chat:', err);
      setErrorMessage(err?.message || "An unexpected error occurred while generating code.");
    } finally {
      setIsWritingCode(false);
      setLoading(false);
    }
  };

  async function init() {
    try {
      setLoading(true);
      setStatusMessage("Analyzing prompt and initializing project scaffold...");

      const response = await axios.post(`${BACKEND_URL}/template`, {
        prompt: prompt.trim(),
      });
      setTemplateSet(true);

      const { prompts, uiPrompts } = response.data;

      // 1. Animate template steps smoothly step-by-step
      const rawTemplateSteps = parseXml(uiPrompts[0], true);
      const animatedBaseSteps = await playSequentialSteps(rawTemplateSteps, []);
      allCompletedStepsRef.current = animatedBaseSteps;

      // 2. Request AI custom code with true real-time token streaming
      const initialMessages = [...prompts, prompt].map(content => ({
        role: 'user',
        content,
      }));

      setLlmMessages(initialMessages.map(m => ({ role: 'user', content: m.content })));
      await executeChatRequest(initialMessages, animatedBaseSteps);
    } catch (err: any) {
      console.error('Initialization error:', err);
      setErrorMessage(err?.message || "Failed to initialize project template.");
      setLoading(false);
      setIsWritingCode(false);
    }
  }

  useEffect(() => {
    init();
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-100">Website Builder</h1>
          <p className="text-sm text-gray-400 mt-1">Prompt: {prompt}</p>
        </div>
        {isWritingCode && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-900/50 border border-purple-500/60 text-purple-200 text-xs font-mono shadow-lg animate-pulse">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-ping" />
            <span>AI writing files & code live in real-time...</span>
          </div>
        )}
      </header>

      {/* Error notification banner if API limit or network failure */}
      {errorMessage && (
        <div className="bg-red-950/80 border-b border-red-800/80 px-6 py-2.5 flex items-center justify-between text-red-200 text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => {
              if (llmMessages.length > 0) {
                executeChatRequest(llmMessages, allCompletedStepsRef.current);
              } else {
                init();
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1 bg-red-800 hover:bg-red-700 text-white rounded text-xs font-medium transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        <div className="h-full grid grid-cols-4 gap-6 p-6">
          <div className="col-span-1 space-y-6 overflow-auto">
            <div className="flex flex-col h-full">
              <div className="max-h-[72vh] overflow-y-auto pr-1">
                <StepsList
                  steps={steps}
                  currentStep={currentStep}
                  onStepClick={handleStepClick}
                />
              </div>

              <div className="mt-4">
                {(loading || statusMessage) && (
                  <div className="flex items-center gap-2 mb-2 text-xs text-purple-300 font-mono bg-purple-950/40 p-2 rounded border border-purple-900/50">
                    <Loader />
                    <span className="truncate">{statusMessage || "Processing..."}</span>
                  </div>
                )}
                {!loading && !isWritingCode && templateSet && (
                  <div className="flex gap-2">
                    <textarea
                      value={userPrompt}
                      placeholder="Ask follow-up changes or add features..."
                      onChange={e => setPrompt(e.target.value)}
                      className="p-2 w-full bg-gray-800 text-gray-100 border border-gray-700 rounded-md focus:outline-none focus:border-purple-500 text-sm placeholder-gray-500"
                      rows={2}
                    />
                    <button
                      onClick={async () => {
                        if (!userPrompt.trim() || loading || isWritingCode) return;
                        const newMessage = {
                          role: 'user' as const,
                          content: userPrompt.trim(),
                        };
                        setPrompt('');

                        await executeChatRequest([...llmMessages, newMessage], steps);
                      }}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-medium px-4 rounded-md transition-colors text-sm shadow-md"
                    >
                      Send
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="col-span-1">
            <FileExplorer 
              files={files} 
              selectedFile={selectedFile}
              onFileSelect={(file) => {
                setSelectedFile(file);
                setActiveTab('code');
              }} 
            />
          </div>

          <div className="col-span-2 bg-gray-900 rounded-lg shadow-lg p-4 h-[calc(100vh-8rem)]">
            <TabView activeTab={activeTab} onTabChange={setActiveTab} />
            <div className="h-[calc(100%-4rem)]">
              {activeTab === 'code' ? (
                <CodeEditor file={selectedFile} isWriting={isWritingCode} />
              ) : (
                <PreviewFrame webContainer={webcontainer} files={files} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}