import { openai } from '@ai-sdk/openai';
import { Agent } from '@mastra/core/agent';
import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

const llm = openai(process.env.MODEL ?? "gpt-4.1");

const agent = new Agent({
    name: 'Web Builder',
    model: llm,
    instructions: `
            For any input, make a github repo within the user: Eima-M with the same name as the input
            THESE ARE TEMPORARY INSTRUCTIONS
            `,
});

const createRepo = createStep({
    id: 'create-repository',
    description: 'Make a new Github repository',
    inputSchema: z.object({
        projectName: z.string().describe('The name of the new repo: '),
    }),
    outputSchema: z.object({
        repositoryUrl: z.string().describe('The URL of the created repository'),
        repositoryName: z.string().describe('The name of the created repository'),
        success: z.boolean().describe('Whether the repository was created successfully'),
    }),
    execute: async (params: any) => {
        try {
            // Debug: Log the entire params structure
            // console.log('Raw params received in step:', JSON.stringify(params, null, 2));
            
            // Extract from the correct location - params.inputData
            const { projectName } = params.inputData || params.context || params.data || params.input || params;
            // console.log('Extracted projectName:', projectName);
            
            // Validate that projectName exists and is not empty
            if (!projectName || projectName.trim() === '') {
                throw new Error('Project name is required but was not provided or is empty');
            }
            
            const repoName = projectName.trim(); // Use projectName as repoName and trim whitespace
            
            console.log(`Creating GitHub repository: ${repoName}`);
            
            // Use GitHub API to create repository
            const response = await fetch('https://api.github.com/user/repos', {
                method: 'POST',
                headers: {
                    'Authorization': `token ${process.env.GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: repoName,
                    description: `Website project: ${repoName}`,
                    private: true,
                    auto_init: false, // Initialize without README
                }),
            });

            if (!response.ok) {
                const errorData = await response.json() as any;
                throw new Error(`Failed to create repository: ${errorData.message || response.statusText}`);
            }

            const repoData = await response.json() as any;
            
            console.log(`Repository created successfully: ${repoData.html_url}`);
            
            return {
                repositoryUrl: repoData.html_url,
                repositoryName: repoData.name,
                success: true,
            };

        } catch (error) {
            console.error('Error creating repository:', error);
            throw error;
        }
    }
});

const initializeFramework = createStep({
    id: 'initialize-framework',
    description: 'Initialize a React framework in the created repository',
    inputSchema: z.object({
        repositoryUrl: z.string().describe('The URL of the created repository'),
        repositoryName: z.string().describe('The name of the created repository'),
        success: z.boolean().describe('Whether the repository was created successfully'),
    }),
    outputSchema: z.object({
        repositoryUrl: z.string().describe('The URL of the repository'),
        repositoryName: z.string().describe('The name of the repository'),
        frameworkInitialized: z.boolean().describe('Whether the framework was successfully initialized'),
        success: z.boolean().describe('Whether the step completed successfully'),
    }),
    execute: async (params: any) => {
        try {
            // Extract from the correct location
            const { repositoryUrl, repositoryName, success } = params.inputData || params.context || params.data || params.input || params;
            
            if (!success) {
                throw new Error('Repository creation failed, cannot initialize framework');
            }
            
            console.log(`Initializing React framework in repository: ${repositoryName}`);
            
            // Create a temporary directory name
            const tempDir = `temp-${repositoryName}-${Date.now()}`;
            const repoCloneUrl = `https://${process.env.GITHUB_TOKEN}@github.com/Eima-M/${repositoryName}.git`;
            
            // Use GitHub API to create initial files for a Vite React project
            const files = [
                {
                    path: 'package.json',
                    content: JSON.stringify({
                        name: repositoryName.toLowerCase(),
                        private: true,
                        version: '0.0.0',
                        type: 'module',
                        scripts: {
                            dev: 'vite',
                            build: 'vite build',
                            lint: 'eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0',
                            preview: 'vite preview'
                        },
                        dependencies: {
                            react: '^18.2.0',
                            'react-dom': '^18.2.0'
                        },
                        devDependencies: {
                            '@types/react': '^18.2.66',
                            '@types/react-dom': '^18.2.22',
                            '@typescript-eslint/eslint-plugin': '^7.2.0',
                            '@typescript-eslint/parser': '^7.2.0',
                            '@vitejs/plugin-react': '^4.2.1',
                            eslint: '^8.57.0',
                            'eslint-plugin-react-hooks': '^4.6.0',
                            'eslint-plugin-react-refresh': '^0.4.6',
                            typescript: '^5.2.2',
                            vite: '^5.2.0'
                        }
                    }, null, 2)
                },
                {
                    path: 'index.html',
                    content: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${repositoryName}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`
                },
                {
                    path: 'vite.config.ts',
                    content: `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
})`
                },
                {
                    path: 'tsconfig.json',
                    content: JSON.stringify({
                        compilerOptions: {
                            target: 'ES2020',
                            useDefineForClassFields: true,
                            lib: ['ES2020', 'DOM', 'DOM.Iterable'],
                            module: 'ESNext',
                            skipLibCheck: true,
                            moduleResolution: 'bundler',
                            allowImportingTsExtensions: true,
                            resolveJsonModule: true,
                            isolatedModules: true,
                            noEmit: true,
                            jsx: 'react-jsx',
                            strict: true,
                            noUnusedLocals: true,
                            noUnusedParameters: true,
                            noFallthroughCasesInSwitch: true
                        },
                        include: ['src'],
                        references: [{ path: './tsconfig.node.json' }]
                    }, null, 2)
                },
                {
                    path: 'tsconfig.node.json',
                    content: JSON.stringify({
                        compilerOptions: {
                            composite: true,
                            skipLibCheck: true,
                            module: 'ESNext',
                            moduleResolution: 'bundler',
                            allowSyntheticDefaultImports: true
                        },
                        include: ['vite.config.ts']
                    }, null, 2)
                },
                {
                    path: 'src/main.tsx',
                    content: `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`
                },
                {
                    path: 'src/App.tsx',
                    content: `import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <div>
        <h1>${repositoryName}</h1>
        <div className="card">
          <button onClick={() => setCount((count) => count + 1)}>
            count is {count}
          </button>
          <p>
            Edit <code>src/App.tsx</code> and save to test HMR
          </p>
        </div>
        <p className="read-the-docs">
          Click on the Vite and React logos to learn more
        </p>
      </div>
    </>
  )
}

export default App`
                },
                {
                    path: 'src/App.css',
                    content: `#root {
  max-width: 1280px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
}

.card {
  padding: 2em;
}

.read-the-docs {
  color: #888;
}`
                },
                {
                    path: 'src/index.css',
                    content: `:root {
  font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
  line-height: 1.5;
  font-weight: 400;
  color: #213547;
  background-color: #ffffff;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  margin: 0;
  display: flex;
  place-items: center;
  min-width: 320px;
  min-height: 100vh;
}

#root {
  max-width: 1280px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
}

button {
  border-radius: 8px;
  border: 1px solid transparent;
  padding: 0.6em 1.2em;
  font-size: 1em;
  font-weight: 500;
  font-family: inherit;
  background-color: #1a1a1a;
  color: white;
  cursor: pointer;
  transition: border-color 0.25s;
}

button:hover {
  border-color: #646cff;
}

button:focus,
button:focus-visible {
  outline: 4px auto -webkit-focus-ring-color;
}`
                },
                {
                    path: 'README.md',
                    content: `# ${repositoryName}

A React application built with Vite and TypeScript.

## Getting Started

1. Install dependencies:
\`\`\`bash
npm install
\`\`\`

2. Start the development server:
\`\`\`bash
npm run dev
\`\`\`

3. Open [http://localhost:5173](http://localhost:5173) to view it in the browser.

## Available Scripts

- \`npm run dev\` - Start development server
- \`npm run build\` - Build for production
- \`npm run preview\` - Preview production build
- \`npm run lint\` - Run ESLint

## Tech Stack

- React 18
- TypeScript
- Vite
- ESLint`
                }
            ];

            // Create each file using GitHub API
            for (const file of files) {
                const fileResponse = await fetch(`https://api.github.com/repos/Eima-M/${repositoryName}/contents/${file.path}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `token ${process.env.GITHUB_TOKEN}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        message: `Add ${file.path}`,
                        content: Buffer.from(file.content).toString('base64'),
                    }),
                });

                if (!fileResponse.ok) {
                    const errorData = await fileResponse.json() as any;
                    throw new Error(`Failed to create file ${file.path}: ${errorData.message || fileResponse.statusText}`);
                }
            }

            console.log(`React framework initialized successfully in repository: ${repositoryName}`);
            
            return {
                repositoryUrl,
                repositoryName,
                frameworkInitialized: true,
                success: true,
            };

        } catch (error) {
            console.error('Error initializing framework:', error);
            throw error;
        }
    }
});

// Create the workflow
const webBuilderWorkflow = createWorkflow({
    id: 'web-builder-workflow',
    inputSchema: z.object({
        projectName: z.string().describe('The name of the website project'),
    }),
    outputSchema: z.object({
        repositoryUrl: z.string().describe('The URL of the created repository'),
        repositoryName: z.string().describe('The name of the created repository'),
        frameworkInitialized: z.boolean().describe('Whether the framework was successfully initialized'),
        success: z.boolean().describe('Whether the workflow completed successfully'),
    }),
})
    .then(createRepo)
    .then(initializeFramework);

webBuilderWorkflow.commit();

export { webBuilderWorkflow };