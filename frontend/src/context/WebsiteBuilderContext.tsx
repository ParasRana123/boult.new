import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
} from 'react';

import {
  WebsiteProject,
  WebsiteFile,
  Step,
  WebsiteBuilderContextType,
  WebsiteFolder,
  StepType,
} from '../types';

import { generateMockProject } from '../utils/mockData';
import { BACKEND_URL } from '../config';
import axios from 'axios';
import { parseXml } from '../steps';
import { useWebContainer } from '../hooks/useWebContainer';

const WebsiteBuilderContext = createContext<WebsiteBuilderContextType | undefined>(undefined);

export const useWebsiteBuilder = () => {
  const context = useContext(WebsiteBuilderContext);
  if (context === undefined) {
    throw new Error('useWebsiteBuilder must be used within a WebsiteBuilderProvider');
  }
  return context;
};

interface WebsiteBuilderProviderProps {
  children: ReactNode;
}

export const WebsiteBuilderProvider: React.FC<WebsiteBuilderProviderProps> = ({ children }) => {
  const [project, setProject] = useState<WebsiteProject | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [steps, setSteps] = useState<Step[]>([]);
  const [selectedFile, setSelectedFile] = useState<WebsiteFile | null>(null);
  const [files, setFiles] = useState<WebsiteFile[]>([]);
  const webcontainer = useWebContainer();

  // Sync root folder whenever files change
  useEffect(() => {
    if (!project) return;

    const rootFolder: WebsiteFolder = {
      ...project.rootFolder,
      files,
    };

    setProject({ ...project, rootFolder });
  }, [files]);

  // Step execution: add LLM-generated files into the folder structure
  useEffect(() => {
    const pendingSteps = steps.filter(({ status }) => status === 'pending');
    if (!pendingSteps.length || !project) return;

    const updatedRoot: WebsiteFolder = {
      ...project.rootFolder,
      files: [],
      folders: [],
    };

    const addToFolder = (
      folder: WebsiteFolder,
      pathParts: string[],
      fullPath: string,
      code: string
    ) => {
      const [current, ...rest] = pathParts;
      const currentPath = `${folder.path}/${current}`;

      if (rest.length === 0) {
        const existingFile = folder.files.find(f => f.path === fullPath);
        if (existingFile) {
          existingFile.content = code;
        } else {
          folder.files.push({
            name: current,
            path: fullPath,
            content: code,
            language: 'typescript',
          });
        }
      } else {
        let subFolder = folder.folders.find(f => f.path === currentPath);
        if (!subFolder) {
          subFolder = {
            name: current,
            path: currentPath,
            files: [],
            folders: [],
          };
          folder.folders.push(subFolder);
        }
        addToFolder(subFolder, rest, fullPath, code);
      }
    };

    pendingSteps.forEach(step => {
      if (step?.type === StepType.CreateFile && step.path && step.code) {
        const pathParts = step.path.split('/').filter(Boolean);
        addToFolder(updatedRoot, pathParts, step.path, step.code);
      }
    });

    setProject(prev => (prev ? { ...prev, rootFolder: updatedRoot } : prev));
    setFiles(updatedRoot.files); 
    setSteps(prev => prev.map(s => (s.status === 'pending' ? { ...s, status: 'completed' } : s)));

    console.log('✅ Final updated file tree:', updatedRoot);
  }, [steps]);

  useEffect(() => {
  if (!webcontainer || !files.length) return;

  const mountStructure: any = {};

  files.forEach(file => {
    const parts = file.path.split('/').filter(Boolean);
    let currentLevel = mountStructure;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;

      if (isLast) {
        currentLevel[part] = {
          file: {
            contents: file.content,
          },
        };
      } else {
        if (!currentLevel[part]) {
          currentLevel[part] = { directory: {} };
        }
        currentLevel = currentLevel[part].directory;
      }
    }
  });

  webcontainer.mount(mountStructure)
    .then(() => {
      console.log('✅ Mounted structure:', mountStructure);
    })
    .catch(err => {
      console.error('❌ Error mounting files:', err);
    });
}, [files, webcontainer]);



  const createProject = async (prompt: string): Promise<void> => {
    try {
      const mock = generateMockProject(prompt);

      // Create empty root folder for new project (no mock files!)
      const newProject: WebsiteProject = {
        name: mock.name,
        rootFolder: {
          ...mock.rootFolder,
          files: [], 
          folders: [], 
        },
      };

      const templateResponse = await axios.post(`${BACKEND_URL}/template`, {
        prompt: prompt.trim(),
      });

      const { prompts, uiPrompts } = templateResponse.data;

      const messages = [
        ...prompts.map((content: string) => ({ role: 'system', content })),
        { role: 'user', content: prompt },
      ];

      const stepsResponse = await axios.post(`${BACKEND_URL}/chat`, {
        messages,
      });

      console.log("Steps Response Data: " , stepsResponse.data);

      const assistantMessage = stepsResponse.data?.choices?.[0]?.message?.content;

      if (!assistantMessage || typeof assistantMessage !== 'string') {
        throw new Error("Invalid assistant message content");
      }

      const parsedStepsFromChat = parseXml(assistantMessage).map((step, index) => ({
  ...step,
  id: index + 1,
  status: 'pending' as const,
}));

const parsedUiSteps = Array.isArray(uiPrompts) && typeof uiPrompts[0] === 'string'
  ? parseXml(uiPrompts[0])
  : [];

const parsedUiStepsWithIds = parsedUiSteps.map((step, index) => ({
  ...step,
  id: parsedStepsFromChat.length + index + 1,
  status: 'pending' as const,
}));

// Combine steps: prefer content from parsedStepsFromChat and metadata from parsedUiSteps
const chatStepsMap = new Map(parsedStepsFromChat.map(step => [step.path, step]));

const combinedSteps = parsedUiSteps.map((uiStep) => {
  const chatStep = chatStepsMap.get(uiStep.path);

  return {
    id: 0, // will assign IDs below
    status: 'pending' as const,
    ...uiStep,           // UI metadata
    ...(chatStep ? {     // Prefer content from chat if available
      code: chatStep.code,
      type: chatStep.type,
    } : {}),
  };
});

// Add chat steps that are missing in UI prompts
const uiPaths = new Set(parsedUiSteps.map(step => step.path));
const missingChatSteps = parsedStepsFromChat
  .filter(chatStep => !uiPaths.has(chatStep.path))
  .map(step => ({
    ...step,
    id: 0,
    status: 'pending' as const,
  }));

// Combine all and assign unique IDs
const allSteps = [...combinedSteps, ...missingChatSteps].map((step, index) => ({
  ...step,
  id: index + 1,
}));

setSteps(allSteps);



setProject(newProject);
setCurrentStep(1);

console.log('🎉 Project created:', newProject);
console.log('📜 Parsed all steps from LLM:', combinedSteps);

    } catch (err) {
      console.error('❌ Error creating project:', err);
    }
  };

  const selectFile = (file: WebsiteFile) => {
    setSelectedFile(file);
  };

  const updateFile = (file: WebsiteFile) => {
    if (!project) return;

    const updateFilesRecursively = (folder: WebsiteFolder): WebsiteFolder => {
      const updatedFiles = folder.files.map(f => f.path === file.path ? file : f);
      const updatedFolders = folder.folders.map(updateFilesRecursively);

      return { ...folder, files: updatedFiles, folders: updatedFolders };
    };

    const updatedProject = {
      ...project,
      rootFolder: updateFilesRecursively(project.rootFolder),
    };

    setProject(updatedProject);
    setFiles(updatedProject.rootFolder.files);
    setSelectedFile(file);
  };

  const executeStep = (stepId: number) => {
    setSteps(prevSteps =>
      prevSteps.map(step => {
        if (step.id === stepId) {
          return { ...step, status: 'completed' };
        } else if (step.id === stepId + 1) {
          return { ...step, status: 'in-progress' };
        }
        return step;
      })
    );

    setCurrentStep(stepId + 1);
  };

  const value: WebsiteBuilderContextType = {
    project,
    currentStep,
    steps,
    selectedFile,
    createProject,
    selectFile,
    updateFile,
    executeStep,
  };

  return (
    <WebsiteBuilderContext.Provider value={value}>
      {children}
    </WebsiteBuilderContext.Provider>
  );
}