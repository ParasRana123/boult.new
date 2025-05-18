import React, { createContext, useState, useContext, ReactNode } from 'react';
import { WebsiteProject, WebsiteFile, Step, WebsiteBuilderContextType } from '../types';
import { generateMockProject } from '../utils/mockData';

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

  const createProject = (prompt: string) => {
    // For this demo, we'll use mock data
    const newProject = generateMockProject(prompt);
    
    const generatedSteps: Step[] = [];
    
    setProject(newProject);
    setSteps(generatedSteps);
    setCurrentStep(1);
    
    // Select first file automatically
    if (newProject.rootFolder.files.length > 0) {
      setSelectedFile(newProject.rootFolder.files[0]);
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
      
      const updatedFolders = folder.folders.map(f => updateFilesRecursively(f));
      
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