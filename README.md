# Browser Package Manager

BPM is NPM for the browser. It lets you use Node packages, i.e. [CommonJS packages](http://wiki.commonjs.org/wiki/Packages/1.1) hosted on [npmjs.org](https://npmjs.org), in the browser without a separate build step or need for a server, as is the case with Browserify and [AssetOne](https://github.com/olegp/assetone). Package dependencies & multiple versions of the same package are supported as is the ability to include and access non-JS resources, such as JSON, text and binary files inside the packages.

BPM works by making cross domain requests to the NPM registry, downloading the gzipped tarballs and extracting the contents in the browser with the help of typed arrays. All browsers with a [typed arrays implementation](http://caniuse.com/#feat=typedarrays) should be supported (namely IE 10+, Firefox 4+, Chrome 7+, Opera 6+ etc.) although no extensive tests have been conducted.

## Quick Start

Install with `bower install --save bpm` or by downloading [build/bpm.min.js](build/bpm.min.js) directly. Then, create an HTML file with the following contents and open it with your browser:

    <script src="bpm.min.js"></script>
    <script>
    require('timestamp-series', function(timestampseries) {
      var s = new Date('05/06/2014 12:00:00')
      var e = new Date('05/12/2014 12:00:00')
      console.log(timestampseries('day', s, e));
    });
    </script>

Check out your browser's developer tools console and networking tab to see BPM in action. The [timestamp-series package](https://www.npmjs.com/package/timestamp-series) has a few dependencies, some of which are shared, so you should see a number of requests for package metadata and the tarballs in your network tab.

## Complete Docs

### Package Version Numbers

You can pass the package version number as the second parameter after the package name and before callback, i.e.: `require(package, version, callback)`. The default is `"*"` which results in the latest version of the package being loaded. For more info on specifying package version numbers, check out [package.json#dependencies](https://docs.npmjs.com/files/package.json#dependencies).

### Development

`bpm [package directory] [port]`

### Loading Non-JS Files

To load a non-JS file, simply use `require` inside your package, the same way you would when loading a module, but include the extension. Relative paths work as well. Files with different extensions are treated differently:

* `json` files are passed through `JSON.parse` and require returns a JS object tree, just like in Node
* `txt`, `md`, `css` and `html` are interpreted as text files and requiring them returns a string; if you need to support other text file extensions then require them as a binary file (see below) and pass them to [TextDecoder.decode()](https://developer.mozilla.org/en-US/docs/Web/API/TextDecoder.decode)
* all other files are treated as binary and requiring them returns a [Uint8Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array) typed array

### Modules as Packages

In addition to passing in NPM package names to `require`, you can also pass in a URL. The following extensions are supported:

* `tgz`, `tar.gz` - loads a gzipped tarball, package contents can be in the root or in a `/package/` subdirectory
* `tar` - loads a tarball, package contents can be in the root or in a `/package/` subdirectory
* `pkg` - loads a package created with the pack utility, created by the `bpm` command line tool & server and used for development
* `js` - loads a single module as a package (i.e. sets it to be the main module in `package.json`)
* `json` - loads a single JSON file as a package (i.e. sets it to be the main module in `package.json`)

Note that in order to be able to load the file from your page, the server needs to be able to send the appropriate CORS headers. So, for example loading a tarball from GitHub is not possible, but loading a Gist is.

### Decreasing Loading Time

To decrease the loading times of packages you publish to NPM, you should:

* Use exact matching version numbers (`"dependencies": {"common-utils":"0.1.0"}` instead of `"dependencies": {"common-utils":">=0.1.0"}`) when listing dependencies in your [`package.json`](https://docs.npmjs.com/files/package.json#dependencies) and when calling `require` on your entry point package from the browser. By doing this you will prevent BPM from doing an HTTP request for package metadata for every package, which is likely to halve the loading time for first time visitors. The downloaded meta data and tarballs are cached by the browser, so subsequent visits will result faster loading times, regardless of whether you use exact version numbers or not. Note that [shrinkwrapped packages](https://docs.npmjs.com/cli/shrinkwrap) are not currently supported.
* Include all the files and directories not needed at runtime in the browser in `.npmignore`. Search for "npmignore" [here](https://docs.npmjs.com/files/package.json) for more info. This can include things omitted by `.gitignore` like the `tests` directory and unminified files, but you should probably keep your `README.md` as it's small and will be useful to anyone looking up your package on npmjs.org. The smaller the resulting tarball, the faster it will be downloaded and the faster it will be to inflate.
* Minify your JS (e.g. using [Uglify](https://github.com/mishoo/UglifyJS2)) in a [prepublish script](https://docs.npmjs.com/misc/scripts).

### Loading Multiple Packages

To load multiple packages, pass the list of names (or URLs) as the first argument to `require`.

### Custom Registries

The `options` argument accepts optional `registry` and `tarball` attributes which specify the URLs to load the package metadata and tarballs respectively. The URLs include placeholders for the package name and version number. The defaults are `//npm-proxy-cors.herokuapp.com/{package}` for `registry` and `//registry.npmjs.org/{package}/-/{package}-{version}.tgz` for `tarball`.

### Progress Updates

The `options` argument accepts an optional `onprogress` which is a callback that is triggered whenever there's progress loading the packages:

    require('timestamp-series', '*', {
        onprogress: function(current, loaded, total) {
            console.log("Done loading package: " + current);
            console.log("Loaded " + loaded + " packages out of a total of " + total);

        }
      },
      function(timestampseries) {
      });

Note that `total` increases as dependencies are resolved.

### Loading as a CommonJS or AMD Module

By default BPM registers the `require` method on the global (window) object, but it can also be loaded as a CommonJS or AMD module.

### Security



## Acknowledgements

This library has the following dependencies:

  * [semver](https://github.com/npm/node-semver) is used
  * [bitjs](https://github.com/matthewp/bitjsx) is used to unpack tarballs
  * [zlibjs](https://github.com/imaya/zlib.js) is used to inflate compressed tarballs
  * [text-encoding](https://github.com/inexorabletash/text-encoding) is a polyfill to support text decoding on browsers that have typed arrays but don't include TextDecoder, namely IE

It also relies on the following services:

  * [NPM registry](https://npmjs.org) for downloading the package tarballs
  * NPM CORS proxy hosted on Heroku for retrieving optional package version info

## License

(The MIT License)

Copyright (c) 2014+ Oleg Podsechin

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.