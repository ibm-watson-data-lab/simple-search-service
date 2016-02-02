gulp = require('gulp')
rename = require('gulp-rename')
postcss = require('gulp-postcss')
cssnext = require('postcss-cssnext')
postcssImport = require('postcss-import')


gulp.task('postcss', function(){
  var processors = [
    postcssImport,
    cssnext,
  ]
  return gulp.src('public/styles/_master.css')
    .pipe(postcss(processors))
    .pipe(rename("master.css"))
    .pipe(gulp.dest('public/'))
})

gulp.task('postcss:watch', ['postcss'],  function(){
  gulp.watch("public/styles/**/*.css", ['postcss'])
})