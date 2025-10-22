const cognitoConfig = {
  region: process.env.REACT_APP_AWS_REGION || 'us-east-1',
  userPoolId: process.env.REACT_APP_USER_POOL_ID || 'your-user-pool-id',
  userPoolWebClientId: process.env.REACT_APP_USER_POOL_WEB_CLIENT_ID || 'your-client-id',
  oauth: {
    domain: process.env.REACT_APP_COGNITO_DOMAIN || 'your-domain.auth.us-east-1.amazoncognito.com',
    scope: ['email', 'openid', 'profile'],
    redirectSignIn: process.env.REACT_APP_REDIRECT_SIGN_IN || 'http://localhost:3000/',
    redirectSignOut: process.env.REACT_APP_REDIRECT_SIGN_OUT || 'http://localhost:3000/',
    responseType: 'code'
  }
};

export default cognitoConfig;
