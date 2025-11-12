const cognitoConfig = {
  region: process.env.REACT_APP_AWS_REGION || 'ap-southeast-1',
  userPoolId: process.env.REACT_APP_USER_POOL_ID || 'ap-southeast-1_MffQbWHoJ',
  userPoolWebClientId: process.env.REACT_APP_USER_POOL_WEB_CLIENT_ID || '7r5jtsi7pmgvpuu3hroso4qm7m',
  oauth: {
    domain: process.env.REACT_APP_COGNITO_DOMAIN || 'https://ap-southeast-1mffqbwhoj.auth.ap-southeast-1.amazoncognito.com/login?client_id=7r5jtsi7pmgvpuu3hroso4qm7m&response_type=code&scope=email+openid+profile&redirect_uri=https%3A%2F%2Fcaroud.click',
    scope: ['email', 'openid', 'profile'],
    redirectSignIn: process.env.REACT_APP_REDIRECT_SIGN_IN || 'https://caroud.click',
    redirectSignOut: process.env.REACT_APP_REDIRECT_SIGN_OUT || 'https://caroud.click',
    responseType: 'code'
  }
};

export default cognitoConfig;
