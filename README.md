### Description

Automate a weekly email delivery of a Reddit User's top stories from that week.  Stories delivered are an aggregate of the highest voted content across all of the Reddit User's subscribed subreddits at the time of delivery.  The tech stack is Node.js and AWS.

### Architecture
![Architecture v01](images/architecture_v01.png?raw=true  "Architecture v01")

### Sequence Flow
![Sequence Flow v01](images/sequence_flow_v01.png?raw=true  "Sequence Flow v01")

### Environment Variables
| Name | Description |
|-|-
| UserAgent | Reddit requirement.  Unique and descriptive string used to identify a Reddit integrated app.  [Read more](https://github.com/reddit/reddit/wiki/API#rules). 
| RefreshToken | Reddit requirement.  Token to access a single Reddit User's data for 1hr.  [Read more](https://github.com/reddit/reddit/wiki/OAuth2#refreshing-the-token).
| ClientId | Reddit requirement.  Tells Reddit which app is making the request.  [Read more](https://github.com/reddit/reddit/wiki/OAuth2#getting-started).
| ClientSecret | Reddit requirement.  Secret complement to the Reddit ClientId.  **Do not share this value!**  [Read more](https://github.com/reddit/reddit/wiki/OAuth2#getting-started).
| NumTopStories | Number of top stories delivered to the Reddit User.  Default is 100.

### Deploy
```bash
# enter environment variables, store into env.json
gulp env

# set email to receive the stories and create S3 bucket and SNS topic
export SUBSCRIPTION_EMAIL=placeholderEmail@replaceWithYourOwn.guru
aws cloudformation create-stack \
    --stack-name aws-lambda-top-stories-LAYER-00 \
    --parameters ParameterKey=UserEmail,ParameterValue=$SUBSCRIPTION_EMAIL \
    --template-body file://cloudformation/layer-00.cloudformation.yaml

# create IAM policy
aws cloudformation create-stack \
    --stack-name aws-lambda-top-stories-LAYER-01 \
    --template-body file://cloudformation/layer-01.cloudformation.yaml

# zip and put Lambda function code into S3 bucket
S3_BUCKET=aws-lambda-top-stories-bucket gulp deploy

# create Lambda function and CloudWatch trigger
aws cloudformation create-stack \
    --stack-name aws-lambda-top-stories-LAYER-02 \
    --parameters file://env.json \
    --template-body file://cloudformation/layer-02.cloudformation.yaml
```

### Cleanup
```bash
# tear down Lambda function, CloudWatch trigger, and IAM policy
aws cloudformation delete-stack \
    --stack-name layer-02
aws cloudformation delete-stack \
    --stack-name layer-01

# remove Lambda function code and all stored email data
aws s3 rm \
    --recursive s3://aws-lambda-top-stories-bucket

# tear down S3 bucket and SNS topic
aws cloudformation delete-stack \
    --stack-name layer-00
```
