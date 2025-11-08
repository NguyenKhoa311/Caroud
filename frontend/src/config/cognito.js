const cognitoConfig = {
  region: process.env.REACT_APP_AWS_REGION || 'ap-southeast-1',
  userPoolId: process.env.REACT_APP_USER_POOL_ID || 'ap-southeast-1_tJBQES8Dg',
  userPoolWebClientId: process.env.REACT_APP_USER_POOL_WEB_CLIENT_ID || '64pcsktp7q8v369bo03j0cfrhd',
  oauth: {
    domain: process.env.REACT_APP_COGNITO_DOMAIN || 'https://ap-southeast-1tjbqes8dg.auth.ap-southeast-1.amazoncognito.com/login?client_id=64pcsktp7q8v369bo03j0cfrhd&response_type=code&scope=email+openid&redirect_uri=https%3A%2F%2Fcaroud.click',
    scope: ['email', 'openid', 'profile'],
    redirectSignIn: process.env.REACT_APP_REDIRECT_SIGN_IN || 'https://caroud.click',
    redirectSignOut: process.env.REACT_APP_REDIRECT_SIGN_OUT || 'https://caroud.click',
    responseType: 'code'
  }
};

export default cognitoConfig;
