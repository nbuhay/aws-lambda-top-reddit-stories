## Deploy
```bash
gulp env
aws cloudformation create-stack --stack-name aws-lambda-top-stories-LAYER-00 --parameters ParameterKey=UserEmail,ParameterValue=SUBSCRIPTION_EMAIL --template-body file://cloudformation/layer-00.cloudformation.yaml
aws cloudformation create-stack --stack-name aws-lambda-top-stories-LAYER-01 --template-body file://cloudformation/layer-01.cloudformation.yaml
S3_BUCKET=aws-lambda-top-stories-bucket gulp deploy
aws cloudformation create-stack --stack-name aws-lambda-top-stories-LAYER-02 --parameters file://env.json --template-body file://cloudformation/layer-02.cloudformation.yaml
```

## Cleanup
```bash
aws cloudformation delete-stack --stack-name layer-02
aws cloudformation delete-stack --stack-name layer-01
aws s3 rm --recursive s3://aws-lambda-top-stories-bucket
aws cloudformation delete-stack --stack-name layer-00
```