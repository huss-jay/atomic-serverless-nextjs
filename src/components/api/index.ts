
import * as path from 'path';
import * as api from '@aws-cdk/aws-apigatewayv2-alpha';
import { HttpApi, HttpConnectionType, HttpIntegration, HttpIntegrationType, HttpMethod, HttpRoute, HttpRouteKey, PayloadFormatVersion } from '@aws-cdk/aws-apigatewayv2-alpha';
import { HttpIamAuthorizer } from '@aws-cdk/aws-apigatewayv2-authorizers-alpha';
import { HttpLambdaIntegration } from '@aws-cdk/aws-apigatewayv2-integrations-alpha';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Role, ServicePrincipal, PolicyDocument, PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export interface MainApiConstructProps {
  deploymentName: string;
  staticsDeployBucket: s3.Bucket;
  ddbAliasTable: dynamodb.Table;
  ddbDeploymentTable: dynamodb.Table;
  // Default wildcard domain where new deployments should be available. Should be in the form of *.example.com.
  multipleDeploymentsBaseDomain?: string;
}

export class MainApi extends Construct {

  public readonly api: HttpApi;

  constructor(scope: Construct, id: string, props: MainApiConstructProps) {
    super(scope, id);

    /**
     * # API
     *  */

    const MainApiLambdaRole = new Role(
      this,
      'MainApiLambdaRole',
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
                actions: ['s3:PutObject'],
                // For creating the presigned upload URL in S3
                resources: [`${props.staticsDeployBucket.bucketArn}`, `${props.staticsDeployBucket.bucketArn}/*`],
              }),
              new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                  'dynamodb:GetItem',
                  'dynamodb:DeleteItem',
                  'dynamodb:PutItem',
                  'dynamodb:Query',
                  'dynamodb:UpdateItem',
                ],
                resources: [`${props.ddbDeploymentTable.tableArn}`, `${props.ddbDeploymentTable.tableArn}/index/*`, `${props.ddbAliasTable.tableArn}`, `${props.ddbAliasTable.tableArn}/index/*`],
              }),
              new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                  'cloudformation:DeleteStack',
                ],
                // TODO: add cloudformation stack
                // "arn:aws:cloudformation:*:*:stack/*/*"
                resources: ['*'],
              }),
            ],
          }),
        },
      },
    );

    const mainApi = new lambda.Function(this, `${props.deploymentName}-MainApi`,
      {
        code: lambda.Code.fromAsset(path.join(__dirname, '../../../packages/api/dist.zip')),
        handler: 'handler.handler',
        runtime: Runtime.NODEJS_14_X,
        description: 'Main API',
        memorySize: 128,
        environment: {
          NODE_ENV: 'production',
          TABLE_REGION: process.env.CDK_DEFAULT_REGION as string, //var.dynamodb_region,
          TABLE_NAME_DEPLOYMENTS: props.ddbDeploymentTable.tableName, // var.dynamodb_table_deployments_name
          TABLE_NAME_ALIASES: props.ddbAliasTable.tableName, // var.dynamodb_table_aliases_name
          //  # Remove the * from the base domain (e.g. *.example.com -> .example.com)
          MULTI_DEPLOYMENTS_BASE_DOMAIN: props.multipleDeploymentsBaseDomain ?? '', // var.enable_multiple_deployments ? replace(var.multiple_deployments_base_domain, "/^\\*/", "") : null

          UPLOAD_BUCKET_ID: props.staticsDeployBucket.bucketName,
          UPLOAD_BUCKET_REGION: process.env.CDK_DEFAULT_REGION as string,
        },
        role: MainApiLambdaRole,
      },
    );

    const authorizer = new HttpIamAuthorizer();

    this.api = new api.HttpApi(this, 'MainApiGw', {
      apiName: 'Main-API',
      createDefaultStage: true,
    });

    new HttpIntegration(this, 'MainApiHttpIntegration', {
      httpApi: this.api,
      integrationType: HttpIntegrationType.LAMBDA_PROXY,
      integrationUri: mainApi.functionArn,
      payloadFormatVersion: PayloadFormatVersion.VERSION_2_0,
      connectionType: HttpConnectionType.INTERNET,
    });

    new HttpRoute(this, 'MainAPIHttpIntegration', {
      httpApi: this.api,
      integration: new HttpLambdaIntegration('lambda_integration', mainApi),
      routeKey: HttpRouteKey.with('/{proxy+}', HttpMethod.ANY),
      authorizer: authorizer,
    });

    new lambda.CfnPermission(this, 'lambdaMainApigwPermission', {
      action: 'lambda:InvokeFunction',
      functionName: mainApi.functionName,
      principal: 'apigateway.amazonaws.com',
    });

    mainApi.grantInvoke(new ServicePrincipal('apigateway.amazonaws.com'));

    // const apiLambdaSnsTopic = new sns.Topic(this, 'ApiSnsTopic', {
    //   displayName: 'DeployerControllerSnsTopic',
    // });

    // new Subscription(this, 'ApiSubscription', {
    //   protocol: SubscriptionProtocol.LAMBDA,
    //   endpoint: apiLambda.functionArn,
    //   topic: apiLambdaSnsTopic,
    // });

    // deployControllerLambda.addEventSource(new SnsEventSource(deployControllerSnsTopic));
  }
}