export interface WebsiteFile {
  name: string;
  path: string;
  content: string;
  language: string;
}

export interface WebsiteFolder {
  name: string;
  path: string;
  files: WebsiteFile[];
  folders: WebsiteFolder[];
}

export interface WebsiteProject {
  name: string;
  description: string;
  prompt: string;
  rootFolder: WebsiteFolder;
}

export interface Step {
  id: number;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'error';
}

export interface WebsiteBuilderContextType {
  project: WebsiteProject | null;
  currentStep: number;
  steps: Step[];
  selectedFile: WebsiteFile | null;
  createProject: (prompt: string) => void;
  selectFile: (file: WebsiteFile) => void;
  updateFile: (file: WebsiteFile) => void;
  executeStep: (stepId: number) => void;
}