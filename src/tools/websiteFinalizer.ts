import { createStep } from '@mastra/core/workflows';
import { z } from 'zod';

export const finalizeWebsite = createStep({
    id: 'finalize-website',
    description: 'Finalize the website with README and deployment instructions',
    inputSchema: z.object({
        repositoryUrl: z.string().describe('The URL of the repository'),
        repositoryName: z.string().describe('The name of the repository'),
        projectName: z.string().describe('The project name'),
        requirements: z.string().describe('The original requirements report'),
        contentGenerated: z.boolean().describe('Whether custom content was successfully generated'),
        stylingCompleted: z.boolean().describe('Whether custom styling was completed'),
        success: z.boolean().describe('Whether the previous step completed successfully'),
    }),
    outputSchema: z.object({
        repositoryUrl: z.string().describe('The URL of the repository'),
        repositoryName: z.string().describe('The name of the repository'),
        projectName: z.string().describe('The project name'),
        requirements: z.string().describe('The original requirements report'),
        frameworkInitialized: z.boolean().describe('Whether the framework was successfully initialized'),
        websiteCompleted: z.boolean().describe('Whether the complete website was successfully created'),
        deploymentReady: z.boolean().describe('Whether the website is ready for deployment'),
        success: z.boolean().describe('Whether the workflow completed successfully'),
    }),
    execute: async (params: any) => {
        try {
            const { repositoryUrl, repositoryName, projectName, requirements, contentGenerated, stylingCompleted, success } = 
                params.inputData || params.context || params.data || params.input || params;
            
            if (!success || !contentGenerated || !stylingCompleted) {
                throw new Error('Previous steps failed, cannot finalize website');
            }

            console.log(`Finalizing website: ${projectName}`);
            
            // Extract owner from repository URL
            const urlParts = repositoryUrl.split('/');
            const owner = urlParts[urlParts.length - 2];
            
            // GitHub API setup
            const githubToken = process.env.GITHUB_TOKEN;
            if (!githubToken) {
                throw new Error('GITHUB_TOKEN environment variable is required');
            }

            const baseApiUrl = `https://api.github.com/repos/${owner}/${repositoryName}/contents`;
            
            // Create final documentation and configuration files
            const finalFiles = generateFinalFiles(projectName, requirements, repositoryName);
            
            // Create each file via GitHub API
            for (const file of finalFiles) {
                try {
                    // Check if file exists first
                    const getResponse = await fetch(`${baseApiUrl}/${file.path}`, {
                        headers: {
                            'Authorization': `token ${githubToken}`,
                        },
                    });

                    let sha: string | undefined;
                    if (getResponse.ok) {
                        const fileData = await getResponse.json() as any;
                        sha = fileData.sha;
                    }

                    const response = await fetch(`${baseApiUrl}/${file.path}`, {
                        method: 'PUT',
                        headers: {
                            'Authorization': `token ${githubToken}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            message: sha ? `Update ${file.path}` : `Add ${file.path}`,
                            content: Buffer.from(file.content).toString('base64'),
                            ...(sha && { sha }),
                        }),
                    });

                    if (response.ok) {
                        console.log(`Created/Updated file: ${file.path}`);
                    } else {
                        const errorData = await response.json();
                        console.error(`Failed to create/update ${file.path}:`, errorData);
                    }
                } catch (error) {
                    console.error(`Error creating file ${file.path}:`, error);
                }
            }

            return {
                repositoryUrl,
                repositoryName,
                projectName,
                requirements,
                frameworkInitialized: true,
                websiteCompleted: true,
                deploymentReady: true,
                success: true,
            };

        } catch (error) {
            console.error('Error finalizing website:', error);
            throw error;
        }
    },
});

function generateFinalFiles(projectName: string, requirements: string, repositoryName: string) {
    return [
        {
            path: 'README.md',
            content: generateREADME(projectName, requirements, repositoryName)
        },
        {
            path: '.gitignore',
            content: generateGitignore()
        },
        {
            path: 'public/robots.txt',
            content: generateRobotsTxt()
        },
        {
            path: 'public/manifest.json',
            content: generateManifest(projectName)
        },
        {
            path: '.env.example',
            content: generateEnvExample()
        }
    ];
}

function generateREADME(projectName: string, requirements: string, repositoryName: string): string {
    const businessType = inferBusinessType(requirements);
    
    return `# ${projectName}

A modern, responsive React website built with Vite and TypeScript.

## 🚀 Features

- **Modern React Architecture**: Built with React 18 and TypeScript
- **Responsive Design**: Mobile-first approach with responsive layouts
- **Fast Development**: Powered by Vite for lightning-fast development
- **Professional Styling**: Clean, modern CSS with custom variables
- **Accessible**: Built with accessibility best practices
- **SEO Ready**: Optimized for search engines

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript
- **Build Tool**: Vite
- **Styling**: CSS3 with custom properties
- **Linting**: ESLint with TypeScript rules
- **Package Manager**: npm

## 📁 Project Structure

\`\`\`
${repositoryName}/
├── public/
│   ├── images/           # Website images and assets
│   ├── index.html       # Main HTML template
│   ├── robots.txt       # SEO robots file
│   └── manifest.json    # PWA manifest
├── src/
│   ├── components/      # React components
│   │   ├── Header.tsx   # Navigation header
│   │   ├── Hero.tsx     # Hero section
│   │   ├── About.tsx    # About section
│   │   ├── Services.tsx # Services section
│   │   ├── Contact.tsx  # Contact form
│   │   └── Footer.tsx   # Site footer
│   ├── App.tsx          # Main App component
│   ├── App.css          # Component styles
│   ├── index.css        # Global styles
│   └── main.tsx         # React entry point
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript configuration
├── vite.config.ts       # Vite configuration
└── README.md           # This file
\`\`\`

## 🚀 Getting Started

### Prerequisites

- Node.js (version 16 or higher)
- npm (comes with Node.js)

### Installation

1. Clone the repository:
\`\`\`bash
git clone https://github.com/Eima-M/${repositoryName}.git
cd ${repositoryName}
\`\`\`

2. Install dependencies:
\`\`\`bash
npm install
\`\`\`

3. Start the development server:
\`\`\`bash
npm run dev
\`\`\`

4. Open your browser and visit \`http://localhost:5173\`

## 📝 Available Scripts

- \`npm run dev\` - Start development server
- \`npm run build\` - Build for production
- \`npm run lint\` - Run ESLint
- \`npm run preview\` - Preview production build

## 🎨 Customization

### Colors and Styling

The website uses CSS custom properties (variables) for easy theming. You can modify the color scheme by updating the variables in \`src/App.css\`:

\`\`\`css
:root {
  --primary-color: #3b82f6;
  --secondary-color: #1e40af;
  --accent-color: #60a5fa;
  --light-color: #dbeafe;
  /* ... more variables */
}
\`\`\`

### Content

- **Hero Section**: Edit \`src/components/Hero.tsx\`
- **About Section**: Edit \`src/components/About.tsx\`
- **Services**: Edit \`src/components/Services.tsx\`
- **Contact Information**: Edit \`src/components/Contact.tsx\`

### Images

Replace the placeholder images in \`public/images/\` with your own:
- \`hero-bg.svg\` - Hero section background
- \`logo.svg\` - Company logo
- \`about-image.svg\` - About section image
- \`service-*.svg\` - Service icons

## 🚀 Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Connect your GitHub repository to [Vercel](https://vercel.com)
3. Vercel will automatically build and deploy your site

### Deploy to Netlify

1. Build the project: \`npm run build\`
2. Upload the \`dist\` folder to [Netlify](https://netlify.com)

### Deploy to GitHub Pages

1. Install gh-pages: \`npm install --save-dev gh-pages\`
2. Add to package.json scripts: \`"deploy": "gh-pages -d dist"\`
3. Run: \`npm run build && npm run deploy\`

## 📱 Mobile Responsiveness

The website is fully responsive and tested on:
- Desktop (1200px+)
- Tablet (768px - 1199px)
- Mobile (320px - 767px)

## ♿ Accessibility

This website follows accessibility best practices:
- Semantic HTML structure
- Proper heading hierarchy
- Alt text for images
- Keyboard navigation support
- Focus indicators
- ARIA labels where appropriate

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: \`git checkout -b feature-name\`
3. Commit your changes: \`git commit -m 'Add some feature'\`
4. Push to the branch: \`git push origin feature-name\`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support, please contact [your-email@example.com](mailto:your-email@example.com)

---

Built with ❤️ using React, TypeScript, and Vite`;
}

function generateGitignore(): string {
    return `# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

node_modules
dist
dist-ssr
*.local

# Editor directories and files
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Dependencies
node_modules/
jspm_packages/

# Build outputs
build/
dist/
out/

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/
*.lcov

# nyc test coverage
.nyc_output

# Dependency directories
node_modules/
jspm_packages/

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# Microbundle cache
.rpt2_cache/
.rts2_cache_cjs/
.rts2_cache_es/
.rts2_cache_umd/

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# dotenv environment variables file
.env

# parcel-bundler cache (https://parceljs.org/)
.cache
.parcel-cache

# Next.js build output
.next

# Nuxt.js build / generate output
.nuxt
dist

# Gatsby files
.cache/
public

# Storybook build outputs
.out
.storybook-out

# Temporary folders
tmp/
temp/

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db`;
}

function generateRobotsTxt(): string {
    return `User-agent: *
Allow: /

Sitemap: https://your-domain.com/sitemap.xml`;
}

function generateManifest(projectName: string): string {
    return JSON.stringify({
        name: projectName,
        short_name: projectName,
        description: `${projectName} - Professional web services`,
        start_url: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#3b82f6",
        icons: [
            {
                src: "/images/logo.svg",
                sizes: "any",
                type: "image/svg+xml"
            }
        ]
    }, null, 2);
}

function generateEnvExample(): string {
    return `# Example environment variables
# Copy this file to .env and fill in your actual values

# Development
NODE_ENV=development

# API Keys (if needed)
# REACT_APP_API_KEY=your_api_key_here

# Contact Form (if using a service like Formspree)
# REACT_APP_FORM_ENDPOINT=your_form_endpoint_here

# Analytics (if using)
# REACT_APP_GA_TRACKING_ID=your_google_analytics_id
`;
}

function inferBusinessType(requirements: string): string {
    const lowerReq = requirements.toLowerCase();
    
    if (lowerReq.includes('software') || lowerReq.includes('technology') || lowerReq.includes('development')) return 'technology';
    if (lowerReq.includes('consulting') || lowerReq.includes('advisory') || lowerReq.includes('strategy')) return 'consulting';
    if (lowerReq.includes('design') || lowerReq.includes('creative') || lowerReq.includes('art')) return 'creative';
    if (lowerReq.includes('health') || lowerReq.includes('medical') || lowerReq.includes('clinic')) return 'healthcare';
    if (lowerReq.includes('education') || lowerReq.includes('learning') || lowerReq.includes('school')) return 'education';
    if (lowerReq.includes('restaurant') || lowerReq.includes('food') || lowerReq.includes('dining')) return 'restaurant';
    if (lowerReq.includes('retail') || lowerReq.includes('shop') || lowerReq.includes('store')) return 'retail';
    
    return 'general';
}
