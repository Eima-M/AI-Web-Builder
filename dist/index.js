"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mastra = void 0;
const mastra_1 = require("@mastra/core/mastra");
const webAgent_1 = require("./agents/webAgent");
const webBuilder_1 = require("./workflows/webBuilder");
exports.mastra = new mastra_1.Mastra({
    workflows: { webBuilderWorkflow: webBuilder_1.webBuilderWorkflow },
    agents: { webAgent: webAgent_1.webAgent, webBuilderAgent: webBuilder_1.webBuilderAgent }
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
