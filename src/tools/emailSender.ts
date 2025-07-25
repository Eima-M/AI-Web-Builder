import { Tool } from '@mastra/core/tools';
import { z } from 'zod';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export const emailSender = new Tool({
  id: 'emailSender',
  description: 'Send website requirements report via email',
  inputSchema: z.object({
    recipientEmail: z.string().email().describe('Email address to send the report to'),
    reportContent: z.string().describe('The complete website requirements report content'),
    subject: z.string().optional().describe('Custom email subject (optional)'),
    recipientName: z.string().optional().describe('Recipient name for personalization (optional)')
  }),
  outputSchema: z.object({
    success: z.boolean(),
    messageId: z.string().optional(),
    error: z.string().optional()
  }),
  execute: async (params: any) => {
    try {
      // Debug: Log the entire params structure
      console.log('Raw params received:', JSON.stringify(params, null, 2));
      
      // Extract input from params - Mastra passes data in params.context
      const input = params.context || params.data || params.input || params;
      console.log('Extracted input:', JSON.stringify(input, null, 2));
      
      const { recipientEmail, reportContent, subject, recipientName } = input;
      
      // Validate that we have the required fields
      if (!recipientEmail) {
        throw new Error('recipientEmail is required but was not provided');
      }
      if (!reportContent) {
        throw new Error('reportContent is required but was not provided');
      }
      
      console.log('Using recipientEmail:', recipientEmail);
      console.log('reportContent length:', reportContent?.length || 0);
      
      // Create a personalized email subject
      const emailSubject = subject || 'Your Website Requirements Report';
      
      // Create HTML formatted email content
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
            Website Requirements Report
          </h1>
          
          ${recipientName ? `<p>Hi ${recipientName},</p>` : '<p>Hello,</p>'}
          
          <p>Please find your comprehensive website requirements report below. This document contains all the information gathered during our consultation to help guide the development of your React-based website.</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <pre style="white-space: pre-wrap; font-family: 'Courier New', monospace; font-size: 14px; line-height: 1.5; margin: 0;">${reportContent}</pre>
          </div>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
          
          <p style="color: #666; font-size: 14px;">
            <strong>Next Steps:</strong><br>
            • Review the requirements carefully<br>
            • Share this report with your development team<br>
            • Contact us if you need any clarifications or modifications
          </p>
          
          <p style="color: #666; font-size: 14px;">
            Best regards,<br>
            Your Website Consultant Team
          </p>
        </div>
      `;

      // Send the email
      console.log('Attempting to send email to:', recipientEmail);
      console.log('From email:', 'onboarding@resend.dev');
      
      const data = await resend.emails.send({
        from: 'Website Consultant <onboarding@resend.dev>', // Use Resend's verified domain
        to: [recipientEmail],
        subject: emailSubject,
        html: htmlContent,
        text: `Website Requirements Report\n\n${reportContent}` // Fallback plain text
      });

      // Goal is to automatically send an email each to myself and to the client, but doesn't 
      // yet work due to this API error: 'You can only send testing emails to your own email 
      // address (eimamiyasaka@gmail.com). To send emails to other recipients, please verify 
      // a domain at resend.com/domains, and change the `from` address to an email using this 
      // domain.' For now, can only send to my email by giving the address each time to the agent
      // const eimaData = await resend.emails.send({
      //   from: 'Website Consultant <onboarding@resend.dev',
      //   to: 'eimamiyasaka@gmail.com',
      //   subject: emailSubject,
      //   html: htmlContent,
      //   text: `Website Requirements Report (EM COPY)\n\n${reportContent}`
      // });

      console.log('Email sent successfully:', data);
      
      // Check if there was an error in the response
      if (data.error) {
        throw new Error(`Resend API Error: ${data.error.message}`);
      }
      
      return {
        success: true,
        messageId: data.data?.id || 'Email sent successfully'
      };

    } catch (error) {
      console.error('Error sending email:', error);
      console.error('Full error details:', JSON.stringify(error, null, 2));
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
});