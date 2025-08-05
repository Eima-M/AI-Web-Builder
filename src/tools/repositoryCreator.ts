import { createStep } from '@mastra/core/workflows';
import { z } from 'zod';

export const createRepository = createStep({
    id: 'create-repository',
    description: 'Create a new GitHub repository',
    inputSchema: z.object({
        projectName: z.string().describe('The name of the new repository'),
        requirements: z.string().describe('The original requirements report'),
        extractedInfo: z.object({
            purpose: z.string().optional().describe('Main purpose of the website'),
            targetAudience: z.string().optional().describe('Target audience'),
            businessObjectives: z.string().optional().describe('Business objectives'),
        }).describe('Key information extracted from the report'),
        success: z.boolean().describe('Whether parsing was successful'),
    }),
    outputSchema: z.object({
        repositoryUrl: z.string().describe('The URL of the created repository'),
        repositoryName: z.string().describe('The name of the created repository'),
        projectName: z.string().describe('The project name'),
        requirements: z.string().describe('The original requirements report'),
        extractedInfo: z.object({
            purpose: z.string().optional().describe('Main purpose of the website'),
            targetAudience: z.string().optional().describe('Target audience'),
            businessObjectives: z.string().optional().describe('Business objectives'),
        }).describe('Key information extracted from the report'),
        success: z.boolean().describe('Whether the repository was created successfully'),
    }),
    execute: async (params: any) => {
        try {
            // Extract from the correct location - params.inputData
            const { projectName, requirements, extractedInfo, success } = params.inputData || params.context || params.data || params.input || params;
            
            // Validate that projectName exists and is not empty
            if (!projectName || projectName.trim() === '') {
                throw new Error('Project name is required but was not provided or is empty');
            }
            
            if (!success) {
                throw new Error('Requirements parsing failed, cannot create repository');
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
                    description: `Website project: ${repoName}${extractedInfo?.purpose ? ` - ${extractedInfo.purpose.substring(0, 100)}` : ''}`,
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
                projectName,
                requirements,
                extractedInfo,
                success: true,
            };

        } catch (error) {
            console.error('Error creating repository:', error);
            throw error;
        }
    }
});
