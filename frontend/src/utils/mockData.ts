import { WebsiteProject, WebsiteFolder, WebsiteFile } from '../types';

export const generateMockProject = (prompt: string): WebsiteProject => {
  const htmlFile: WebsiteFile = {
    name: 'index.html',
    path: '/index.html',
    content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Generated Website</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <header>
    <h1>Welcome to your generated website</h1>
    <p>Created from prompt: "${prompt}"</p>
  </header>
  
  <main>
    <section>
      <h2>About</h2>
      <p>This website was automatically generated based on your requirements.</p>
    </section>
  </main>
  
  <footer>
    <p>&copy; 2025 Website Builder</p>
  </footer>
  
  <script src="script.js"></script>
</body>
</html>`,
    language: 'html'
  };

  const cssFile: WebsiteFile = {
    name: 'styles.css',
    path: '/styles.css',
    content: `body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  line-height: 1.6;
  margin: 0;
  padding: 0;
  color: #333;
}

header {
  background-color: #4a6cf7;
  color: white;
  padding: 2rem;
  text-align: center;
}

main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

footer {
  background-color: #333;
  color: white;
  text-align: center;
  padding: 1rem;
  position: fixed;
  bottom: 0;
  width: 100%;
}`,
    language: 'css'
  };

  const jsFile: WebsiteFile = {
    name: 'script.js',
    path: '/script.js',
    content: `document.addEventListener('DOMContentLoaded', function() {
  console.log('Website generated from prompt: "${prompt}");
  
  // Example animation
  const header = document.querySelector('header');
  header.style.opacity = 0;
  
  let opacity = 0;
  const fadeIn = setInterval(() => {
    opacity += 0.01;
    header.style.opacity = opacity;
    
    if (opacity >= 1) {
      clearInterval(fadeIn);
    }
  }, 10);
});`,
    language: 'javascript'
  };

  const componentsFolder: WebsiteFolder = {
    name: 'components',
    path: '/components',
    files: [
      {
        name: 'Button.jsx',
        path: '/components/Button.jsx',
        content: `const Button = ({ text, onClick, type = 'primary' }) => {
  return (
    <button 
      className={\`btn \${type}\`} 
      onClick={onClick}
    >
      {text}
    </button>
  );
};

export default Button;`,
        language: 'javascript'
      },
      {
        name: 'Header.jsx',
        path: '/components/Header.jsx',
        content: `import Button from './Button';

const Header = ({ title }) => {
  return (
    <header className="site-header">
      <h1>{title}</h1>
      <nav>
        <ul>
          <li><a href="#home">Home</a></li>
          <li><a href="#about">About</a></li>
          <li><a href="#contact">Contact</a></li>
        </ul>
      </nav>
      <Button text="Sign Up" onClick={() => console.log('Sign up clicked')} />
    </header>
  );
};

export default Header;`,
        language: 'javascript'
      }
    ],
    folders: []
  };

  const rootFolder: WebsiteFolder = {
    name: 'root',
    path: '/',
    files: [htmlFile, cssFile, jsFile],
    folders: [componentsFolder]
  };

  return {
    name: 'Generated Website',
    description: `Website generated from the prompt: "${prompt}"`,
    prompt,
    rootFolder
  };
};