"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.webBuilderAgent = exports.webBuilderWorkflow = void 0;
const openai_1 = require("@ai-sdk/openai");
const agent_1 = require("@mastra/core/agent");
const workflows_1 = require("@mastra/core/workflows");
const zod_1 = require("zod");
const tools_1 = require("../tools");
const llm = (0, openai_1.openai)(process.env.MODEL ?? "gpt-4.1");
const webBuilderAgent = new agent_1.Agent({
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
exports.webBuilderAgent = webBuilderAgent;
// Create the workflow
const webBuilderWorkflow = (0, workflows_1.createWorkflow)({
    id: 'web-builder-workflow',
    inputSchema: zod_1.z.object({
        requirementsReport: zod_1.z.string().describe('Copy and paste the complete website requirements report text from the webAgent'),
    }),
    outputSchema: zod_1.z.object({
        repositoryUrl: zod_1.z.string().describe('The URL of the created repository'),
        repositoryName: zod_1.z.string().describe('The name of the created repository'),
        projectName: zod_1.z.string().describe('The extracted project name'),
        frameworkInitialized: zod_1.z.boolean().describe('Whether the framework was successfully initialized'),
        websiteCompleted: zod_1.z.boolean().describe('Whether the complete website was successfully created'),
        deploymentReady: zod_1.z.boolean().describe('Whether the website is ready for deployment'),
        requirements: zod_1.z.string().describe('The original requirements report'),
        success: zod_1.z.boolean().describe('Whether the workflow completed successfully'),
    }),
})
    .then(tools_1.parseRequirements)
    .then(tools_1.createRepository)
    .then(tools_1.initializeFramework)
    .then(tools_1.generateWebsiteStructure)
    .then(tools_1.generateWebsiteContent)
    .then(tools_1.finalizeWebsite);
exports.webBuilderWorkflow = webBuilderWorkflow;
webBuilderWorkflow.commit();
