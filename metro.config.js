// Load polyfills FIRST before any other modules
require('./polyfills');

const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require('nativewind/metro');
 
const config = getDefaultConfig(__dirname);

// Optimize for faster Fast Refresh
config.watchFolders = [__dirname];

// Optimize resolver for better performance
const path = require('path');
config.resolver = {
  ...config.resolver,
  sourceExts: [...(config.resolver?.sourceExts || []), 'css'],
  assetExts: (config.resolver?.assetExts || []).filter((ext) => ext !== 'css'),
  // Add path alias support
  alias: {
    '@': path.resolve(__dirname),
  },
  // Exclude unnecessary folders from watching (improves performance)
  blockList: [
    /node_modules\/.*\/node_modules\/react-native\/.*/,
  ],
};

// Optimize transformer for faster builds
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    ...config.transformer?.minifierConfig,
    keep_classnames: true,
    keep_fnames: true,
  },
  // Enable inline requires for faster startup
  inlineRequires: true,
};

// Increase max workers for faster bundling
config.maxWorkers = 2;
 
module.exports = withNativeWind(config, { input: './app/global.css' })