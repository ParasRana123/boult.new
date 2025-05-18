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
} from '../types';
import { generateMockProject } from '../utils/mockData';
import { BACKEND_URL } from '../config';
import axios from 'axios';

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
  const [selectedFile, setSelectedFile] = useState<WebsiteFile | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [steps, setSteps] = useState<Step[]>([]);

  const createProject = async (prompt: string) => {
    try {
      const newProject = generateMockProject(prompt);

      // Step 1: Call /template to classify the prompt
      const templateResponse = await axios.post(`${BACKEND_URL}/template`, {
        prompt: prompt.trim(),
      });
      const { prompts, uiPrompts } = templateResponse.data;

      // Step 2: Use prompts + user prompt to get actual steps
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

      const generatedSteps: Step[] = stepsResponse.data.steps || [];

      // Update state
      setProject(newProject);
      setSteps(generatedSteps);
      setCurrentStep(1);

      if (newProject.rootFolder.files.length > 0) {
        setSelectedFile(newProject.rootFolder.files[0]);
      }
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