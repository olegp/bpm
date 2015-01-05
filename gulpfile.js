var gulp = require('gulp');
var gulpif = require('gulp-if');
var minimist = require('minimist');
var uglify = require('gulp-uglify');
var concat = require('gulp-concat');
var wrap = require('gulp-wrap');
var livereload = require('gulp-livereload');
var nodemon = require('gulp-nodemon');

var knownOptions = {
  string: 'env',
  default: { env: process.env.NODE_ENV || 'production' }
};

var options = minimist(process.argv.slice(2), knownOptions);

gulp.task('build', function() {
  gulp.src(['./lib/io.js', './lib/untar.js', './lib/gunzip.min.js', './node_modules/semver/semver.browser.js', './lib/bpm.js'])
    .pipe(concat(options.env === 'production' ? 'bpm.min.js' : 'bpm.js'))
    .pipe(wrap('(function(){\n<%= contents %>\n}.call(this));'))
    .pipe(gulpif(options.env === 'production', uglify()))
    .on('error', function(error) {
      console.error(error.message);
    })
    .pipe(gulp.dest('./build'));
});

gulp.task('reload', function() {
  livereload.changed();
});

gulp.task('nodemon', function () {
  livereload.listen();
  nodemon({ script: 'test/index.js', ext: 'html js', ignore: ['build/*', 'node_modules/*'] })
    .on('change', ['build', 'reload'])
    .on('restart', function () {
      console.log('Server restarted')
    });
});


