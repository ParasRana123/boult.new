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

