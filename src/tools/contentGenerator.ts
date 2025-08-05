import { createStep } from '@mastra/core/workflows';
import { z } from 'zod';

export const generateWebsiteContent = createStep({
    id: 'generate-website-content',
    description: 'Generate custom content and styling based on specific requirements',
    inputSchema: z.object({
        repositoryUrl: z.string().describe('The URL of the repository'),
        repositoryName: z.string().describe('The name of the repository'),
        projectName: z.string().describe('The project name'),
        requirements: z.string().describe('The original requirements report'),
        websiteGenerated: z.boolean().describe('Whether the website was successfully generated'),
        componentsCreated: z.array(z.string()).describe('List of components that were created'),
        success: z.boolean().describe('Whether the previous step completed successfully'),
    }),
    outputSchema: z.object({
        repositoryUrl: z.string().describe('The URL of the repository'),
        repositoryName: z.string().describe('The name of the repository'),
        projectName: z.string().describe('The project name'),
        requirements: z.string().describe('The original requirements report'),
        contentGenerated: z.boolean().describe('Whether custom content was successfully generated'),
        stylingCompleted: z.boolean().describe('Whether custom styling was completed'),
        success: z.boolean().describe('Whether the step completed successfully'),
    }),
    execute: async (params: any) => {
        try {
            const { repositoryUrl, repositoryName, projectName, requirements, websiteGenerated, componentsCreated, success } = 
                params.inputData || params.context || params.data || params.input || params;
            
            if (!success || !websiteGenerated) {
                throw new Error('Website generation failed, cannot generate content');
            }

            console.log(`Generating custom content for: ${projectName}`);
            
            // Try to get the agent from the global Mastra instance
            let contentAnalysis = '';
            try {
                // Import the agent dynamically to avoid circular dependencies
                const { webBuilderAgent } = await import('../workflows/webBuilder');
                
                console.log('Using AI agent to analyze content and create enhanced components...');
                
                const contentPrompt = `
                    Based on the following requirements, generate enhanced content for a website:
                    
                    ${requirements}
                    
                    The website already has these components: ${componentsCreated?.join(', ') || 'basic components'}
                    
                    Please provide:
                    1. Specific business type identification (technology, consulting, healthcare, restaurant, e-commerce, etc.)
                    2. Better content for each section that matches the business type
                    3. Professional color schemes that match the business type
                    4. Additional content sections if needed
                    5. SEO-friendly descriptions
                    6. Call-to-action improvements
                    7. Business-specific services or features
                    8. Industry-appropriate imagery suggestions
                    
                    Focus on making the content professional, engaging, and tailored to the specific business requirements.
                    Be very specific about the business type and provide detailed industry-specific content.
                `;

                const response = await webBuilderAgent.generate([
                    {
                        role: 'user',
                        content: contentPrompt
                    }
                ]);
                
                contentAnalysis = response.text;
                console.log('AI Content Analysis completed');
                
            } catch (error) {
                console.log('AI agent not available, using fallback content enhancement:', error);
                contentAnalysis = `Fallback content enhancement for ${projectName} based on requirements: ${requirements}`;
            }
            
            // Parse the AI-generated content
            const parsedContent = parseGeneratedContent(contentAnalysis, requirements);
            
            // Extract owner from repository URL
            const urlParts = repositoryUrl.split('/');
            const owner = urlParts[urlParts.length - 2];
            
            // GitHub API setup
            const githubToken = process.env.GITHUB_TOKEN;
            if (!githubToken) {
                throw new Error('GITHUB_TOKEN environment variable is required');
            }

            const baseApiUrl = `https://api.github.com/repos/${owner}/${repositoryName}/contents`;
            
            // Generate enhanced components with AI-analyzed content
            const enhancedFiles = generateEnhancedComponents(parsedContent, projectName);
            
            // Update existing files with custom content
            for (const file of enhancedFiles) {
                try {
                    // First, get the current file to get its SHA
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

                    // Update the file
                    const updateResponse = await fetch(`${baseApiUrl}/${file.path}`, {
                        method: 'PUT',
                        headers: {
                            'Authorization': `token ${githubToken}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            message: `Update ${file.path} with custom content`,
                            content: Buffer.from(file.content).toString('base64'),
                            sha: sha,
                        }),
                    });

                    if (updateResponse.ok) {
                        console.log(`Updated file: ${file.path}`);
                    } else {
                        const errorData = await updateResponse.json();
                        console.error(`Failed to update ${file.path}:`, errorData);
                    }
                } catch (error) {
                    console.error(`Error updating file ${file.path}:`, error);
                }
            }

            return {
                repositoryUrl,
                repositoryName,
                projectName,
                requirements,
                contentGenerated: true,
                stylingCompleted: true,
                success: true,
            };

        } catch (error) {
            console.error('Error generating website content:', error);
            throw error;
        }
    },
});

function parseGeneratedContent(content: string, requirements: string) {
    // Extract specific content from the generated text
    const parsed = {
        heroTitle: extractSection(content, ['hero', 'headline', 'title']) || 'Welcome to Our Business',
        heroDescription: extractSection(content, ['hero', 'description', 'subtitle']) || 'We provide exceptional solutions for your needs.',
        aboutContent: extractSection(content, ['about', 'company', 'business']) || 'We are committed to excellence and customer satisfaction.',
        services: extractServices(content, requirements),
        callToAction: extractSection(content, ['cta', 'call to action', 'action']) || 'Get Started Today',
        businessType: inferBusinessType(requirements),
        industry: inferIndustry(requirements)
    };
    
    return parsed;
}

function extractSection(content: string, keywords: string[]): string | null {
    const lines = content.split('\\n');
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].toLowerCase();
        if (keywords.some(keyword => line.includes(keyword))) {
            // Look for the actual content in the next few lines
            for (let j = i; j < Math.min(i + 5, lines.length); j++) {
                const contentLine = lines[j].trim();
                if (contentLine && !contentLine.includes(':') && contentLine.length > 20) {
                    return contentLine;
                }
            }
        }
    }
    
    return null;
}

function extractServices(content: string, requirements: string): Array<{title: string, description: string}> {
    const defaultServices = [
        { title: 'Consultation', description: 'Expert guidance tailored to your specific needs.' },
        { title: 'Implementation', description: 'Professional execution of your project requirements.' },
        { title: 'Support', description: 'Ongoing assistance to ensure your continued success.' }
    ];
    
    // Try to extract specific services from requirements
    const businessType = inferBusinessType(requirements);
    
    switch (businessType) {
        case 'technology':
            return [
                { title: 'Software Development', description: 'Custom software solutions built to your specifications.' },
                { title: 'Technical Consulting', description: 'Expert advice on technology strategy and implementation.' },
                { title: 'System Integration', description: 'Seamless integration of your existing systems and new solutions.' }
            ];
        case 'consulting':
            return [
                { title: 'Strategic Planning', description: 'Comprehensive planning to achieve your business objectives.' },
                { title: 'Process Optimization', description: 'Streamline your operations for maximum efficiency.' },
                { title: 'Change Management', description: 'Guide your organization through successful transformations.' }
            ];
        case 'creative':
            return [
                { title: 'Creative Design', description: 'Innovative designs that capture your brand essence.' },
                { title: 'Brand Development', description: 'Build a strong, memorable brand identity.' },
                { title: 'Marketing Materials', description: 'Professional materials that drive engagement.' }
            ];
        case 'healthcare':
            return [
                { title: 'Patient Care', description: 'Comprehensive healthcare services focused on patient wellbeing.' },
                { title: 'Medical Consultation', description: 'Expert medical advice and treatment planning.' },
                { title: 'Health Education', description: 'Educational resources to promote healthy living.' }
            ];
        case 'education':
            return [
                { title: 'Learning Programs', description: 'Comprehensive educational programs designed for success.' },
                { title: 'Skills Development', description: 'Build essential skills for personal and professional growth.' },
                { title: 'Educational Consulting', description: 'Expert guidance on educational strategies and implementation.' }
            ];
        default:
            return defaultServices;
    }
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

function inferIndustry(requirements: string): string {
    const businessType = inferBusinessType(requirements);
    
    const industryMap: {[key: string]: string} = {
        'technology': 'Technology & Software',
        'consulting': 'Professional Services',
        'creative': 'Design & Marketing',
        'healthcare': 'Healthcare & Medical',
        'education': 'Education & Training',
        'restaurant': 'Food & Beverage',
        'retail': 'Retail & E-commerce',
        'general': 'Business Services'
    };
    
    return industryMap[businessType] || 'Business Services';
}

function generateEnhancedComponents(content: any, projectName: string) {
    return [
        {
            path: 'src/components/Hero.tsx',
            content: generateEnhancedHero(content, projectName)
        },
        {
            path: 'src/components/About.tsx',
            content: generateEnhancedAbout(content)
        },
        {
            path: 'src/components/Services.tsx',
            content: generateEnhancedServices(content)
        },
        {
            path: 'src/App.css',
            content: generateEnhancedCSS(content)
        }
    ];
}

function generateEnhancedHero(content: any, projectName: string): string {
    return `import React from 'react';

const Hero: React.FC = () => {
  return (
    <section id="home" style={heroStyles}>
      <div className="container" style={containerStyles}>
        <div style={contentStyles}>
          <h1 style={titleStyles}>
            ${content.heroTitle}
          </h1>
          <p style={subtitleStyles}>
            ${content.heroDescription}
          </p>
          <div style={buttonGroupStyles}>
            <a href="#contact" className="btn btn-primary" style={buttonStyles}>
              ${content.callToAction}
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

function generateEnhancedAbout(content: any): string {
    return `import React from 'react';

const About: React.FC = () => {
  return (
    <section id="about" className="section" style={aboutStyles}>
      <div className="container" style={containerStyles}>
        <div style={contentGridStyles}>
          <div style={textContentStyles}>
            <h2 className="section-title">About ${content.businessType === 'general' ? 'Us' : content.industry}</h2>
            <p className="section-subtitle">
              ${content.aboutContent}
            </p>
            <div style={featuresStyles}>
              <div style={featureStyles}>
                <h3 style={featureTitleStyles}>Professional Excellence</h3>
                <p style={featureTextStyles}>
                  We maintain the highest standards of quality and professionalism in everything we do.
                </p>
              </div>
              <div style={featureStyles}>
                <h3 style={featureTitleStyles}>Customer Focus</h3>
                <p style={featureTextStyles}>
                  Your success is our priority. We work closely with you to achieve your goals.
                </p>
              </div>
              <div style={featureStyles}>
                <h3 style={featureTitleStyles}>Innovation</h3>
                <p style={featureTextStyles}>
                  We stay ahead of industry trends to provide you with cutting-edge solutions.
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

function generateEnhancedServices(content: any): string {
    return `import React from 'react';

const Services: React.FC = () => {
  const services = ${JSON.stringify(content.services, null, 2)};

  return (
    <section id="services" className="section" style={servicesStyles}>
      <div className="container" style={containerStyles}>
        <h2 className="section-title">Our Services</h2>
        <p className="section-subtitle">
          Comprehensive ${content.industry.toLowerCase()} solutions designed to meet your specific needs and drive exceptional results.
        </p>
        
        <div style={servicesGridStyles}>
          {services.map((service, index) => (
            <div key={index} style={serviceCardStyles}>
              <div style={iconContainerStyles}>
                <img src={\`/images/service-\${index + 1}.svg\`} alt={service.title} style={iconStyles} />
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

function generateEnhancedCSS(content: any): string {
    // Enhanced CSS with better styling and animations
    return `.App {
  text-align: center;
}

:root {
  --primary-color: #3b82f6;
  --secondary-color: #1e40af;
  --accent-color: #60a5fa;
  --light-color: #dbeafe;
  --text-color: #1f2937;
  --text-light: #6b7280;
  --bg-color: #ffffff;
  --section-padding: 4rem 2rem;
  --border-radius: 0.75rem;
  --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

.section {
  padding: var(--section-padding);
  scroll-margin-top: 80px;
}

.section-title {
  font-size: 2.5rem;
  font-weight: bold;
  color: var(--text-color);
  margin-bottom: 1rem;
  position: relative;
}

.section-title::after {
  content: '';
  position: absolute;
  bottom: -10px;
  left: 50%;
  transform: translateX(-50%);
  width: 60px;
  height: 4px;
  background: linear-gradient(90deg, var(--primary-color), var(--accent-color));
  border-radius: 2px;
}

.section-subtitle {
  font-size: 1.2rem;
  color: var(--text-light);
  margin-bottom: 3rem;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
  line-height: 1.7;
}

.btn {
  display: inline-block;
  padding: 0.875rem 2rem;
  border-radius: var(--border-radius);
  text-decoration: none;
  font-weight: 600;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  border: none;
  font-size: 1rem;
  position: relative;
  overflow: hidden;
}

.btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
  transition: left 0.5s;
}

.btn:hover::before {
  left: 100%;
}

.btn-primary {
  background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
  color: white;
  box-shadow: var(--shadow);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.btn-secondary {
  background-color: transparent;
  color: var(--primary-color);
  border: 2px solid var(--primary-color);
}

.btn-secondary:hover {
  background-color: var(--primary-color);
  color: white;
  transform: translateY(-2px);
}

/* Enhanced animations */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fade-in-up {
  animation: fadeInUp 0.6s ease-out;
}

/* Responsive design */
@media (max-width: 1024px) {
  .section-title {
    font-size: 2.2rem;
  }
  
  .container {
    padding: 0 1.5rem;
  }
}

@media (max-width: 768px) {
  .section-title {
    font-size: 2rem;
  }
  
  .section {
    padding: 2rem 1rem;
  }
  
  .section-subtitle {
    font-size: 1.1rem;
  }
  
  .btn {
    padding: 0.75rem 1.5rem;
    font-size: 0.9rem;
  }
}

@media (max-width: 480px) {
  .section-title {
    font-size: 1.8rem;
  }
  
  .section-subtitle {
    font-size: 1rem;
  }
}

/* Smooth scrolling enhancement */
html {
  scroll-behavior: smooth;
}

/* Focus styles for accessibility */
.btn:focus,
a:focus {
  outline: 2px solid var(--accent-color);
  outline-offset: 2px;
}`;
}
