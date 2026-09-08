import { Step, StepType } from './types';

/**
 * Parse XML response or stream into steps.
 * Handles both fully completed artifacts and in-progress streaming tokens with any attribute ordering.
 */
export function parseXml(response: string, isStreamingComplete: boolean = false): Step[] {
  if (!response || response.trim() === '') {
    return [];
  }

  // Look for boltArtifact tag (either closed or still streaming)
  const artifactMatch = response.match(/<boltArtifact[^>]*>([\s\S]*)/);
  if (!artifactMatch) {
    return [];
  }

  const afterArtifactOpen = artifactMatch[1];
  // If closed with </boltArtifact>, take content before closing tag
  const artifactEndIndex = afterArtifactOpen.indexOf('</boltArtifact>');
  const xmlContent = artifactEndIndex !== -1 
    ? afterArtifactOpen.slice(0, artifactEndIndex) 
    : afterArtifactOpen;

  const steps: Step[] = [];
  let stepId = 1;

  // Extract artifact title if present
  const titleMatch = response.match(/title="([^"]*)"/);
  const artifactTitle = titleMatch ? titleMatch[1] : 'Project Files';

  const isArtifactClosed = artifactEndIndex !== -1 || isStreamingComplete;

  // Add initial artifact step
  steps.push({
    id: stepId++,
    title: artifactTitle,
    description: isArtifactClosed ? 'Project structure initialized' : 'Creating project structure...',
    type: StepType.CreateFolder,
    status: isArtifactClosed ? 'completed' : 'in-progress',
  });

  // Regular expression to find completed boltAction elements regardless of attribute order
  const completedActionRegex = /<boltAction\s+([^>]+)>([\s\S]*?)<\/boltAction>/g;

  let lastIndex = 0;
  let match;

  while ((match = completedActionRegex.exec(xmlContent)) !== null) {
    const [, attrString, content] = match;
    lastIndex = completedActionRegex.lastIndex;

    const typeMatch = attrString.match(/type="([^"]*)"/);
    const pathMatch = attrString.match(/filePath="([^"]*)"/);

    const type = typeMatch ? typeMatch[1] : 'file';
    const filePath = pathMatch ? pathMatch[1] : undefined;

    if (type === 'file') {
      steps.push({
        id: stepId++,
        title: `Create ${filePath || 'file'}`,
        description: `File ${filePath || 'file'} created`,
        type: StepType.CreateFile,
        status: 'completed',
        code: content.trim(),
        path: filePath,
      });
    } else if (type === 'shell') {
      steps.push({
        id: stepId++,
        title: 'Run command',
        description: `Command execution`,
        type: StepType.RunScript,
        status: 'completed',
        code: content.trim(),
      });
    }
  }

  // Check if there is an active in-progress boltAction after the last completed action
  const remainingXml = xmlContent.slice(lastIndex);
  const openActionMatch = remainingXml.match(/<boltAction\s+([^>]+)>([\s\S]*)$/);

  if (openActionMatch && !isStreamingComplete) {
    const [, attrString, partialContent] = openActionMatch;

    const typeMatch = attrString.match(/type="([^"]*)"/);
    const pathMatch = attrString.match(/filePath="([^"]*)"/);

    const type = typeMatch ? typeMatch[1] : 'file';
    const filePath = pathMatch ? pathMatch[1] : undefined;

    if (type === 'file') {
      steps.push({
        id: stepId++,
        title: `Create ${filePath || 'file'}`,
        description: `Writing ${filePath || 'file'}...`,
        type: StepType.CreateFile,
        status: 'in-progress',
        code: partialContent,
        path: filePath,
      });
    } else if (type === 'shell') {
      steps.push({
        id: stepId++,
        title: 'Run command',
        description: `Preparing command...`,
        type: StepType.RunScript,
        status: 'in-progress',
        code: partialContent.trim(),
      });
    }
  }

  return steps;
}