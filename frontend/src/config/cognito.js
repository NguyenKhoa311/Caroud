// Detect environment - use localhost for development, production URL for deployed
const isDevelopment = process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost';
const redirectUrl = isDevelopment ? 'http://localhost:3000' : 'https://caroud.click';

const cognitoConfig = {
  region: process.env.REACT_APP_AWS_REGION || 'ap-southeast-1',
  userPoolId: process.env.REACT_APP_USER_POOL_ID || 'ap-southeast-1_MffQbWHoJ',
  userPoolWebClientId: process.env.REACT_APP_USER_POOL_WEB_CLIENT_ID || '7r5jtsi7pmgvpuu3hroso4qm7m',
  
  // OIDC configuration for react-oidc-context
  authority: 'https://cognito-idp.ap-southeast-1.amazonaws.com/ap-southeast-1_MffQbWHoJ',
  client_id: '7r5jtsi7pmgvpuu3hroso4qm7m',
  redirect_uri: redirectUrl,
  post_logout_redirect_uri: redirectUrl, // Changed from /login to root URL
  response_type: 'code',
  scope: 'email openid profile',
  
  // Legacy oauth config (for aws-amplify if needed)
  oauth: {
    domain: 'ap-southeast-1mffqbwhoj.auth.ap-southeast-1.amazoncognito.com',
    scope: ['email', 'openid', 'profile'],
    redirectSignIn: redirectUrl,
    redirectSignOut: redirectUrl, // Changed from /login to root URL
    responseType: 'code'
  }
};

export default cognitoConfig;
