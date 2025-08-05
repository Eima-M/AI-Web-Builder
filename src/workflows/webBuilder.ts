import { openai } from '@ai-sdk/openai';
import { Agent } from '@mastra/core/agent';
import { createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { 
    parseRequirements, 
    createRepository, 
    initializeFramework, 
    generateWebsiteStructure, 
    generateWebsiteContent, 
    finalizeWebsite 
} from '../tools';

const llm = openai(process.env.MODEL ?? "gpt-4.1");

const webBuilderAgent = new Agent({
    name: 'Web Builder',
    model: llm,
    instructions: `
        You are an expert web developer specializing in creating professional React websites. 
        
        Your role is to:
        1. Analyze website requirements thoroughly
        2. Generate modern, responsive React components
        3. Create engaging, professional content tailored to the business
        4. Implement clean, accessible code following best practices
        5. Ensure the website is mobile-responsive and SEO-friendly
        
        Always focus on:
        - Professional, clean design
        - User experience and accessibility
        - Modern React patterns and TypeScript
        - Responsive design principles
        - Business-appropriate content and messaging
        
        When generating content, make it specific to the business type and target audience mentioned in the requirements.
        
        For website structure analysis, provide detailed insights about:
        - Business type identification
        - Target audience analysis
        - Appropriate color schemes and styling
        - Content structure recommendations
        - Component hierarchy suggestions
        
        For content generation, create:
        - Compelling headlines and descriptions
        - Business-specific service offerings
        - Professional calls-to-action
        - Industry-appropriate messaging
        - Engaging about section content
    `,
});

// Create the workflow
const webBuilderWorkflow = createWorkflow({
    id: 'web-builder-workflow',
    inputSchema: z.object({
        requirementsReport: z.string().describe('Copy and paste the complete website requirements report text from the webAgent'),
    }),
    outputSchema: z.object({
        repositoryUrl: z.string().describe('The URL of the created repository'),
        repositoryName: z.string().describe('The name of the created repository'),
        projectName: z.string().describe('The extracted project name'),
        frameworkInitialized: z.boolean().describe('Whether the framework was successfully initialized'),
        websiteCompleted: z.boolean().describe('Whether the complete website was successfully created'),
        deploymentReady: z.boolean().describe('Whether the website is ready for deployment'),
        requirements: z.string().describe('The original requirements report'),
        success: z.boolean().describe('Whether the workflow completed successfully'),
    }),
})
    .then(parseRequirements)
    .then(createRepository)
    .then(initializeFramework)
    .then(generateWebsiteStructure)
    .then(generateWebsiteContent)
    .then(finalizeWebsite);

webBuilderWorkflow.commit();

export { webBuilderWorkflow, webBuilderAgent };