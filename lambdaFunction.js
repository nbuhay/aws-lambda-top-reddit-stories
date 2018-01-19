'use strict';

const aws = require('aws-sdk')
  , https = require('https')
  , fs = require('fs')
  , qs = require('querystring')
  , s3 = new aws.S3()
  , sns = new aws.SNS()
  , USER_AGENT = process.env.USER_AGENT
  , CLIENT_ID = process.env.CLIENT_ID
  , CLIENT_SECRET = process.env.CLIENT_SECRET
  , S3_BUCKET = process.env.S3_BUCKET
  , TOPIC_ARN = process.env.TOPIC_ARN
  , REFRESH_TOKEN = process.env.REFRESH_TOKEN  // reddit refresh token
  , AWS_REGION = process.env.AWS_REGION  // aws region the function is deployed
  , NUM_TOP_STORIES = process.env.NUM_TOP_STORIES  // num stories sent to user

let access_token  // reddit global bearer token

// set AWS region to match region the CloudFormation infra is deployed
aws.config.update({ region: AWS_REGION });

exports.getTopStories = function(event, context) {
  refreshRedditAccessToken()
  .then(() => getUserSubreddits())
  .then((subreddits) => getSubredditPosts(subreddits))
  .then((subredditPosts) => awsOperations(subredditPosts))
  .catch((err) => console.error(err));
}

function refreshRedditAccessToken() {
  return new Promise((resolve, reject) => {
    const basic_auth = `${CLIENT_ID}:${CLIENT_SECRET}`
        , options = {
            hostname: 'www.reddit.com',
            method: 'POST',
            path: '/api/v1/access_token',
            headers: {
              'Authorization': `Basic ${new Buffer(basic_auth).toString('base64')}`,
              'Content-Type':  'application/x-www-form-urlencoded',
            }
          }
        , postData = {
            grant_type: 'refresh_token',
            refresh_token: REFRESH_TOKEN
          }

    let req = https.request(options, (res) => {
      let result = '';
      res
        .on('data', (chunk) => result += chunk)
        .on('end', () => {
          // store token globally
          access_token = JSON.parse(result).access_token;
          resolve();
        })
        .on('error', (err) => reject(err));
    });

    req.write(qs.stringify(postData))
    req.end();

  })
  .catch((err) => console.error(err));
}

function getUserSubreddits() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'oauth.reddit.com',
      method: 'GET',
      path: '/subreddits/mine/subscriber',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'User-Agent': USER_AGENT
      }
    }

    https.request(options, (res) => {
      let result = '';
      res
        .on('data', (chunk) => result += chunk)
        .on('end', () => {
          let subreddits = [];
          JSON.parse(result).data.children.forEach((subreddit) => {
            subreddits.push(subreddit.data.display_name_prefixed);
          });
          resolve(subreddits);
        })
        .on('error', (err) => reject(err));
    }).end();

  })
  .catch((err) => console.log(err));
}

function getSubredditPosts(subreddits) {
  let subredditPromises = [];

  subreddits.forEach((subreddit) => {
    subredditPromises.push(new Promise((resolve, reject) => {
      const options = {
        hostname: 'oauth.reddit.com',
        method: 'GET',
        path: `/${subreddit}/top`,
        query: 't=week',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'User-Agent': USER_AGENT
        }
      }

      let topStories = [];

      https.request(options, (res) => {
        let result = '';
        res
          .on('data', (chunk) => result += chunk)
          .on('end', () => {
            JSON.parse(result).data.children.forEach((post) => {
              topStories.push({
                subreddit: post.data.subreddit_name_prefixed,
                title: post.data.title,
                url: post.data.url,
                comments: `https://www.reddit.com${post.data.permalink}`,
                score: post.data.score
              });
            });
            resolve(topStories);
          })
          .on('error', (err) => reject(err))
      }).end();
    }));
  });
  
  return Promise.all(subredditPromises)
    .catch((err) => console.error(err));
}

function awsOperations(subredditPosts) {
  // subredditPosts arrive as an arrays
  // concat all subredditPosts into a single array of posts
  let concatSubredditPosts = [].concat.apply([], subredditPosts)
    , oneWeekAgo = new Date()
    , weekOf = new Date()

  // sort by the post score, result in lowest to highest score order
  concatSubredditPosts.sort((a, b) => { return a.score - b.score; });

  // get date one week back
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  // remove post.score from each post
  // posts already ordered and saves on SNS size
  concatSubredditPosts.forEach((post) => delete post.score);

  // format stories for transit by adding /n and /t
  // reverse stories so they're listed highest to lowest score order
  // keep only NUM_TOP_STORIES for transit
  // convert file contents to a binary buffer for transit
  // build params for S3 putObject
  let userTopStories =
    JSON.stringify(concatSubredditPosts.reverse().slice(0, NUM_TOP_STORIES), null, '\t')
    , s3OneWeekAgo = `${oneWeekAgo.getMonth()+1}-${oneWeekAgo.getDay()}-${oneWeekAgo.getFullYear()}`
    , s3WeekOf = `${weekOf.getMonth()+1}-${weekOf.getDay()}-${weekOf.getFullYear()}`
    , base64data = new Buffer(userTopStories, 'binary')
    , s3Params = {
        Body: base64data,
        Bucket: S3_BUCKET,
        Key: `${s3OneWeekAgo}.${s3WeekOf}.lambda-top-stories.json`,
        Tagging: 'name=aws-lambda-top-stories'
      }

  // make S3 put request
  s3.putObject(s3Params, (err, res) => {
    if (err) {
      console.error(`Error with S3 Upload: ${err}`);
    } else {
      console.log(res);
      console.log('S3 Upload Successful!');
    }
  });

  // build params for SNS publish
  let snsParams = {
    Subject: `Top Stories from Reddit: Week of ${oneWeekAgo.toLocaleDateString()} to ${weekOf.toLocaleDateString()}`,
    Message: userTopStories,
    TopicArn: TOPIC_ARN
  }

  sns.publish(snsParams, (err, data) => {
    if (err) console.log(err, err.stack); // an error occured
    else console.log(data);
  });
}