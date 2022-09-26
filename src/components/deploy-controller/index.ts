import * as path from 'path';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Role, ServicePrincipal, PolicyDocument, PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Code, Runtime } from 'aws-cdk-lib/aws-lambda';
import { SnsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { Subscription, SubscriptionProtocol } from 'aws-cdk-lib/aws-sns';
import * as sns from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';

export interface DeployControllerConstructProps {
  deploymentName: string;
  ddbAliasTable: dynamodb.Table;
  ddbDeploymentTable: dynamodb.Table;
  // Default wildcard domain where new deployments should be available. Should be in the form of *.example.com.
  multipleDeploymentsBaseDomain: string;
}

export class DeployController extends Construct {
  public readonly deployControllerSnsTopic: sns.Topic;

  constructor(scope: Construct, id: string, props: DeployControllerConstructProps) {
    super(scope, id);

    /**
     * # Deploy Controller
     *  */

    const deployControllerLambdaRole = new Role(
      this,
      'deployControllerLambdaRole',
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
                actions: ['cloudformation:DescribeStacks'],
                resources: ['*'],
              }),
              new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                  'dynamodb:GetItem',
                  'dynamodb:PutItem',
                  'dynamodb:Query',
                  'dynamodb:UpdateItem',
                  'dynamodb:DeleteItem',
                ],
                // TODO: add the DDB tables
                resources: [`${props.ddbDeploymentTable.tableArn}`, `${props.ddbDeploymentTable.tableArn}/index/*`, `${props.ddbAliasTable.tableArn}`, `${props.ddbAliasTable.tableArn}/index/*`],
              }),
            ],
          }),
        },
      },
    );

    const deployControllerLambda = new lambda.Function(this, `${props.deploymentName}DeployController`, {
      code: Code.fromAsset(path.join(__dirname, '../../../packages/deploy-controller/dist.zip')),
      handler: 'handler.handler',
      runtime: Runtime.NODEJS_14_X,
      memorySize: 128,
      environment: {
        NODE_ENV: 'production',
        TABLE_REGION: process.env.CDK_DEFAULT_REGION as string, //var.dynamodb_region,
        TABLE_NAME_DEPLOYMENTS: props.ddbDeploymentTable.tableName, // var.dynamodb_table_deployments_name
        TABLE_NAME_ALIASES: props.ddbAliasTable.tableName, // var.dynamodb_table_aliases_name
        //  # Remove the * from the base domain (e.g. *.example.com -> .example.com)
        MULTI_DEPLOYMENTS_BASE_DOMAIN: props.multipleDeploymentsBaseDomain.replace(/\*/g, ''), // var.enable_multiple_deployments ? replace(var.multiple_deployments_base_domain, "/^\\*/", "") : null
      },
      role: deployControllerLambdaRole,

    });

    this.deployControllerSnsTopic = new sns.Topic(this, 'DeployControllerSnsTopic', {
      displayName: 'DeployerControllerSnsTopic',
    });

    new Subscription(this, 'deployControllerSubscription', {
      protocol: SubscriptionProtocol.LAMBDA,
      endpoint: deployControllerLambda.functionArn,
      topic: this.deployControllerSnsTopic,
    });

    deployControllerLambda.addEventSource(new SnsEventSource(this.deployControllerSnsTopic));

    new lambda.CfnPermission(this, 'lambdaDeployControllerSnsPermission', {
      action: 'lambda:InvokeFunction',
      functionName: deployControllerLambda.functionName,
      principal: 'sns.amazonaws.com',
      sourceArn: this.deployControllerSnsTopic.topicArn,
    });

    deployControllerLambda.grantInvoke(new ServicePrincipal('sns.amazonaws.com'));
  }
}