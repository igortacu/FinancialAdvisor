const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure proper platform support
config.resolver.platforms = ['ios', 'android', 'native'];

// Add server configuration
config.server = {
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      // Add platform header if missing
      if (!req.headers['expo-platform'] && req.url.includes('/_expo/')) {
        req.headers['expo-platform'] = 'ios';
      }
      return middleware(req, res, next);
    };
  },
};

module.exports = config;
