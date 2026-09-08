import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
import { AlertCircle, RefreshCw, Send, Sparkles, ArrowLeft, Terminal, Clock } from 'lucide-react';

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
  const navigate = useNavigate();
  const { prompt } = (location.state as { prompt: string }) || { prompt: "React application" };
  const [userPrompt, setPrompt] = useState("");
  const [llmMessages, setLlmMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [isWritingCode, setIsWritingCode] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
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

  // Rate-limit auto-retry countdown timer
  useEffect(() => {
    if (countdown === null) return;

    if (countdown <= 0) {
      setCountdown(null);
      setErrorMessage(null);
      if (llmMessages.length > 0) {
        executeChatRequest(llmMessages, allCompletedStepsRef.current);
      }
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(prev => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, llmMessages]);

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
   */
  const executeChatRequest = async (
    messagesToSend: { role: string; content: string }[],
    baseSteps: Step[] = []
  ) => {
    setLoading(true);
    setIsWritingCode(true);
    setErrorMessage(null);
    setCountdown(null);
    setStatusMessage("Connecting to Gemini streaming pool...");
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
        const errJson = await response.json().catch(() => null);
        if (response.status === 429 || errJson?.isRateLimit) {
          const waitTime = errJson?.retryDelay || 50;
          setCountdown(waitTime);
          setStatusMessage(`Rate limit reached. Auto-resuming in ${waitTime}s...`);
          setErrorMessage(`Gemini API free tier quota limit reached. Auto-resuming in ${waitTime} seconds...`);
          return;
        }
        throw new Error(errJson?.error || `Server returned ${response.status}: ${response.statusText}`);
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
              if (parsed.isRateLimit) {
                const waitTime = parsed.retryDelay || 50;
                setCountdown(waitTime);
                setStatusMessage(`Rate limit reached. Auto-resuming in ${waitTime}s...`);
                setErrorMessage(parsed.error);
                return;
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

      let promptsData: string[] = [];
      let uiPromptsData: string[] = [];

      try {
        const response = await axios.post(`${BACKEND_URL}/template`, {
          prompt: (prompt || "React application").trim(),
        });
        promptsData = response.data?.prompts || [];
        uiPromptsData = response.data?.uiPrompts || [];
      } catch (templateErr) {
        console.warn("Backend /template endpoint error, using default scaffold:", templateErr);
      }

      setTemplateSet(true);

      // 1. Animate template steps smoothly step-by-step
      let animatedBaseSteps: Step[] = [];
      if (uiPromptsData.length > 0) {
        const rawTemplateSteps = parseXml(uiPromptsData[0], true);
        animatedBaseSteps = await playSequentialSteps(rawTemplateSteps, []);
      }
      allCompletedStepsRef.current = animatedBaseSteps;

      // 2. Request AI custom code with true real-time token streaming
      const initialMessages = [...promptsData, prompt].filter(Boolean).map(content => ({
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
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col antialiased selection:bg-purple-900 selection:text-purple-200">
      {/* Top Navigation Header */}
      <header className="bg-gray-900/90 backdrop-blur-md border-b border-gray-800 px-6 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-750 text-gray-400 hover:text-gray-200 transition-colors border border-gray-700/60"
            title="Back to home"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center shadow-md shadow-purple-900/30">
              <Terminal className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold bg-gradient-to-r from-purple-300 via-indigo-200 to-white bg-clip-text text-transparent">
                  Boult.new
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-purple-950 text-purple-300 border border-purple-800/60">
                  v2.0
                </span>
              </div>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 pl-4 border-l border-gray-800">
            <span className="text-xs text-gray-500 font-mono">Prompt:</span>
            <span className="text-xs text-gray-300 bg-gray-800/80 px-2.5 py-1 rounded-md border border-gray-700/60 max-w-md truncate">
              {prompt}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isWritingCode && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/80 border border-purple-500/60 text-purple-200 text-xs font-mono shadow-md shadow-purple-950/40">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
              </span>
              <span>AI Streaming Active</span>
            </div>
          )}
        </div>
      </header>

      {/* Auto-retry Countdown Banner */}
      {countdown !== null && (
        <div className="bg-gradient-to-r from-amber-950 via-amber-900/90 to-amber-950 border-b border-amber-600/70 px-6 py-2.5 flex items-center justify-between text-amber-100 text-xs shadow-lg animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-amber-400 animate-spin flex-shrink-0" />
            <span>
              Gemini free tier quota limit reached. Auto-resuming generation in <strong className="text-amber-300 text-sm font-mono">{countdown}s</strong>...
            </span>
          </div>
          <button
            onClick={() => {
              setCountdown(null);
              if (llmMessages.length > 0) {
                executeChatRequest(llmMessages, allCompletedStepsRef.current);
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-medium transition-colors shadow-sm active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry Now
          </button>
        </div>
      )}

      {/* Error notification banner if API limit or network failure */}
      {errorMessage && countdown === null && (
        <div className="bg-red-950/90 border-b border-red-800/80 px-6 py-2.5 flex items-center justify-between text-red-200 text-xs">
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
            className="flex items-center gap-1.5 px-3 py-1 bg-red-800 hover:bg-red-700 text-white rounded text-xs font-medium transition-colors shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      )}

      {/* Main Workspace Layout */}
      <div className="flex-1 overflow-hidden p-5">
        <div className="h-full grid grid-cols-12 gap-5">
          {/* Left Column: Build Steps & Prompt Box */}
          <div className="col-span-12 lg:col-span-3 flex flex-col h-full overflow-hidden space-y-4">
            <div className="flex-1 min-h-0">
              <StepsList
                steps={steps}
                currentStep={currentStep}
                onStepClick={handleStepClick}
              />
            </div>

            {/* Bottom Status / Live Activity Widget */}
            {(loading || statusMessage || isWritingCode) && (
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-purple-950/50 via-gray-900/90 to-purple-950/50 p-3 border border-purple-500/30 shadow-lg shadow-purple-950/40">
                <div className="flex items-center gap-3">
                  <div className="relative flex items-center justify-center w-6 h-6 rounded-lg bg-purple-900/80 border border-purple-500/40 flex-shrink-0">
                    <Loader size="xs" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-purple-400 font-semibold">
                        {isWritingCode ? "Live Streaming" : "Initializing"}
                      </span>
                      <span className="flex h-1.5 w-1.5 rounded-full bg-purple-400 animate-ping" />
                    </div>
                    <p className="text-xs font-mono text-gray-200 truncate mt-0.5 font-medium">
                      {statusMessage || "Writing project code..."}
                    </p>
                  </div>
                </div>
                {/* Progress bar shimmer */}
                <div className="mt-2.5 w-full bg-gray-800/80 h-1 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-purple-500 via-indigo-400 to-purple-500 rounded-full animate-pulse w-full" />
                </div>
              </div>
            )}

            {/* Follow-up Prompt Box */}
            {!loading && !isWritingCode && templateSet && (
              <div className="rounded-xl bg-gray-900 border border-gray-800 p-2.5 shadow-md focus-within:border-purple-500/60 focus-within:ring-1 focus-within:ring-purple-500/30 transition-all">
                <textarea
                  value={userPrompt}
                  placeholder="Ask follow-up changes or add new features..."
                  onChange={e => setPrompt(e.target.value)}
                  onKeyDown={async e => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      if (!userPrompt.trim() || loading || isWritingCode) return;
                      const newMessage = {
                        role: 'user' as const,
                        content: userPrompt.trim(),
                      };
                      setPrompt('');
                      await executeChatRequest([...llmMessages, newMessage], steps);
                    }
                  }}
                  className="p-2 w-full bg-transparent text-gray-100 placeholder-gray-500 text-xs focus:outline-none resize-none"
                  rows={2}
                />
                <div className="flex items-center justify-between pt-2 border-t border-gray-800/80">
                  <span className="text-[10px] text-gray-500 font-mono">Ctrl+Enter to send</span>
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
                    className="flex items-center gap-1.5 px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium text-xs shadow-md shadow-purple-900/40 transition-all active:scale-95"
                  >
                    <Send className="w-3 h-3" />
                    Send
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Middle Column: File Explorer */}
          <div className="col-span-12 lg:col-span-3 h-full overflow-hidden">
            <FileExplorer 
              files={files} 
              selectedFile={selectedFile}
              onFileSelect={(file) => {
                setSelectedFile(file);
                setActiveTab('code');
              }} 
            />
          </div>

          {/* Right Column: Code Editor & Live Preview */}
          <div className="col-span-12 lg:col-span-6 bg-gray-900 rounded-xl shadow-xl p-4 border border-gray-800 h-full flex flex-col overflow-hidden">
            <TabView activeTab={activeTab} onTabChange={setActiveTab} />
            <div className="flex-1 min-h-0">
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