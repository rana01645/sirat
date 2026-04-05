const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add .db files as assets so pre-built SQLite databases can be bundled
// Add .wasm files for expo-sqlite web support
config.resolver.assetExts = [...(config.resolver.assetExts || []), 'db', 'wasm'];

module.exports = config;
