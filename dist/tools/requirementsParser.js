"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseRequirements = void 0;
const workflows_1 = require("@mastra/core/workflows");
const zod_1 = require("zod");
exports.parseRequirements = (0, workflows_1.createStep)({
    id: 'parse-requirements',
    description: 'Parse website requirements report and extract project information',
    inputSchema: zod_1.z.object({
        requirementsReport: zod_1.z.string().describe('The complete website requirements report text'),
    }),
    outputSchema: zod_1.z.object({
        projectName: zod_1.z.string().describe('Extracted or generated project name'),
        requirements: zod_1.z.string().describe('The original requirements report'),
        extractedInfo: zod_1.z.object({
            purpose: zod_1.z.string().optional().describe('Main purpose of the website'),
            targetAudience: zod_1.z.string().optional().describe('Target audience'),
            businessObjectives: zod_1.z.string().optional().describe('Business objectives'),
        }).describe('Key information extracted from the report'),
        success: zod_1.z.boolean().describe('Whether parsing was successful'),
    }),
    execute: async (params) => {
        try {
            // Extract from the correct location
            const { requirementsReport } = params.inputData || params.context || params.data || params.input || params;
            if (!requirementsReport || requirementsReport.trim() === '') {
                throw new Error('Requirements report is required but was not provided or is empty');
            }
            console.log('Parsing website requirements report...');
            // Extract project name from the report
            // Look for patterns like "PROJECT OVERVIEW & PURPOSE" section
            let projectName = '';
            let purpose = '';
            let targetAudience = '';
            let businessObjectives = '';
            const lines = requirementsReport.split('\n');
            // Try to extract project name from various patterns
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                // Look for project name patterns
                if (line.includes('Main purpose/goal:') || line.includes('- Main purpose/goal:')) {
                    purpose = line.replace(/.*Main purpose\/goal:\s*/, '').trim();
                }
                // Extract target audience
                if (line.includes('Target audience:') || line.includes('- Target audience:')) {
                    targetAudience = line.replace(/.*Target audience:\s*/, '').trim();
                }
                // Extract business objectives
                if (line.includes('Business objectives:') || line.includes('- Business objectives:')) {
                    businessObjectives = line.replace(/.*Business objectives:\s*/, '').trim();
                }
                // Look for explicit project name mentions
                if (line.toLowerCase().includes('project name:') || line.toLowerCase().includes('website name:')) {
                    const extractedName = line.replace(/.*(?:project|website)\s+name:\s*/i, '').trim();
                    if (extractedName) {
                        projectName = extractedName;
                    }
                }
            }
            // Generate concise project name from purpose if not explicitly provided
            if (!projectName && purpose) {
                projectName = generateConciseProjectName(purpose, targetAudience);
            }
            // Fallback project name if nothing was extracted
            if (!projectName) {
                const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
                projectName = `website-${timestamp}`;
            }
            // Ensure project name is valid for GitHub (clean and short)
            projectName = sanitizeProjectName(projectName);
            console.log(`Generated concise project name: ${projectName}`);
            console.log(`Extracted purpose: ${purpose || 'Not specified'}`);
            console.log(`Extracted target audience: ${targetAudience || 'Not specified'}`);
            return {
                projectName,
                requirements: requirementsReport,
                extractedInfo: {
                    purpose: purpose || undefined,
                    targetAudience: targetAudience || undefined,
                    businessObjectives: businessObjectives || undefined,
                },
                success: true,
            };
        }
        catch (error) {
            console.error('Error parsing requirements:', error);
            throw error;
        }
    }
});
// Helper function to generate concise project names
function generateConciseProjectName(purpose, targetAudience) {
    // Extract key terms from purpose
    const keyTerms = extractKeyTerms(purpose);
    // Try to create a concise name from key terms
    if (keyTerms.length > 0) {
        // Take the first 2-3 most relevant terms
        const relevantTerms = keyTerms.slice(0, 3);
        return relevantTerms.join('-').toLowerCase();
    }
    return '';
}
// Helper function to extract key terms from purpose text
function extractKeyTerms(text) {
    // Common words to ignore
    const stopWords = [
        'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
        'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
        'create', 'build', 'make', 'develop', 'design', 'website', 'site', 'web', 'page'
    ];
    // Extract words, filter stopwords, and prioritize meaningful terms
    const words = text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ') // Remove special characters
        .split(/\s+/)
        .filter(word => word.length > 2 && !stopWords.includes(word))
        .filter(word => word.length <= 12); // Avoid very long words
    // Prioritize certain types of words
    const businessTerms = ['portfolio', 'business', 'shop', 'store', 'blog', 'agency', 'studio', 'company'];
    const priorityWords = words.filter(word => businessTerms.includes(word));
    // Return priority words first, then other words
    return [...priorityWords, ...words.filter(word => !priorityWords.includes(word))];
}
// Helper function to sanitize and ensure valid GitHub project name
function sanitizeProjectName(name) {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Keep only letters, numbers, spaces, hyphens
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
        .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
        .substring(0, 25) // Limit to 25 characters for conciseness
        .replace(/-+$/, '') // Remove trailing hyphens after truncation
        || `project-${Date.now().toString().slice(-6)}`; // Fallback with timestamp
}
