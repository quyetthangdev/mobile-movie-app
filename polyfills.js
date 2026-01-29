// Polyfill for Array.toReversed() for Node.js < 20
// This must be loaded before any metro-config modules
if (!Array.prototype.toReversed) {
  Array.prototype.toReversed = function() {
    return [...this].reverse();
  };
}

