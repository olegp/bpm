
var REGISTRY_URL = '//npm-proxy-cors.herokuapp.com/',
    TGZ_URL = '//registry.npmjs.org/';

function loadFile(url, callback, binary) {
  var xhr = new XMLHttpRequest();
  xhr.open("GET", url, true);
  if(binary) {
    xhr.responseType = "arraybuffer";
  }
  xhr.onload = function (event) {
    callback(binary ? xhr.response : xhr.responseText);
  };
  xhr.send(null);
}

function loadTgz(url, callback) {
  loadFile(url, function(file) {
    var gunzip = new Zlib.Gunzip(new Uint8Array(file));
    var plain = gunzip.decompress();
    callback(untar(plain));
  }, true);
}

function loadPkg(url, callback) {
  loadFile(url, function(arrayBuffer) {
    var files = {};
    var decoder = new TextDecoder();
    var dataView = new DataView(arrayBuffer);
    var position = 0;
    while(position < arrayBuffer.byteLength) {
      var length = dataView.getUint32(position, true);
      position += 4;
      var name = decoder.decode(new DataView(arrayBuffer, position, length));
      position += length;
      var dataLength = dataView.getUint32(position, true);
      position += 4;
      var data = new DataView(arrayBuffer, position, dataLength);
      position += dataLength;
      files[name] = data;
    }
    callback(files);
  }, true);
}

function loadJS(url, callback) {
  loadFile(url, function(string) {
    callback({
      "index.js": string
    });
  });
}

function loadJSON(url, callback) {
  loadFile(url, function(string) {
    callback({
      "index.js": "module.exports = " + string + ";"
    });
  });
}

var require = function () {
  var cache = {};
  function resolve(a, b) {
    a = a.split('/').slice(0, -1);
    b = b.split('/');
    for (var i = 0; i < b.length; i++) {
      var e = b[i];
      if (e === '..') {
        a.pop();
      } else if (e !== '.') {
        a.push(e);
      }
    }
    return a.join('/');
  }
  var require = function(name, context) {
    name = resolve(context || '', name);
    if(packages.hasOwnProperty(name)) {
      return packages[name];
    }
    if (cache.hasOwnProperty(name)) {
      return cache[name].exports;
    }
    if(files.hasOwnProperty(name)) {
      return files[name];
    }
    if (!modules.hasOwnProperty(name)) {
      throw new Error("Cannot find module '" + name + "'");
    }
    var module = cache[name] = {
      exports:{}
    };
    modules[name](function(n) {
      return require(n, name);
    }, module.exports, module);
    return module.exports;
  };
  return require;
};

var packageExports = {};

function loadPackage(name, version, callback) {
  packageExports[name] = packageExports[name] || {};
  if(packageExports[name] && packageExports[name][version]) {
    return callback(packageExports[name][version]);
  }
  //TODO deal with .pkg, .js(on)
  var url = TGZ_URL + name + '/-/' + name + '-' + version + '.tgz';
  loadTgz(url, function(files) {
    var decoder = new TextDecoder();
    function decode(arg) {
      if(typeof arg == 'string' || arg instanceof String) return string;
      return decoder.decode(arg);
    }
    function extension(file) {
      return file.substr(file.lastIndexOf('.') + 1);
    }
    var packageJson;
    var r = [];
    r.push('(function() {');
    r.push('var modules = {};');
    r.push('var require = (' + require.toString() + ')();');
    for(var file in files) {
      var ext = extension(file);
      if(ext == 'js') {
        var module = file.substr(0, file.length - ext.length - 1);
        r.push('modules["' + module + '"] = function(require, exports, module) {');
        r.push(decode(files[file]));
        r.push('};\n');
      } else if(ext == 'json') {
        var json = decode(files[file]);
        if(file == 'package.json') packageJson = JSON.parse(json);
        r.push('modules["' + file + '"] = ' + json + ';\n');
      } else if(['txt', 'md', 'html', 'css'].indexOf(ext) != -1) {
        r.push('modules["' + file + '"] = ' + JSON.stringify(decode(files[file])) + ';\n');
      }
    }
    var main;
    if(packageJson) {
      main = packageJson.main.slice(0, -3);
    }
    r.push('return require("' + main + '");');
    r.push('})();');
    var code = r.join('\n');

    var global = window;
    if(packageJson && packageJson.dependencies && Object.keys(packageJson.dependencies).length) {
      loadPackages(packageJson.dependencies, function(packages) {
        // require/eval needs: files, packages
        callback(packageExports[name][version] = eval(code));
      });
    } else {
      var packages = {};
      callback(packageExports[name][version] = eval(code));
    }
  });
}

// //npmjsonp.herokuapp.com/?path=
// //npm-proxy-cors.herokuapp.com/

var packageVersions = {};

function loadVersions(package, callback) {
  if(packageVersions[package]) {
    callback(packageVersions[package])
  } else {
    loadFile(REGISTRY_URL + package, function (json) {
      var versions = packageVersions[package] = Object.keys(JSON.parse(json).versions);
      callback(versions);
    });
  }
}

function loadVersionedPackage(package, version, callback) {
  var match = semver.clean(version);
  if(match) {
    loadPackage(package, match, callback);
  } else {
    loadVersions(package, function(versions) {
      match = semver.maxSatisfying(versions, version);
      loadPackage(package, match, callback);
    });
  }
}

function loadPackages(packages, callback) {
  var results = {}, loaded = 0, count = Object.keys(packages).length;
  for(var name in packages) {
    (function(name) {
      loadVersionedPackage(name, packages[name], function (package) {
        results[name] = package;
        loaded++;
        if (loaded == count) {
          callback(results);
        }
      });
    })(name);
  }
}



function main(package, version, callback) {
  if(arguments.length == 2) {
    callback = version;
    version = '*';
  }
  loadVersionedPackage(package, version, callback);
}

if (typeof define === 'function' && define.amd) {
  define(function () {
    return main;
  });
} else  if (typeof module !== 'undefined' && module.exports) {
  module.exports = main;
} else {
  this.require = main;
}