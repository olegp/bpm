/**
 * Modified version of untar.js from bitjs (Copyright(c) 2011 Google Inc.)
 *
 * Reference Documentation:
 *
 * TAR format: http://www.gnu.org/software/automake/manual/tar/Standard.html
 */

// removes all characters from the first zero-byte in the string onwards
var readCleanString = function(bstr, numBytes) {
  var str = bstr.readString(numBytes);
  var zIndex = str.indexOf(String.fromCharCode(0));
  return zIndex != -1 ? str.substr(0, zIndex) : str;
};

// takes a ByteStream and parses out the local file information
var TarLocalFile = function(bstream) {
  this.isValid = false;
  this.name = readCleanString(bstream, 100);
  this.mode = readCleanString(bstream, 8);
  this.uid = readCleanString(bstream, 8);
  this.gid = readCleanString(bstream, 8);
  this.size = parseInt(readCleanString(bstream, 12), 8);
  this.mtime = readCleanString(bstream, 12);
  this.chksum = readCleanString(bstream, 8);
  this.typeflag = readCleanString(bstream, 1);
  this.linkname = readCleanString(bstream, 100);
  this.maybeMagic = readCleanString(bstream, 6);

  if (this.maybeMagic == "ustar") {
    this.version = readCleanString(bstream, 2);
    this.uname = readCleanString(bstream, 32);
    this.gname = readCleanString(bstream, 32);
    this.devmajor = readCleanString(bstream, 8);
    this.devminor = readCleanString(bstream, 8);
    this.prefix = readCleanString(bstream, 155);

    if (this.prefix.length) {
      this.name = this.prefix + this.name;
    }
    bstream.readBytes(12);
  } else {
    bstream.readBytes(249);
  }

  this.filename = this.name;
  this.fileData = null;

  if (this.typeflag == 0) {
    // regular file
    var sizeInBytes = parseInt(this.size);
    this.fileData = new Uint8Array(bstream.bytes.buffer, bstream.ptr, this.size);
    if (this.name.length > 0 && this.size > 0 && this.fileData && this.fileData.buffer) {
      this.isValid = true;
    }

    bstream.readBytes(this.size);

    // round up to 512-byte blocks.
    var remaining = 512 - this.size % 512;
    if (remaining > 0 && remaining < 512) {
      bstream.readBytes(remaining);
    }
  } else if (this.typeflag == 5) {
    // directory
  }
};

var untar = function(arrayBuffer) {
  var bstream = new bitjs.io.ByteStream(arrayBuffer);
  var files = {};
  while (bstream.peekNumber(4) != 0) {
    var oneLocalFile = new TarLocalFile(bstream);
    if (oneLocalFile && oneLocalFile.isValid) {
      files[oneLocalFile.filename.substr("package/".length)] = oneLocalFile.fileData;
    }
  }
  return files;
};
