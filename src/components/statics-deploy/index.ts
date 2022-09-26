import * as path from 'path';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Effect, PolicyDocument, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Code, Runtime } from 'aws-cdk-lib/aws-lambda';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { BucketAccessControl } from 'aws-cdk-lib/aws-s3';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import { Topic } from 'aws-cdk-lib/aws-sns';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as snsSub from 'aws-cdk-lib/aws-sns-subscriptions';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';


export interface StaticsDeployConstructProps {
  staticsDeployBucket: s3.Bucket;
  cloudformationRole: iam.Role;
  cloudfrontMainId: string;
  deploymentName: string;
  ddbAliasTable: dynamodb.Table;
  ddbDeploymentTable: dynamodb.Table;
  multipleDeploymentsBaseDomain: string;
  cloudfrontMainArn: string;
  deployStatusSnsTopic: sns.Topic;
}

export class StaticsDeployConstruct extends Construct {
  public readonly staticUploadBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: StaticsDeployConstructProps) {
    super(scope, id);

    /********************************************************************* */
    /**
       # Upload Bucket (zipped)
    */

    this.staticUploadBucket = new s3.Bucket(this, 'StaticsUploadBucket', {
      bucketName: `${props.deploymentName}-static-upload`,
      removalPolicy: RemovalPolicy.DESTROY,
      accessControl: BucketAccessControl.PRIVATE,
    });

    /********************************************************************** */

    const sqsQueue = new sqs.Queue(this, 'staticDeploySQSQueue', {
      queueName: props.deploymentName,
      retentionPeriod: Duration.seconds(86400),
      receiveMessageWaitTime: Duration.seconds(10),
      visibilityTimeout: Duration.seconds(60 * 6),
    });


    const snsTopic = new Topic(this, 'staticDeployTopic', {
      topicName: props.deploymentName,
    });

    const topicSubscription = new snsSub.SqsSubscription(sqsQueue);
    snsTopic.addSubscription(topicSubscription);

    const deployTriggerLambdaRole = setDeployTriggerLambdaRole(this, props, this.staticUploadBucket, sqsQueue);
    console.log(process.env.CDK_DEFAULT_REGION);
    const deployTriggerLambda = new lambda.Function(this, `${props.deploymentName}-StaticDeploy`,
      {
        code: Code.fromAsset(path.join(__dirname, '../../../packages/deploy-trigger/dist.zip')),
        handler: 'handler.handler',
        description: 'Deploy Trigger',
        memorySize: 1024,
        timeout: Duration.seconds(60),
        runtime: Runtime.NODEJS_14_X,
        environment: {
          NODE_ENV: 'production',
          TABLE_REGION: 'us-east-1',
          TABLE_NAME_DEPLOYMENTS: props.ddbDeploymentTable.tableName,
          TABLE_NAME_ALIASES: props.ddbAliasTable.tableName,
          CLOUDFORMATION_ROLE_ARN: props.cloudformationRole.roleArn,
          TARGET_BUCKET: props.staticsDeployBucket.bucketName,
          DISTRIBUTION_ID: props.cloudfrontMainId,
          SQS_QUEUE_URL: sqsQueue.queueUrl,
          DEPLOY_STATUS_SNS_ARN: props.deployStatusSnsTopic.topicArn,
          MULTI_DEPLOYMENTS_BASE_DOMAIN: props.multipleDeploymentsBaseDomain,
        },
        role: deployTriggerLambdaRole,
      },
    );


    const sqsQueuePolicy = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'sqs:SendMessage',
      ],
      principals: [
        new iam.AnyPrincipal(),
      ],
      conditions: {
        'ForAllValues:StringEquals': {
          'aws:SourceArn': [snsTopic.topicArn, deployTriggerLambda.functionArn],
        },
      },
      resources: [
        deployTriggerLambda.functionArn,
      ],

    });

    sqsQueue.addToResourcePolicy(sqsQueuePolicy);

    deployTriggerLambda.addEventSourceMapping('deployTriggerLambdaSQS', {
      batchSize: 10,
      eventSourceArn: sqsQueue.queueArn,
    });

    this.staticUploadBucket.addEventNotification(s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(deployTriggerLambda));

  }
}


/**
 * TODO: Remove all * resources and replace with appropriate resources
 */
function setDeployTriggerLambdaRole(scope: Construct, props: StaticsDeployConstructProps, staticUploadBucket: s3.Bucket, sqsQueue: sqs.Queue) {
  return new Role(
    scope,
    'deployTriggerLambdaRole',
    {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        {
          managedPolicyArn:
            'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
        },
      ],
      inlinePolicies: {
        'inline-lambda-policy': new PolicyDocument({
          statements: [
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: [
                's3:ListBucket',
                's3:GetObject',
                's3:PutObject',
                's3:DeleteObject',
                's3:GetObjectTagging',
                's3:PutObjectTagging',
              ],
              resources: [
                `${props.staticsDeployBucket.bucketArn}`,
                `${props.staticsDeployBucket.bucketArn}/*`,
              ],
            }),
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: [
                'cloudfront:CreateInvalidation',
              ],
              resources: [
                // var.cloudfront_arn
                '*',
              ],
            }),
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: [
                'cloudformation:CreateStack',
              ],
              resources: [
                '*',
              ],
            }),
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: [
                'iam:PassRole',
              ],
              resources: [
                // TODO: var.cloudformation_role_arn
                '*',
              ],
            }),
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: [
                's3:GetObject',
                's3:GetObjectVersion',
                's3:DeleteObject',
                's3:DeleteObjectVersion',
              ],
              resources: [
                `${staticUploadBucket.bucketArn}`,
                `${staticUploadBucket.bucketArn}/*`,
              ],
            }),
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: [
                'dynamodb:Query',
                'dynamodb:PutItem',
                'dynamodb:UpdateItem',
              ],
              resources: [
                `${props.ddbDeploymentTable.tableArn}`, `${props.ddbDeploymentTable.tableArn}/index/*`, `${props.ddbAliasTable.tableArn}`, `${props.ddbAliasTable.tableArn}/index/*`,
              ],
            }),

            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: [
                'sqs:ReceiveMessage',
                'sqs:DeleteMessage',
                'sqs:SendMessage',
                'sqs:GetQueueUrl',
                'sqs:GetQueueAttributes',
                'sqs:ChangeMessageVisibility',
              ],
              // TODO:  aws_sqs_queue.this.arn
              resources: [`${sqsQueue.queueArn}`],
            }),
          ],
        }),
      },
    },
  );
}