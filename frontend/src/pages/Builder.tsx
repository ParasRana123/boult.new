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

export function Builder() {
  const location = useLocation();
  const { prompt } = location.state as { prompt: string };
  const [userPrompt, setPrompt] = useState("");
  const [llmMessages, setLlmMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [templateSet, setTemplateSet] = useState(false);
  const webcontainer = useWebContainer();

  const [currentStep, setCurrentStep] = useState(1);
  const [activeTab, setActiveTab] = useState<'code' | 'preview'>('code');
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const selectedFilePathRef = useRef<string | null>(null);

  const [steps, setSteps] = useState<Step[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const initialBaseStepsRef = useRef<Step[]>([]);

  // Update selectedFilePathRef when selectedFile changes
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

  const updateStreamingState = (
    baseSteps: Step[],
    streamedSteps: Step[],
    isComplete: boolean = false
  ) => {
    // Re-index steps to ensure unique sequential IDs
    const combinedSteps: Step[] = [
      ...baseSteps,
      ...streamedSteps.map((s, idx) => ({
        ...s,
        id: baseSteps.length + idx + 1,
      })),
    ];

    setSteps(combinedSteps);

    // Apply file changes progressively
    const updatedFiles = applyStepsToFiles([], combinedSteps);
    setFiles(updatedFiles);

    // Keep active selected file updated with fresh content as it streams
    const activeStreamStep = streamedSteps.find(s => s.status === 'in-progress' && s.path);
    const activePath = activeStreamStep ? (activeStreamStep.path?.startsWith('/') ? activeStreamStep.path : `/${activeStreamStep.path}`) : null;

    if (selectedFilePathRef.current) {
      const current = findFileByPath(updatedFiles, selectedFilePathRef.current);
      if (current) {
        setSelectedFile(current);
      }
    } else if (activePath) {
      const activeFile = findFileByPath(updatedFiles, activePath);
      if (activeFile) {
        setSelectedFile(activeFile);
      }
    } else if (updatedFiles.length > 0 && !selectedFile) {
      // Auto-select first file
      const findFirstFile = (items: FileItem[]): FileItem | null => {
        for (const item of items) {
          if (item.type === 'file') return item;
          if (item.type === 'folder' && item.children) {
            const f = findFirstFile(item.children);
            if (f) return f;
          }
        }
        return null;
      };
      const first = findFirstFile(updatedFiles);
      if (first) setSelectedFile(first);
    }
  };

  const streamChatResponse = async (
    messagesToSend: { role: string; content: string }[],
    baseSteps: Step[] = []
  ) => {
    setLoading(true);

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

      if (!response.ok || !response.body) {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';
      let buffer = '';

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
            const chunk = parsed.chunk || parsed.choices?.[0]?.delta?.content || '';
            if (chunk) {
              accumulatedText += chunk;
              const progressiveSteps = parseXml(accumulatedText, false);
              updateStreamingState(baseSteps, progressiveSteps, false);
            }
          } catch (e) {
            // Partial JSON chunk ignored
          }
        }
      }

      // Finalize full artifact steps
      const finalSteps = parseXml(accumulatedText, true);
      updateStreamingState(baseSteps, finalSteps, true);

      setLlmMessages(prev => [
        ...prev,
        ...messagesToSend.filter(m => !prev.some(p => p.content === m.content)),
        { role: 'assistant', content: accumulatedText },
      ]);
    } catch (err) {
      console.error('Error during streaming chat:', err);
    } finally {
      setLoading(false);
    }
  };

  async function init() {
    try {
      const response = await axios.post(`${BACKEND_URL}/template`, {
        prompt: prompt.trim(),
      });
      setTemplateSet(true);

      const { prompts, uiPrompts } = response.data;

      // Initialize base template steps & files
      const baseSteps = parseXml(uiPrompts[0], true);
      initialBaseStepsRef.current = baseSteps;
      setSteps(baseSteps);

      const baseFiles = applyStepsToFiles([], baseSteps);
      setFiles(baseFiles);

      // Start real-time streaming chat
      const initialMessages = [...prompts, prompt].map(content => ({
        role: 'user',
        content,
      }));

      setLlmMessages(initialMessages.map(m => ({ role: 'user', content: m.content })));
      await streamChatResponse(initialMessages, baseSteps);
    } catch (err) {
      console.error('Initialization error:', err);
      setLoading(false);
    }
  }

  useEffect(() => {
    init();
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-100">Website Builder</h1>
        <p className="text-sm text-gray-400 mt-1">Prompt: {prompt}</p>
      </header>

      <div className="flex-1 overflow-hidden">
        <div className="h-full grid grid-cols-4 gap-6 p-6">
          <div className="col-span-1 space-y-6 overflow-auto">
            <div>
              <div className="max-h-[75vh] overflow-scroll">
                <StepsList
                  steps={steps}
                  currentStep={currentStep}
                  onStepClick={setCurrentStep}
                />
              </div>
              <div>
                <div className="flex flex-col mt-4">
                  {loading && (
                    <div className="flex items-center gap-2 mb-2 text-sm text-purple-400">
                      <Loader />
                      <span>Writing code & files live...</span>
                    </div>
                  )}
                  {!loading && templateSet && (
                    <div className="flex gap-2">
                      <textarea
                        value={userPrompt}
                        placeholder="Ask follow-up changes..."
                        onChange={e => setPrompt(e.target.value)}
                        className="p-2 w-full bg-gray-800 text-gray-100 border border-gray-700 rounded-md focus:outline-none focus:border-purple-500"
                        rows={2}
                      />
                      <button
                        onClick={async () => {
                          if (!userPrompt.trim() || loading) return;
                          const newMessage = {
                            role: 'user',
                            content: userPrompt.trim(),
                          };
                          const promptToSend = userPrompt.trim();
                          setPrompt('');

                          await streamChatResponse([...llmMessages, newMessage], steps);
                        }}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-medium px-4 rounded-md transition-colors"
                      >
                        Send
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-1">
            <FileExplorer files={files} onFileSelect={setSelectedFile} />
          </div>

          <div className="col-span-2 bg-gray-900 rounded-lg shadow-lg p-4 h-[calc(100vh-8rem)]">
            <TabView activeTab={activeTab} onTabChange={setActiveTab} />
            <div className="h-[calc(100%-4rem)]">
              {activeTab === 'code' ? (
                <CodeEditor file={selectedFile} />
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