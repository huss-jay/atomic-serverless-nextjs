
import * as path from 'path';
import * as api from '@aws-cdk/aws-apigatewayv2-alpha';
import { HttpConnectionType, HttpIntegration, HttpIntegrationType, HttpMethod, HttpRoute, HttpRouteKey, PayloadFormatVersion } from '@aws-cdk/aws-apigatewayv2-alpha';
import { HttpLambdaIntegration } from '@aws-cdk/aws-apigatewayv2-integrations-alpha';
import { Duration } from 'aws-cdk-lib';
import { Role, ServicePrincipal, PolicyDocument, PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export interface ImageOptimizerProps {
  deploymentName: string;
  staticsDeployBucket: s3.Bucket;
}

export class ImageOptimizerConstruct extends Construct {

  public readonly apigw: api.HttpApi;

  constructor(scope: Construct, id: string, props: ImageOptimizerProps) {
    super(scope, id);

    const imageOptimizerLambdaRole = new Role(
      this,
      'imageOptimizerLambdaRole',
      {
        assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
        managedPolicies: [
          {
            managedPolicyArn: 'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
          },
        ],
        inlinePolicies: {
          'inline-lambda-policy': new PolicyDocument({
            statements: [
              new PolicyStatement({
                effect: Effect.ALLOW,
                actions: ['s3:GetObject'],
                // For creating the presigned upload URL in S3
                resources: [`${props.staticsDeployBucket.bucketArn}/*`, `${props.staticsDeployBucket.bucketArn}`],
              }),
            ],
          }),
        },
      },
    );


    const imageOptimizerLambda = new lambda.Function(this, `${props.deploymentName}-ImageOptimizer`,
      {
        code: lambda.Code.fromAsset(path.join(__dirname, '../../../image-optimizer/lib/dist.zip')),
        handler: 'handler.handler',
        runtime: Runtime.NODEJS_14_X,
        description: 'Main API',
        timeout: Duration.seconds(30),
        memorySize: 1024,
        role: imageOptimizerLambdaRole,
        environment: {
          NODE_ENV: 'production',
          TF_NEXTIMAGE_DOMAINS: '["notenote-users.s3.amazonaws.com", "notenote-app-settings.s3.amazonaws.com"]' as any,
          TF_NEXTIMAGE_DEVICE_SIZES: '[]' as any,
          TF_NEXTIMAGE_FORMATS: "['image/webp']" as any,
          TF_NEXTIMAGE_IMAGE_SIZES: '[]' as any,
          TF_NEXTIMAGE_SOURCE_BUCKET: props.staticsDeployBucket.bucketName,
        },
      },
    );

    this.apigw = new api.HttpApi(this, 'ImageOptimizerAPIGW', {
      apiName: 'Image-Optimizer-API',
      createDefaultStage: true,
    });

    new HttpIntegration(this, 'ImageOptimizerAPIHttpIntegration', {
      httpApi: this.apigw,
      integrationType: HttpIntegrationType.LAMBDA_PROXY,
      integrationUri: imageOptimizerLambda.functionArn,
      payloadFormatVersion: PayloadFormatVersion.VERSION_2_0,
      connectionType: HttpConnectionType.INTERNET,
    });

    new HttpRoute(this, 'ImageOptimizerAPIRouteHttpIntegration', {
      httpApi: this.apigw,
      integration: new HttpLambdaIntegration('lambda_integration', imageOptimizerLambda),
      routeKey: HttpRouteKey.with('/_next/{proxy+}', HttpMethod.GET),
    });

    new lambda.CfnPermission(this, 'lambdaMainApigwPermission', {
      action: 'lambda:InvokeFunction',
      functionName: imageOptimizerLambda.functionName,
      principal: 'apigateway.amazonaws.com',
    });

    imageOptimizerLambda.grantInvoke(new ServicePrincipal('apigateway.amazonaws.com'));

  }
}