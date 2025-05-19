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

  useEffect(() => {
    let originalFiles = [...files];
    let updateHappened = false;

    const pendingSteps = steps.filter(({ status }) => status === 'pending');

    pendingSteps.forEach(step => {
      if (step?.type === StepType.CreateFile && step.path && step.code) {
        updateHappened = true;
        console.log('Processing step from LLM:', step);

        let parsedPath = step.path?.split('/') ?? [];
        let currentFileStructure = [...originalFiles];
        let finalAnswerRef = currentFileStructure;

        let currentFolder = '';

        while (parsedPath.length) {
          const currentFolderName = parsedPath[0];
          currentFolder = `${currentFolder}/${currentFolderName}`;
          parsedPath = parsedPath.slice(1);

          if (!parsedPath.length) {
            // Final file
            let existingFile = currentFileStructure.find(x => x.path === currentFolder);
            if (!existingFile) {
              currentFileStructure.push({
                name: currentFolderName,
                path: currentFolder,
                content: step.code,
                language: 'typescript',
              });
            } else {
              existingFile.content = step.code;
            }
          } else {
            // Folder
            let existingFolder = currentFileStructure.find(
              x => x.path === currentFolder && 'files' in x
            ) as WebsiteFolder | undefined;

            if (!existingFolder) {
              const newFolder: WebsiteFolder = {
                name: currentFolderName,
                path: currentFolder,
                files: [],
                folders: [],
              };
              currentFileStructure.push(newFolder as any);
            }

            currentFileStructure = (
              currentFileStructure.find(x => x.path === currentFolder && 'files' in x) as WebsiteFolder
            ).files;
          }
        }

        originalFiles = finalAnswerRef;
      }
    });

    if (updateHappened) {
      console.log('Final updated file structure from LLM:', originalFiles);

      setFiles(originalFiles);
      setSteps(prev =>
        prev.map(s => (s.status === 'pending' ? { ...s, status: 'completed' } : s))
      );
    }
  }, [steps, files]);

  const createProject = async (prompt: string): Promise<void> => {
    try {
      const newProject = generateMockProject(prompt);

      const templateResponse = await axios.post(`${BACKEND_URL}/template`, {
        prompt: prompt.trim(),
      });

      const { prompts, uiPrompts } = templateResponse.data;

      const messages = [
        ...prompts.map((content: string) => ({
          role: 'system',
          content,
        })),
        {
          role: 'user',
          content: prompt,
        },
      ];

      const stepsResponse = await axios.post(`${BACKEND_URL}/chat`, {
        messages,
      });

      const parsedSteps =
        Array.isArray(uiPrompts) && typeof uiPrompts[0] === 'string'
          ? parseXml(uiPrompts[0])
          : [];

      const uiPromptsWithIds = parsedSteps.map((step: any, index: number) => ({
        ...step,
        id: index + 1,
        status: 'completed',
      }));

      setProject(newProject);
      setSteps(uiPromptsWithIds);
      setCurrentStep(1);

      if (newProject.rootFolder.files.length > 0) {
        setSelectedFile(newProject.rootFolder.files[0]);
      }

      console.log('Project created:', newProject);
      console.log('Parsed steps from LLM:', uiPromptsWithIds);
    } catch (err) {
      console.error('Error creating project:', err);
    }
  };

  const selectFile = (file: WebsiteFile) => {
    setSelectedFile(file);
  };

  const updateFile = (file: WebsiteFile) => {
    if (!project) return;

    const updateFilesRecursively = (folder: WebsiteFolder): WebsiteFolder => {
      const updatedFiles = folder.files.map(f =>
        f.path === file.path ? file : f
      );

      const updatedFolders = folder.folders.map(f =>
        updateFilesRecursively(f)
      );

      return {
        ...folder,
        files: updatedFiles,
        folders: updatedFolders,
      };
    };

    setProject({
      ...project,
      rootFolder: updateFilesRecursively(project.rootFolder),
    });

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
};