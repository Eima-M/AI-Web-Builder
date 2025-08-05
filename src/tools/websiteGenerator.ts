import { createStep } from '@mastra/core/workflows';
import { z } from 'zod';

export const generateWebsiteStructure = createStep({
    id: 'generate-website-structure',
    description: 'Generate the complete website structure and components based on requirements',
    inputSchema: z.object({
        repositoryUrl: z.string().describe('The URL of the repository'),
        repositoryName: z.string().describe('The name of the repository'),
        projectName: z.string().describe('The project name'),
        requirements: z.string().describe('The original requirements report'),
        frameworkInitialized: z.boolean().describe('Whether the framework was successfully initialized'),
        success: z.boolean().describe('Whether the previous step completed successfully'),
    }),
    outputSchema: z.object({
        repositoryUrl: z.string().describe('The URL of the repository'),
        repositoryName: z.string().describe('The name of the repository'),
        projectName: z.string().describe('The project name'),
        requirements: z.string().describe('The original requirements report'),
        websiteGenerated: z.boolean().describe('Whether the website was successfully generated'),
        componentsCreated: z.array(z.string()).describe('List of components that were created'),
        success: z.boolean().describe('Whether the step completed successfully'),
    }),
    execute: async (params: any) => {
        try {
            const { repositoryUrl, repositoryName, projectName, requirements, frameworkInitialized, success } = 
                params.inputData || params.context || params.data || params.input || params;
            
            if (!success || !frameworkInitialized) {
                throw new Error('Framework initialization failed, cannot generate website');
            }

            console.log(`Generating website structure for: ${projectName}`);
            
            // Try to get the agent from the global Mastra instance
            let structureAnalysis = '';
            try {
                // Import the agent dynamically to avoid circular dependencies
                const { webBuilderAgent } = await import('../workflows/webBuilder');
                
                console.log('Using AI agent to analyze requirements and generate website structure...');
                
                const analysisPrompt = `
                    Analyze the following website requirements and create a comprehensive website structure plan:
                    
                    ${requirements}
                    
                    Based on these requirements, determine:
                    1. What business type this is (technology, consulting, healthcare, etc.)
                    2. What pages/sections are needed
                    3. What components should be created
                    4. The overall layout and navigation structure
                    5. Appropriate color scheme and styling approach
                    6. Content sections required
                    7. Any special features or functionality
                    
                    Provide a detailed analysis focusing on the business type, target audience, and specific needs mentioned in the requirements.
                    Be specific about the color scheme that would work best for this business type.
                `;

                const response = await webBuilderAgent.generate([
                    {
                        role: 'user',
                        content: analysisPrompt
                    }
                ]);
                
                structureAnalysis = response.text;
                console.log('AI Analysis completed for website structure');
                
            } catch (error) {
                console.log('AI agent not available, using fallback analysis:', error);
                structureAnalysis = `Fallback analysis for ${projectName} based on requirements: ${requirements}`;
            }
            
            // Extract owner from repository URL
            const urlParts = repositoryUrl.split('/');
            const owner = urlParts[urlParts.length - 2];
            
            // GitHub API setup
            const githubToken = process.env.GITHUB_TOKEN;
            if (!githubToken) {
                throw new Error('GITHUB_TOKEN environment variable is required');
            }

            const baseApiUrl = `https://api.github.com/repos/${owner}/${repositoryName}/contents`;
            
            // Create website files based on AI analysis
            const filesToCreate = await generateWebsiteFiles(structureAnalysis, requirements, projectName);
            
            const componentsCreated: string[] = [];
            
            // Create each file via GitHub API
            for (const file of filesToCreate) {
                try {
                    const response = await fetch(`${baseApiUrl}/${file.path}`, {
                        method: 'PUT',
                        headers: {
                            'Authorization': `token ${githubToken}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            message: `Add ${file.path}`,
                            content: Buffer.from(file.content).toString('base64'),
                        }),
                    });

                    if (response.ok) {
                        console.log(`Created file: ${file.path}`);
                        if (file.path.includes('components/')) {
                            componentsCreated.push(file.path);
                        }
                    } else {
                        const errorData = await response.json();
                        console.error(`Failed to create ${file.path}:`, errorData);
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
                websiteGenerated: true,
                componentsCreated,
                success: true,
            };

        } catch (error) {
            console.error('Error generating website structure:', error);
            throw error;
        }
    },
});

async function generateWebsiteFiles(structureAnalysis: string, requirements: string, projectName: string) {
    // Parse requirements to extract key information
    const extractedInfo = parseRequirementsForWebsite(requirements);
    
    const files = [
        // Updated App.tsx
        {
            path: 'src/App.tsx',
            content: generateAppComponent(extractedInfo, projectName)
        },
        // Updated CSS
        {
            path: 'src/App.css',
            content: generateAppCSS(extractedInfo)
        },
        {
            path: 'src/index.css',
            content: generateGlobalCSS(extractedInfo)
        },
        // Components
        {
            path: 'src/components/Header.tsx',
            content: generateHeaderComponent(extractedInfo, projectName)
        },
        {
            path: 'src/components/Hero.tsx',
            content: generateHeroComponent(extractedInfo, projectName)
        },
        {
            path: 'src/components/About.tsx',
            content: generateAboutComponent(extractedInfo)
        },
        {
            path: 'src/components/Services.tsx',
            content: generateServicesComponent(extractedInfo)
        },
        {
            path: 'src/components/Contact.tsx',
            content: generateContactComponent(extractedInfo)
        },
        {
            path: 'src/components/Footer.tsx',
            content: generateFooterComponent(extractedInfo, projectName)
        },
        // Create assets folder with placeholder images
        {
            path: 'public/images/hero-bg.svg',
            content: generatePlaceholderSVG('hero-background', '#f3f4f6', 1200, 600)
        },
        {
            path: 'public/images/logo.svg',
            content: generateLogoSVG(projectName)
        },
        {
            path: 'public/images/service-1.svg',
            content: generatePlaceholderSVG('service-icon', '#3b82f6', 100, 100)
        },
        {
            path: 'public/images/service-2.svg',
            content: generatePlaceholderSVG('service-icon', '#10b981', 100, 100)
        },
        {
            path: 'public/images/service-3.svg',
            content: generatePlaceholderSVG('service-icon', '#f59e0b', 100, 100)
        },
        {
            path: 'public/images/about-image.svg',
            content: generatePlaceholderSVG('about-image', '#6366f1', 400, 300)
        }
    ];
    
    return files;
}

function parseRequirementsForWebsite(requirements: string) {
    const lines = requirements.split('\n');
    let extractedInfo: any = {
        purpose: '',
        targetAudience: '',
        colorScheme: 'blue', // default
        style: 'modern', // default
        businessObjectives: '',
        features: [],
        contentSections: []
    };
    
    // Parse the requirements for key information
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim().toLowerCase();
        
        if (line.includes('main purpose') || line.includes('goal')) {
            extractedInfo.purpose = lines[i].trim();
        }
        if (line.includes('target audience')) {
            extractedInfo.targetAudience = lines[i].trim();
        }
        if (line.includes('color') && (line.includes('scheme') || line.includes('palette'))) {
            extractedInfo.colorScheme = extractColorFromText(lines[i]);
        }
        if (line.includes('style') || line.includes('aesthetic')) {
            extractedInfo.style = extractStyleFromText(lines[i]);
        }
        if (line.includes('feature') || line.includes('functionality')) {
            extractedInfo.features.push(lines[i].trim());
        }
    }
    
    return extractedInfo;
}

function extractColorFromText(text: string): string {
    const colorKeywords = {
        'blue': ['blue', 'navy', 'azure'],
        'green': ['green', 'emerald', 'forest'],
        'purple': ['purple', 'violet', 'indigo'],
        'red': ['red', 'crimson', 'rose'],
        'orange': ['orange', 'amber', 'peach'],
        'gray': ['gray', 'grey', 'neutral']
    };
    
    for (const [color, keywords] of Object.entries(colorKeywords)) {
        if (keywords.some(keyword => text.toLowerCase().includes(keyword))) {
            return color;
        }
    }
    return 'blue'; // default
}

function extractStyleFromText(text: string): string {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('minimal') || lowerText.includes('clean')) return 'minimal';
    if (lowerText.includes('modern') || lowerText.includes('contemporary')) return 'modern';
    if (lowerText.includes('corporate') || lowerText.includes('professional')) return 'corporate';
    if (lowerText.includes('creative') || lowerText.includes('artistic')) return 'creative';
    if (lowerText.includes('bold') || lowerText.includes('vibrant')) return 'bold';
    return 'modern'; // default
}

function generateAppComponent(extractedInfo: any, projectName: string): string {
    return `import React from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import About from './components/About';
import Services from './components/Services';
import Contact from './components/Contact';
import Footer from './components/Footer';
import './App.css';

function App() {
  return (
    <div className="App">
      <Header />
      <main>
        <Hero />
        <About />
        <Services />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}

export default App;`;
}

function generateAppCSS(extractedInfo: any): string {
    const colorSchemes = {
        blue: { primary: '#3b82f6', secondary: '#1e40af', accent: '#60a5fa', light: '#dbeafe' },
        green: { primary: '#10b981', secondary: '#047857', accent: '#34d399', light: '#d1fae5' },
        purple: { primary: '#8b5cf6', secondary: '#6d28d9', accent: '#a78bfa', light: '#e9d5ff' },
        red: { primary: '#ef4444', secondary: '#dc2626', accent: '#f87171', light: '#fee2e2' },
        orange: { primary: '#f59e0b', secondary: '#d97706', accent: '#fbbf24', light: '#fef3c7' },
        gray: { primary: '#6b7280', secondary: '#374151', accent: '#9ca3af', light: '#f3f4f6' }
    };
    
    const colors = colorSchemes[extractedInfo.colorScheme as keyof typeof colorSchemes] || colorSchemes.blue;
    
    return `.App {
  text-align: center;
}

:root {
  --primary-color: ${colors.primary};
  --secondary-color: ${colors.secondary};
  --accent-color: ${colors.accent};
  --light-color: ${colors.light};
  --text-color: #1f2937;
  --text-light: #6b7280;
  --bg-color: #ffffff;
  --section-padding: 4rem 2rem;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

.section {
  padding: var(--section-padding);
}

.section-title {
  font-size: 2.5rem;
  font-weight: bold;
  color: var(--text-color);
  margin-bottom: 1rem;
}

.section-subtitle {
  font-size: 1.2rem;
  color: var(--text-light);
  margin-bottom: 3rem;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}

.btn {
  display: inline-block;
  padding: 0.75rem 2rem;
  border-radius: 0.5rem;
  text-decoration: none;
  font-weight: 600;
  transition: all 0.3s ease;
  cursor: pointer;
  border: none;
}

.btn-primary {
  background-color: var(--primary-color);
  color: white;
}

.btn-primary:hover {
  background-color: var(--secondary-color);
  transform: translateY(-2px);
}

.btn-secondary {
  background-color: transparent;
  color: var(--primary-color);
  border: 2px solid var(--primary-color);
}

.btn-secondary:hover {
  background-color: var(--primary-color);
  color: white;
}

@media (max-width: 768px) {
  .section-title {
    font-size: 2rem;
  }
  
  .section {
    padding: 2rem 1rem;
  }
}`;
}

function generateGlobalCSS(extractedInfo: any): string {
    return `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  line-height: 1.6;
  color: #1f2937;
}

html {
  scroll-behavior: smooth;
}

a {
  color: inherit;
  text-decoration: none;
}

ul {
  list-style: none;
}

img {
  max-width: 100%;
  height: auto;
}`;
}

function generateHeaderComponent(extractedInfo: any, projectName: string): string {
    return `import React, { useState } from 'react';

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header style={headerStyles}>
      <div className="container" style={containerStyles}>
        <div style={logoStyles}>
          <img src="/images/logo.svg" alt="${projectName}" style={logoImageStyles} />
          <span style={logoTextStyles}>${projectName}</span>
        </div>
        
        <nav style={navStyles}>
          <ul style={navListStyles}>
            <li><a href="#home" style={navLinkStyles}>Home</a></li>
            <li><a href="#about" style={navLinkStyles}>About</a></li>
            <li><a href="#services" style={navLinkStyles}>Services</a></li>
            <li><a href="#contact" style={navLinkStyles}>Contact</a></li>
          </ul>
        </nav>
        
        <button
          style={menuButtonStyles}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="menu-toggle"
        >
          ☰
        </button>
        
        {isMenuOpen && (
          <div style={mobileMenuStyles}>
            <a href="#home" style={mobileNavLinkStyles}>Home</a>
            <a href="#about" style={mobileNavLinkStyles}>About</a>
            <a href="#services" style={mobileNavLinkStyles}>Services</a>
            <a href="#contact" style={mobileNavLinkStyles}>Contact</a>
          </div>
        )}
      </div>
    </header>
  );
};

const headerStyles: React.CSSProperties = {
  backgroundColor: 'white',
  boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  zIndex: 1000,
  padding: '1rem 0',
};

const containerStyles: React.CSSProperties = {
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '0 1rem',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const logoStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
};

const logoImageStyles: React.CSSProperties = {
  width: '40px',
  height: '40px',
};

const logoTextStyles: React.CSSProperties = {
  fontSize: '1.5rem',
  fontWeight: 'bold',
  color: 'var(--primary-color)',
};

const navStyles: React.CSSProperties = {
  display: 'flex',
  '@media (max-width: 768px)': {
    display: 'none',
  },
};

const navListStyles: React.CSSProperties = {
  display: 'flex',
  gap: '2rem',
  listStyle: 'none',
};

const navLinkStyles: React.CSSProperties = {
  color: 'var(--text-color)',
  textDecoration: 'none',
  fontWeight: '500',
  transition: 'color 0.3s ease',
};

const menuButtonStyles: React.CSSProperties = {
  display: 'none',
  background: 'none',
  border: 'none',
  fontSize: '1.5rem',
  cursor: 'pointer',
  '@media (max-width: 768px)': {
    display: 'block',
  },
};

const mobileMenuStyles: React.CSSProperties = {
  position: 'absolute',
  top: '100%',
  left: 0,
  right: 0,
  backgroundColor: 'white',
  boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
  display: 'flex',
  flexDirection: 'column',
  padding: '1rem',
  gap: '1rem',
};

const mobileNavLinkStyles: React.CSSProperties = {
  color: 'var(--text-color)',
  textDecoration: 'none',
  fontWeight: '500',
  padding: '0.5rem',
};

export default Header;`;
}

function generateHeroComponent(extractedInfo: any, projectName: string): string {
    return `import React from 'react';

const Hero: React.FC = () => {
  return (
    <section id="home" style={heroStyles}>
      <div className="container" style={containerStyles}>
        <div style={contentStyles}>
          <h1 style={titleStyles}>
            Welcome to ${projectName}
          </h1>
          <p style={subtitleStyles}>
            ${extractedInfo.purpose || 'Building exceptional digital experiences that drive results and engage your audience.'}
          </p>
          <div style={buttonGroupStyles}>
            <a href="#contact" className="btn btn-primary" style={buttonStyles}>
              Get Started
            </a>
            <a href="#about" className="btn btn-secondary" style={buttonStyles}>
              Learn More
            </a>
          </div>
        </div>
        <div style={imageContainerStyles}>
          <img 
            src="/images/hero-bg.svg" 
            alt="Hero Background" 
            style={heroImageStyles}
          />
        </div>
      </div>
    </section>
  );
};

const heroStyles: React.CSSProperties = {
  background: 'linear-gradient(135deg, var(--light-color) 0%, white 100%)',
  paddingTop: '120px',
  paddingBottom: '80px',
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
};

const containerStyles: React.CSSProperties = {
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '0 1rem',
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '3rem',
  alignItems: 'center',
};

const contentStyles: React.CSSProperties = {
  textAlign: 'left',
};

const titleStyles: React.CSSProperties = {
  fontSize: '3.5rem',
  fontWeight: 'bold',
  color: 'var(--text-color)',
  marginBottom: '1.5rem',
  lineHeight: '1.2',
};

const subtitleStyles: React.CSSProperties = {
  fontSize: '1.3rem',
  color: 'var(--text-light)',
  marginBottom: '2.5rem',
  lineHeight: '1.6',
};

const buttonGroupStyles: React.CSSProperties = {
  display: 'flex',
  gap: '1rem',
  flexWrap: 'wrap',
};

const buttonStyles: React.CSSProperties = {
  display: 'inline-block',
  padding: '1rem 2rem',
  borderRadius: '0.5rem',
  textDecoration: 'none',
  fontWeight: '600',
  transition: 'all 0.3s ease',
  cursor: 'pointer',
  border: 'none',
};

const imageContainerStyles: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
};

const heroImageStyles: React.CSSProperties = {
  width: '100%',
  maxWidth: '500px',
  height: 'auto',
};

export default Hero;`;
}

function generateAboutComponent(extractedInfo: any): string {
    return `import React from 'react';

const About: React.FC = () => {
  return (
    <section id="about" className="section" style={aboutStyles}>
      <div className="container" style={containerStyles}>
        <div style={contentGridStyles}>
          <div style={textContentStyles}>
            <h2 className="section-title">About Us</h2>
            <p className="section-subtitle">
              ${extractedInfo.targetAudience || 'We are dedicated to providing exceptional solutions that meet your unique needs and exceed your expectations.'}
            </p>
            <div style={featuresStyles}>
              <div style={featureStyles}>
                <h3 style={featureTitleStyles}>Professional Excellence</h3>
                <p style={featureTextStyles}>
                  Delivering high-quality solutions with attention to detail and commitment to excellence.
                </p>
              </div>
              <div style={featureStyles}>
                <h3 style={featureTitleStyles}>Customer Focus</h3>
                <p style={featureTextStyles}>
                  Understanding your needs and providing personalized solutions that drive results.
                </p>
              </div>
              <div style={featureStyles}>
                <h3 style={featureTitleStyles}>Innovation</h3>
                <p style={featureTextStyles}>
                  Staying ahead of trends and implementing cutting-edge technologies and methodologies.
                </p>
              </div>
            </div>
          </div>
          <div style={imageContainerStyles}>
            <img 
              src="/images/about-image.svg" 
              alt="About Us" 
              style={aboutImageStyles}
            />
          </div>
        </div>
      </div>
    </section>
  );
};

const aboutStyles: React.CSSProperties = {
  backgroundColor: 'white',
};

const containerStyles: React.CSSProperties = {
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '0 1rem',
};

const contentGridStyles: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '4rem',
  alignItems: 'center',
};

const textContentStyles: React.CSSProperties = {
  textAlign: 'left',
};

const featuresStyles: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '2rem',
};

const featureStyles: React.CSSProperties = {
  padding: '1.5rem',
  backgroundColor: 'var(--light-color)',
  borderRadius: '0.5rem',
};

const featureTitleStyles: React.CSSProperties = {
  fontSize: '1.3rem',
  fontWeight: 'bold',
  color: 'var(--primary-color)',
  marginBottom: '0.5rem',
};

const featureTextStyles: React.CSSProperties = {
  color: 'var(--text-light)',
  lineHeight: '1.6',
};

const imageContainerStyles: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
};

const aboutImageStyles: React.CSSProperties = {
  width: '100%',
  maxWidth: '400px',
  height: 'auto',
  borderRadius: '1rem',
};

export default About;`;
}

function generateServicesComponent(extractedInfo: any): string {
    return `import React from 'react';

const Services: React.FC = () => {
  const services = [
    {
      icon: '/images/service-1.svg',
      title: 'Consulting',
      description: 'Expert advice and strategic guidance to help you achieve your goals.'
    },
    {
      icon: '/images/service-2.svg',
      title: 'Implementation',
      description: 'Professional implementation services to bring your vision to life.'
    },
    {
      icon: '/images/service-3.svg',
      title: 'Support',
      description: 'Ongoing support and maintenance to ensure continued success.'
    }
  ];

  return (
    <section id="services" className="section" style={servicesStyles}>
      <div className="container" style={containerStyles}>
        <h2 className="section-title">Our Services</h2>
        <p className="section-subtitle">
          Comprehensive solutions designed to meet your specific needs and drive exceptional results.
        </p>
        
        <div style={servicesGridStyles}>
          {services.map((service, index) => (
            <div key={index} style={serviceCardStyles}>
              <div style={iconContainerStyles}>
                <img src={service.icon} alt={service.title} style={iconStyles} />
              </div>
              <h3 style={serviceTitleStyles}>{service.title}</h3>
              <p style={serviceDescriptionStyles}>{service.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const servicesStyles: React.CSSProperties = {
  backgroundColor: 'var(--light-color)',
};

const containerStyles: React.CSSProperties = {
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '0 1rem',
  textAlign: 'center',
};

const servicesGridStyles: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
  gap: '2rem',
  marginTop: '3rem',
};

const serviceCardStyles: React.CSSProperties = {
  backgroundColor: 'white',
  padding: '2.5rem 2rem',
  borderRadius: '1rem',
  boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
  ':hover': {
    transform: 'translateY(-5px)',
    boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
  },
};

const iconContainerStyles: React.CSSProperties = {
  width: '80px',
  height: '80px',
  margin: '0 auto 1.5rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'var(--light-color)',
  borderRadius: '50%',
};

const iconStyles: React.CSSProperties = {
  width: '50px',
  height: '50px',
};

const serviceTitleStyles: React.CSSProperties = {
  fontSize: '1.5rem',
  fontWeight: 'bold',
  color: 'var(--text-color)',
  marginBottom: '1rem',
};

const serviceDescriptionStyles: React.CSSProperties = {
  color: 'var(--text-light)',
  lineHeight: '1.6',
};

export default Services;`;
}

function generateContactComponent(extractedInfo: any): string {
    return `import React, { useState } from 'react';

const Contact: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission here
    console.log('Form submitted:', formData);
    alert('Thank you for your message! We will get back to you soon.');
    setFormData({ name: '', email: '', message: '' });
  };

  return (
    <section id="contact" className="section" style={contactStyles}>
      <div className="container" style={containerStyles}>
        <h2 className="section-title" style={titleStyles}>Get In Touch</h2>
        <p className="section-subtitle">
          Ready to get started? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
        </p>
        
        <div style={contentGridStyles}>
          <div style={contactInfoStyles}>
            <div style={contactItemStyles}>
              <h3 style={contactTitleStyles}>Email</h3>
              <p style={contactTextStyles}>contact@example.com</p>
            </div>
            <div style={contactItemStyles}>
              <h3 style={contactTitleStyles}>Phone</h3>
              <p style={contactTextStyles}>+1 (555) 123-4567</p>
            </div>
            <div style={contactItemStyles}>
              <h3 style={contactTitleStyles}>Address</h3>
              <p style={contactTextStyles}>123 Business St, City, State 12345</p>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} style={formStyles}>
            <div style={inputGroupStyles}>
              <input
                type="text"
                name="name"
                placeholder="Your Name"
                value={formData.name}
                onChange={handleChange}
                required
                style={inputStyles}
              />
            </div>
            <div style={inputGroupStyles}>
              <input
                type="email"
                name="email"
                placeholder="Your Email"
                value={formData.email}
                onChange={handleChange}
                required
                style={inputStyles}
              />
            </div>
            <div style={inputGroupStyles}>
              <textarea
                name="message"
                placeholder="Your Message"
                value={formData.message}
                onChange={handleChange}
                required
                rows={5}
                style={textareaStyles}
              />
            </div>
            <button type="submit" className="btn btn-primary" style={submitButtonStyles}>
              Send Message
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};

const contactStyles: React.CSSProperties = {
  backgroundColor: 'white',
};

const containerStyles: React.CSSProperties = {
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '0 1rem',
};

const titleStyles: React.CSSProperties = {
  textAlign: 'center',
};

const contentGridStyles: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '4rem',
  marginTop: '3rem',
};

const contactInfoStyles: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '2rem',
};

const contactItemStyles: React.CSSProperties = {
  padding: '1.5rem',
  backgroundColor: 'var(--light-color)',
  borderRadius: '0.5rem',
};

const contactTitleStyles: React.CSSProperties = {
  fontSize: '1.2rem',
  fontWeight: 'bold',
  color: 'var(--primary-color)',
  marginBottom: '0.5rem',
};

const contactTextStyles: React.CSSProperties = {
  color: 'var(--text-light)',
};

const formStyles: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1.5rem',
};

const inputGroupStyles: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
};

const inputStyles: React.CSSProperties = {
  padding: '1rem',
  border: '2px solid #e5e7eb',
  borderRadius: '0.5rem',
  fontSize: '1rem',
  transition: 'border-color 0.3s ease',
  ':focus': {
    outline: 'none',
    borderColor: 'var(--primary-color)',
  },
};

const textareaStyles: React.CSSProperties = {
  ...inputStyles,
  resize: 'vertical',
  minHeight: '120px',
};

const submitButtonStyles: React.CSSProperties = {
  padding: '1rem 2rem',
  backgroundColor: 'var(--primary-color)',
  color: 'white',
  border: 'none',
  borderRadius: '0.5rem',
  fontSize: '1rem',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'background-color 0.3s ease',
  ':hover': {
    backgroundColor: 'var(--secondary-color)',
  },
};

export default Contact;`;
}

function generateFooterComponent(extractedInfo: any, projectName: string): string {
    return `import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer style={footerStyles}>
      <div className="container" style={containerStyles}>
        <div style={footerContentStyles}>
          <div style={footerSectionStyles}>
            <div style={logoStyles}>
              <img src="/images/logo.svg" alt="${projectName}" style={logoImageStyles} />
              <span style={logoTextStyles}>${projectName}</span>
            </div>
            <p style={descriptionStyles}>
              Building exceptional digital experiences that drive results and engage your audience.
            </p>
          </div>
          
          <div style={footerSectionStyles}>
            <h3 style={sectionTitleStyles}>Quick Links</h3>
            <ul style={linkListStyles}>
              <li><a href="#home" style={linkStyles}>Home</a></li>
              <li><a href="#about" style={linkStyles}>About</a></li>
              <li><a href="#services" style={linkStyles}>Services</a></li>
              <li><a href="#contact" style={linkStyles}>Contact</a></li>
            </ul>
          </div>
          
          <div style={footerSectionStyles}>
            <h3 style={sectionTitleStyles}>Contact Info</h3>
            <div style={contactInfoStyles}>
              <p style={contactItemStyles}>contact@example.com</p>
              <p style={contactItemStyles}>+1 (555) 123-4567</p>
              <p style={contactItemStyles}>123 Business St, City, State 12345</p>
            </div>
          </div>
          
          <div style={footerSectionStyles}>
            <h3 style={sectionTitleStyles}>Follow Us</h3>
            <div style={socialLinksStyles}>
              <a href="#" style={socialLinkStyles}>Facebook</a>
              <a href="#" style={socialLinkStyles}>Twitter</a>
              <a href="#" style={socialLinkStyles}>LinkedIn</a>
              <a href="#" style={socialLinkStyles}>Instagram</a>
            </div>
          </div>
        </div>
        
        <div style={footerBottomStyles}>
          <p style={copyrightStyles}>
            © {new Date().getFullYear()} ${projectName}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

const footerStyles: React.CSSProperties = {
  backgroundColor: 'var(--text-color)',
  color: 'white',
  padding: '3rem 0 1rem',
};

const containerStyles: React.CSSProperties = {
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '0 1rem',
};

const footerContentStyles: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
  gap: '2rem',
  marginBottom: '2rem',
};

const footerSectionStyles: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
};

const logoStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  marginBottom: '1rem',
};

