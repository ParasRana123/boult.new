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
  if (!context) {
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

  useEffect(() => {
    if (!project) return;

    setProject(prev => prev ? { ...prev, rootFolder: { ...prev.rootFolder, files } } : prev);
  }, [files]);

  useEffect(() => {
    if (!steps.length || !project) return;

    const pendingSteps = steps.filter(({ status }) => status === 'pending');
    if (!pendingSteps.length) return;

    const updatedRoot: WebsiteFolder = { ...project.rootFolder, files: [], folders: [] };

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
      if (step.type === StepType.CreateFile && step.path && step.code) {
        const pathParts = step.path.split('/').filter(Boolean);
        addToFolder(updatedRoot, pathParts, step.path, step.code);
      }
    });

    setProject(prev => prev ? { ...prev, rootFolder: updatedRoot } : prev);
    setFiles(updatedRoot.files);
    setSteps(prev => prev.map(s => s.status === 'pending' ? { ...s, status: 'completed' } : s));
  }, [steps]);

  useEffect(() => {
  if (!webcontainer || !project) return;

  const mountStructure: any = {};

  const addFileToMountStructure = (
    structure: any,
    pathParts: string[],
    content: string
  ) => {
    const [current, ...rest] = pathParts;
    if (rest.length === 0) {
      structure[current] = { file: { contents: content } };
    } else {
      if (!structure[current]) structure[current] = { directory: {} };
      addFileToMountStructure(structure[current].directory, rest, content);
    }
  };

  const traverseAndAddFiles = (folder: WebsiteFolder, currentStructure: any = mountStructure) => {
  folder.files.forEach(file => {
    const parts = file.path.split('/').filter(Boolean);
    addFileToMountStructure(currentStructure, parts, file.content);
  });

  folder.folders.forEach(subFolder => {
    const folderName = subFolder.name;
    if (!currentStructure[folderName]) {
      currentStructure[folderName] = { directory: {} };
    }
    traverseAndAddFiles(subFolder, currentStructure[folderName].directory);
  });
};


  traverseAndAddFiles(project.rootFolder);

  webcontainer.mount(mountStructure)
    .then(() => console.log('✅ Mounted structure:', mountStructure))
    .catch(err => console.error('❌ Error mounting files:', err));
}, [project, webcontainer]);


  const createProject = async (prompt: string): Promise<void> => {
    try {
      const mock = generateMockProject(prompt);
      const newProject: WebsiteProject = {
        name: mock.name,
        rootFolder: { ...mock.rootFolder, files: [], folders: [] },
      };

      const templateResponse = await axios.post(`${BACKEND_URL}/template`, { prompt: prompt.trim() });
      const { prompts, uiPrompts } = templateResponse.data;

      const messages = [
        ...prompts.map((content: string) => ({ role: 'system', content })),
        { role: 'user', content: prompt },
      ];

      const stepsResponse = await axios.post(`${BACKEND_URL}/chat`, { messages });
      const assistantMessage = stepsResponse.data?.choices?.[0]?.message?.content;
      if (!assistantMessage || typeof assistantMessage !== 'string') throw new Error("Invalid assistant message content");

      const parsedStepsFromChat = parseXml(assistantMessage).map((step, i) => ({ ...step, id: i + 1, status: 'pending' }));

      const parsedUiSteps = Array.isArray(uiPrompts) && typeof uiPrompts[0] === 'string' ? parseXml(uiPrompts[0]) : [];
      const parsedUiStepsWithIds = parsedUiSteps.map((step, i) => ({ ...step, id: parsedStepsFromChat.length + i + 1, status: 'pending' }));

      const chatStepsMap = new Map(parsedStepsFromChat.map(step => [step.path, step]));

      const combinedSteps = parsedUiSteps.map(uiStep => {
        const chatStep = chatStepsMap.get(uiStep.path);
        return {
          id: 0,
          status: 'pending',
          ...uiStep,
          ...(chatStep ? { code: chatStep.code, type: chatStep.type } : {}),
        };
      });

      const uiPaths = new Set(parsedUiSteps.map(step => step.path));
      const missingChatSteps = parsedStepsFromChat.filter(chatStep => !uiPaths.has(chatStep.path)).map(step => ({ ...step, id: 0, status: 'pending' }));

      const allSteps = [...combinedSteps, ...missingChatSteps].map((step, index) => ({ ...step, id: index + 1 }));

      setSteps(allSteps);
      setProject(newProject);
      setCurrentStep(1);

    } catch (err) {
      console.error('❌ Error creating project:', err);
    }
  };

  const selectFile = (file: WebsiteFile) => setSelectedFile(file);

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
    setSteps(prev => prev.map(step => {
      if (step.id === stepId) return { ...step, status: 'completed' };
      if (step.id === stepId + 1) return { ...step, status: 'in-progress' };
      return step;
    }));
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