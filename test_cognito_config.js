#!/usr/bin/env node
/**
 * Quick test to verify Cognito configuration is loaded correctly
 */

require('dotenv').config({ path: './frontend/.env' });

console.log('\n' + '='.repeat(70));
console.log('🔍 FRONTEND COGNITO CONFIGURATION TEST');
console.log('='.repeat(70));

const configs = {
  'REACT_APP_AWS_REGION': process.env.REACT_APP_AWS_REGION,
  'REACT_APP_USER_POOL_ID': process.env.REACT_APP_USER_POOL_ID,
  'REACT_APP_USER_POOL_CLIENT_ID': process.env.REACT_APP_USER_POOL_CLIENT_ID,
  'REACT_APP_OAUTH_DOMAIN': process.env.REACT_APP_OAUTH_DOMAIN,
  'REACT_APP_REDIRECT_SIGN_IN': process.env.REACT_APP_REDIRECT_SIGN_IN,
  'REACT_APP_REDIRECT_SIGN_OUT': process.env.REACT_APP_REDIRECT_SIGN_OUT,
};

let allOk = true;
Object.entries(configs).forEach(([key, value]) => {
  if (value && !value.includes('your-')) {
    console.log(`✅ ${key}: ${value}`);
  } else {
    console.log(`❌ ${key}: NOT SET or PLACEHOLDER`);
    allOk = false;
  }
});

console.log('='.repeat(70));
if (allOk) {
  console.log('✅ ALL FRONTEND CONFIGS ARE VALID!');
  console.log('✅ Ready to start: npm start');
} else {
  console.log('⚠️  PLEASE FIX MISSING CONFIGURATIONS');
}
console.log('='.repeat(70) + '\n');
