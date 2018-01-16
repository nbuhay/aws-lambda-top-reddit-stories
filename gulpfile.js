const gulp = require('gulp')
    , filter = require('gulp-filter')
    , zip = require('gulp-zip')

gulp.task('default', () => console.log('Hello from aws-lambda-top-stories gulpfile!'));

gulp.task('zip', () => {
  // include all files and folders in build
  // include all files that start with a . i.e. .config, .gitignore, etc.
  // exclude existing .zip from this build - it will be overwritten in the pipe
  const file = 'awsLambdaTopStories-lambdaFunction.js' 
      , opts = { nodir: true, dot: true }
      , f = filter(['**', '!deploy/*.zip'])

  return gulp.src(file, opts)
    .pipe(f)
    .pipe(zip('aws-lambda-top-stories.deploy.zip'))
    .pipe(gulp.dest('./deploy'));
});

gulp.task('deploy', () => console.log('Deploy to Lambda'));