const logoImageStyles: React.CSSProperties = {
  width: '40px',
  height: '40px',
  filter: 'brightness(0) invert(1)',
};

const logoTextStyles: React.CSSProperties = {
  fontSize: '1.5rem',
  fontWeight: 'bold',
  color: 'white',
};

const descriptionStyles: React.CSSProperties = {
  color: '#d1d5db',
  lineHeight: '1.6',
};

const sectionTitleStyles: React.CSSProperties = {
  fontSize: '1.2rem',
  fontWeight: 'bold',
  marginBottom: '1rem',
};

const linkListStyles: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
  listStyle: 'none',
};

const linkStyles: React.CSSProperties = {
  color: '#d1d5db',
  textDecoration: 'none',
  transition: 'color 0.3s ease',
  ':hover': {
    color: 'var(--accent-color)',
  },
};

const contactInfoStyles: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
};

const contactItemStyles: React.CSSProperties = {
  color: '#d1d5db',
  margin: 0,
};

const socialLinksStyles: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
};

const socialLinkStyles: React.CSSProperties = {
  color: '#d1d5db',
  textDecoration: 'none',
  transition: 'color 0.3s ease',
  ':hover': {
    color: 'var(--accent-color)',
  },
};

const footerBottomStyles: React.CSSProperties = {
  paddingTop: '2rem',
  borderTop: '1px solid #374151',
  textAlign: 'center',
};

const copyrightStyles: React.CSSProperties = {
  color: '#9ca3af',
  margin: 0,
};

export default Footer;`;
}

function generatePlaceholderSVG(type: string, color: string, width: number, height: number): string {
    return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" fill="${color}" opacity="0.1"/>
  <rect x="${width/4}" y="${height/4}" width="${width/2}" height="${height/2}" fill="${color}" opacity="0.3" rx="8"/>
  <text x="${width/2}" y="${height/2}" text-anchor="middle" dominant-baseline="middle" fill="${color}" font-family="Arial, sans-serif" font-size="${Math.min(width, height)/10}">${type.replace('-', ' ').toUpperCase()}</text>
</svg>`;
}

function generateLogoSVG(projectName: string): string {
    return `<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="40" height="40" rx="8" fill="var(--primary-color)"/>
  <text x="20" y="25" text-anchor="middle" dominant-baseline="middle" fill="white" font-family="Arial, sans-serif" font-size="16" font-weight="bold">${projectName.charAt(0).toUpperCase()}</text>
</svg>`;
}