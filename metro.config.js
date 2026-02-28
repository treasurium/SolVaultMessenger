const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

const config = {
  resolver: {
    extraNodeModules: {
      stream: require.resolve('stream-browserify'),
      crypto: require.resolve('crypto-browserify'),
      string_decoder: require.resolve('string_decoder'),
      events: require.resolve('events'),
      process: require.resolve('process/browser'),
      buffer: require.resolve('buffer'),
      vm: require.resolve('./empty-module.js'),
      http: require.resolve('./empty-module.js'),
      https: require.resolve('./empty-module.js'),
      os: require.resolve('./empty-module.js'),
      fs: require.resolve('./empty-module.js'),
      path: require.resolve('./empty-module.js'),
      zlib: require.resolve('./empty-module.js'),
      net: require.resolve('./empty-module.js'),
      tls: require.resolve('./empty-module.js'),
      dns: require.resolve('./empty-module.js'),
    },
  },
};

module.exports = mergeConfig(defaultConfig, config);
