import dotenv from 'dotenv';
import { BrevoClient } from '@getbrevo/brevo';
import { isEmailConfigured, sendOtpEmail } from '../utils/emailService.js';

dotenv.config();

console.log('--- Testing Brevo Configuration ---');

const apiKey = process.env.BREVO_API_KEY;
console.log('BREVO_API_KEY present:', Boolean(apiKey && !apiKey.includes('YOUR_')));
console.log('isEmailConfigured():', isEmailConfigured());

async function run() {
  if (apiKey && !apiKey.includes('YOUR_')) {
    console.log('\nTesting Brevo Account Authentication...');
    const client = new BrevoClient({ apiKey });
    try {
      const account = await client.account.getAccount();
      console.log('✓ Brevo Account Authenticated successfully!');
      console.log(`  Account Email: ${account.email}`);
      console.log(`  Company: ${account.companyName}`);
      console.log(`  Plan: ${account.plan?.[0]?.type || 'Standard'}`);
    } catch (err) {
      console.error('✗ Failed to authenticate with Brevo API:', err.message || err);
    }
  } else {
    console.log('\n[Info] No live BREVO_API_KEY set yet. Testing simulated fallback flow:');
    const result = await sendOtpEmail('guest@example.com', '123456', 10);
    console.log('Result:', result);
  }
}

run();

