import { Mastra } from '@mastra/core/mastra';

import { webAgent } from './agents/webAgent';
import { webBuilderWorkflow, webBuilderAgent } from './workflows/webBuilder';

export const mastra = new Mastra({
  workflows: { webBuilderWorkflow },
  agents: { webAgent, webBuilderAgent }
});

// async function runWebAgent() {
//   try {
//     console.log('🤖 Starting Website Consultant Agent...\n');
    
//     const result = await webAgent.generate([
//       {
//         role: 'user',
//         content: 'Hello! I would like to build a website. Can you help me gather the requirements?'
//       }
//     ]);
    
//     console.log('Agent Response:');
//     console.log(result.text);
    
//   } catch (error) {
//     console.error('Error running agent:', error);
//   }
// }

// // Run the agent if this file is executed directly
// if (require.main === module) {
//   runWebAgent();
// }
