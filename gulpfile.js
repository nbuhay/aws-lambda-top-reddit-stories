const gulp = require('gulp')
    , filter = require('gulp-filter')
    , zip = require('gulp-zip')
    , awspublish = require('gulp-awspublish')
    , AWS = require('aws-sdk')
    , S3 = new AWS.S3()
    , readlineSync = require('readline-sync')
    , fs = require('fs')

gulp.task('default', () => console.log('Hello from aws-lambda-top-stories gulpfile!'));

// https://www.concurrencylabs.com/blog/configure-your-lambda-function-like-a-champ-sail-smoothly/
gulp.task('env', () => {
  const envFile = 'env.json'
      , s3Parmas = { Bucket: process.env.S3_BUCKET, Key: envFile }
      , keys = [
          'UserAgent',
          'RefreshToken',
          'ClientId',
          'ClientSecret',
          'NumTopStories'
        ]
  
  let env = []

  keys.forEach((key) => {
     let value = readlineSync.question(`${key}: `);
     env.push({ ParameterKey: key, ParameterValue: value });
  });

  fs.writeFile('env.json', JSON.stringify(env),
    (err) => (err) ? console.error(err) : console.log('Success:  saved to env.json'));
});

gulp.task('deploy', () => {
  const zipFile = 'aws-lambda-top-stories.deploy.zip'
      , s3Parmas = { Bucket: process.env.S3_BUCKET, Key: zipFile }

  return new Promise((resolve, reject) => {
    S3.deleteObject(s3Parmas, (err, data) => (err) ? reject(err) : resolve())
  })
  .then(() => {
    // include all files and folders in build
    // include all files that start with a . i.e. .config, .gitignore, etc.
    // exclude existing .zip from this build - it will be overwritten in the pipe
    const jsFile = 'lambdaFunction.js' 
        , opts = { nodir: true, dot: true }
        , f = filter(['**', '!deploy/*.zip'])
        , publishParmas = { params: { Bucket: process.env.S3_BUCKET } }
        , headers = { 'Cache-Control': 'max-age=315360000, no-transform, public' }
        , publisher = awspublish.create(publishParmas)

    return gulp.src(jsFile, opts)
      .pipe(f)
      .pipe(zip(zipFile))
      .pipe(gulp.dest('./deploy'))
      .pipe(publisher.publish(headers))
      .pipe(publisher.sync())
      .pipe(awspublish.reporter());
  })
  .catch((err) => console.error(err));
});