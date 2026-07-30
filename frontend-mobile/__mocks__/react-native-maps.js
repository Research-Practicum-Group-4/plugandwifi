const React = require('react');
const { View } = require('react-native');

function MapView({ children, ...props }) {
  return React.createElement(View, props, children);
}

function Marker({ children, ...props }) {
  return React.createElement(View, props, children);
}

module.exports = MapView;
module.exports.default = MapView;
module.exports.Marker = Marker;
