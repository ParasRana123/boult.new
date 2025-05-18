/* 
Parse the input XML and convert it into steps
Example => Input is:
<boltArtifact id="project-import" title="Project Files">
  <boltAction type="file" filePath="eslint.config.js">
    import js from '@eslint/js';
    import globals from 'globals';
    import reactHooks from 'eslint-plugin-react-hooks';
    import reactRefresh from 'eslint-plugin-react-refresh';
    import tseslint from 'typescript-eslint';
    export default tseslint.config(
      { ignores: ['dist'] },
      {
        extends: [js.configs.recommended, ...tseslint.configs.recommended],
  </boltAction>
  <boltAction type="shell">
          npm run dev
  </boltAction>
</boltArtifact>

The Output should be like:
[{
    title: "Project Files",
    status: "Pending",
} , {
    title: "Create eslint.config.js",
    type: stepType.createFile,
    code: "import js from '@eslint/js';"
} , {
    title: "Run Command",
    type: stepType.runScript,
    code: "npm run dev",
}]

The input can have strings in the middle they can be ignored

*/

import { Step , StepType } from "./types"

export function parseXml(response: string): Step[] {
    const xmlMatch = response.match(/<boltArtifact[^>]*>([\s\S]*?)<\/boltArtifact>/);
    
    if (!xmlMatch) {
      return [];
    }
  
    const xmlContent = xmlMatch[1];
    const steps: Step[] = [];
    let stepId = 1;
  
    const titleMatch = response.match(/title="([^"]*)"/);
    const artifactTitle = titleMatch ? titleMatch[1] : 'Project Files';
  
    steps.push({
      id: stepId++,
      title: artifactTitle,
      description: '',
      type: StepType.CreateFolder,
      status: 'pending'
    });

    const actionRegex = /<boltAction\s+type="([^"]*)"(?:\s+filePath="([^"]*)")?>([\s\S]*?)<\/boltAction>/g;
    
    let match;
    while ((match = actionRegex.exec(xmlContent)) !== null) {
      const [, type, filePath, content] = match;
  
      if (type === 'file') {
        steps.push({
          id: stepId++,
          title: `Create ${filePath || 'file'}`,
          description: '',
          type: StepType.CreateFile,
          status: 'pending',
          code: content.trim(),
          path: filePath
        });
      } else if (type === 'shell') {
        steps.push({
          id: stepId++,
          title: 'Run command',
          description: '',
          type: StepType.RunScript,
          status: 'pending',
          code: content.trim()
        });
      }
    }
  
    return steps;
  }