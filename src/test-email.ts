import 'dotenv/config';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

async function testEmail() {
  try {
    console.log('Testing email with Resend...');
    console.log('API Key exists:', !!process.env.RESEND_API_KEY);
    console.log('API Key prefix:', process.env.RESEND_API_KEY?.substring(0, 8) + '...');
    
    const result = await resend.emails.send({
      from: 'Website Consultant <onboarding@resend.dev>',
      to: ['eimamiyasaka@gmail.com'], // Replace with your email
      subject: 'Test Email from AI Web Builder',
      html: '<h1>Test Email</h1><p>This is a test email to verify the setup works.</p>',
      text: 'Test Email - This is a test email to verify the setup works.'
    });
    
    console.log('Email result:', result);
    
    if (result.error) {
      console.error('Resend API Error:', result.error);
    } else {
      console.log('✅ Email sent successfully!');
      console.log('Message ID:', result.data?.id);
    }
    
  } catch (error) {
    console.error('❌ Error sending test email:', error);
  }
}

testEmail();
