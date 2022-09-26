import * as path from 'path';
import { Duration } from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import { CachePolicy, AllowedMethods, ViewerProtocolPolicy, OriginRequestPolicy, OriginSslPolicy, PriceClass } from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as ddb from 'aws-cdk-lib/aws-dynamodb';
import { Effect, PolicyDocument, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export interface ProxyConfigConstructProps {
  dynamodbRegion: string;
  ddbTableAlias: ddb.Table;
  staticDeployBucketRegion: string;
  staticDeployBucketId: string;
  deploymentName: string;
}

export class ProxyConfigConstruct extends Construct {

  public readonly cloudfrontProxyConfig: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: ProxyConfigConstructProps) {
    super(scope, id);

    const proxyConfigLambdaRole = new Role(
      this,
      'proxyConfigLambdaRole',
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
                  'dynamodb:Query',
                ],
                resources: [
                  `${props.ddbTableAlias.tableArn}`,
                  `${props.ddbTableAlias.tableArn}/index/*`,
                ],
              }),

              new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                  's3:GetObject',
                ],
                // static deploy bucket files
                resources: ['*'],
              }),
            ],
          }),
        },
      },
    );

    const proxyConfigEdgeFunction = new cloudfront.experimental.EdgeFunction(this, 'CfProxyConfigFunction', {
      code: lambda.Code.fromAsset(path.join(__dirname, '../../../packages/proxy-config/dist.zip')),
      handler: 'handler.handler',
      description: `Proxy function managed by CDK - ${props.deploymentName}`,
      runtime: Runtime.NODEJS_14_X,
      memorySize: 1024,
      timeout: Duration.seconds(30),
      role: proxyConfigLambdaRole,
    });

    const lambdaFunctionAssociations: cloudfront.EdgeLambda[] = [
      {
        functionVersion: proxyConfigEdgeFunction.currentVersion,
        eventType: cloudfront.LambdaEdgeEventType.ORIGIN_REQUEST,
        includeBody: false,
      },
    ];


    this.cloudfrontProxyConfig = new cloudfront.Distribution(this, 'CfProxyConfigDistribution', {
      defaultBehavior: {
        origin: new origins.HttpOrigin('sls.app', {
          httpPort: 80,
          httpsPort: 443,
          originSslProtocols: [OriginSslPolicy.TLS_V1, OriginSslPolicy.TLS_V1_1, OriginSslPolicy.TLS_V1_2, OriginSslPolicy.SSL_V3],
          customHeaders: {
            'x-env-dynamodb-region': props.dynamodbRegion,
            'x-env-dynamodb-table-aliases': props.ddbTableAlias.tableName,
            'x-env-bucket-region': props.staticDeployBucketRegion,
            'x-env-bucket-id': props.staticDeployBucketId,
          },
        }),
        allowedMethods: AllowedMethods.ALLOW_GET_HEAD,
        cachedMethods: AllowedMethods.ALLOW_GET_HEAD,
        compress: true,
        viewerProtocolPolicy: ViewerProtocolPolicy.ALLOW_ALL,
        originRequestPolicy: OriginRequestPolicy.CORS_CUSTOM_ORIGIN,
        cachePolicy: CachePolicy.CACHING_OPTIMIZED_FOR_UNCOMPRESSED_OBJECTS,
        edgeLambdas: lambdaFunctionAssociations,
      },
      enabled: true,
      enableIpv6: true,
      comment: `${props.deploymentName} - ProxyConfig`,
      priceClass: PriceClass.PRICE_CLASS_100,
    });

  }
}