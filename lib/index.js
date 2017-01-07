//
// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
//

'use strict';

const objectPath = require('object-path');

// Configuration Assumptions:
// In URL syntax, we define a custom scheme of "env://" which resolves
// an environment variable in the object, directly overwriting the
// original value.
//
// For example:
//   "env://HOSTNAME" will resolve on a Windows machine to its hostname
//
// Note that this use of a custom scheme called "env" is not an officially
// recommended or supported thing, but it has worked great for us!

const envProtocol = 'env://';

function identifyPaths(node, prefix) {
  prefix = prefix !== undefined ? prefix + '.' : '';
  const paths = {};
  for (const property in node) {
    const value = node[property];
    if (typeof value === 'object') {
      Object.assign(paths, identifyPaths(value, prefix + property));
      continue;
    }
    if (typeof value !== 'string') {
      continue;
    }
    if (!value.startsWith(envProtocol)) {
      continue;
    }
    paths[prefix + property] = value.substr(envProtocol.length());
  }
  return paths;
}

function defaultProvider() {
  return {
    get: (key) => {
      return process.env[key];
    },
  };
}

function createClient(options) {
  options = options || {};
  let provider = options.provider || defaultProvider();
  return {
    resolveObjectVariables: (object, callback) => {
      let paths = null;
      try {
        paths = identifyPaths(object);
      } catch(parseError) {
        return callback(parseError);
      }
      const names = Object.getOwnPropertyNames(paths);
      for (let i = 0; i < names.length; i++) {
        const path = names[i];
        const variableName = paths[path];
        objectPath.set(object, path, provider.get(variableName));
      }
    },
  };
}

module.exports = createClient;
