gulp = require('gulp')
rename = require('gulp-rename')
postcss = require('gulp-postcss')
autoprefixer = require('autoprefixer')
postcssImport = require('postcss-import')
postcssCustomProperties = require('postcss-custom-properties')

gulp.task('postcss', function(){
  var processors = [
    autoprefixer,
    postcssImport,
    postcssCustomProperties
  ]
  return gulp.src('public/styles/_master.css')
    .pipe(postcss(processors))
    .pipe(rename("master.css"))
    .pipe(gulp.dest('public/'))
})

gulp.task('postcss:watch', ['postcss'],  function(){
  gulp.watch("public/styles/**/*.css", ['postcss'])
})