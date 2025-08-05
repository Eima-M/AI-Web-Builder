# AI Website Builder - Updated Workflow Guide

## Overview

The webBuilder workflow has been updated to accept website requirements reports from the webAgent instead of just a project name. This allows for more intelligent repository creation based on comprehensive website requirements.

## Workflow Process

### 1. Requirements Gathering (webAgent)
- Use the webAgent to conduct a thorough consultation
- The agent will gather comprehensive website requirements
- After completion, the agent will provide a formatted requirements report
- The agent will offer to email the report as a downloadable text file

### 2. Website Building (webBuilder Workflow)

The webBuilder workflow now has these steps:

1. **parseRequirements** - Extracts project information from the requirements report
2. **createRepository** - Creates a GitHub repository with an intelligent name and description
3. **initializeFramework** - Sets up a complete Vite + React + TypeScript project

## How to Use

### Step 1: Get Requirements Report
1. Start a conversation with the webAgent
2. Complete the requirements consultation
3. Receive the requirements report (either via email or copy the text)

### Step 2: Run webBuilder Workflow
1. Navigate to the Mastra playground at `http://localhost:4111`
2. Find the "web-builder-workflow"
3. In the input field, paste the entire requirements report text
4. Execute the workflow

### Example Requirements Report Format
```
WEBSITE REQUIREMENTS REPORT
Generated: 8/3/2025
===================================

PROJECT OVERVIEW & PURPOSE
- Main purpose/goal: Create a modern portfolio website for a freelance graphic designer
- Target audience: Potential clients, creative agencies, and design studios
- Key visitor actions: View portfolio, contact for projects, download resume
- Business objectives: Increase client inquiries by 40%, showcase recent work
- Existing visual assets: Logo, brand colors (blue and orange), sample work images

===================================
End of Report
```

## What the Workflow Does

1. **Parses the requirements** to extract:
   - Project name (generated from purpose if not specified)
   - Main purpose/goal
   - Target audience
   - Business objectives

2. **Creates a GitHub repository** with:
   - Intelligent naming based on the project purpose
   - Descriptive repository description
   - Private repository setting

3. **Initializes a React framework** with:
   - Vite + React + TypeScript setup
   - Complete project structure
   - Package.json with all dependencies
   - Ready-to-run development environment

## Output

The workflow returns:
- `repositoryUrl` - Link to the created GitHub repository
- `repositoryName` - Name of the repository
- `projectName` - Extracted project name
- `requirements` - Original requirements report
- `frameworkInitialized` - Success status
- `success` - Overall workflow success

## Requirements

- Valid GitHub token in `GITHUB_TOKEN` environment variable
- Mastra development server running (`npx mastra dev`)
- Completed requirements report from webAgent

## Benefits

- **Intelligent naming**: Project names are automatically generated from the website purpose
- **Rich descriptions**: Repository descriptions include project context
- **Manual review**: Users can review requirements before starting development
- **Complete setup**: Generated projects are immediately ready for development
- **Traceability**: Original requirements are preserved throughout the process
