import * as api from '@aws-cdk/aws-apigatewayv2-alpha';
import { Duration, Fn } from 'aws-cdk-lib';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import { AllowedMethods, CacheHeaderBehavior, CachePolicy, CacheQueryStringBehavior, experimental, OriginAccessIdentity, OriginRequestPolicy, PriceClass, SecurityPolicyProtocol, ViewerProtocolPolicy } from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export interface CloudfrontMainConstructProps {
  staticsDeployBucket: s3.Bucket;
  proxyEdgeFunction: experimental.EdgeFunction;
  staticsDeployOriginAccessIdentity: OriginAccessIdentity;
  cloudfrontPriceClass: PriceClass;
  cloudfrontAliases?: string[];
  cloudfrontAcmCertificateARN: string;
  cloudfrontMinimumProtocolVersion?: SecurityPolicyProtocol; //TLSv1
  cloudfrontDefaultRootObject: string;
  cloudfrontOrigins?: any;
  cloudfrontDefaultBehavior?: any;
  cloudfrontCustomErrorResponse?: any;
  cloudfrontOrderedCacheBehaviors?: any;
  deploymentName: string;
  cloudfrontWebaclId?: string;
  proxyConfigEndpoint: string;
  imageOptimizerApi: api.HttpApi;
}

export class CloudfrontMain extends Construct {

  public readonly cloudfrontMain: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: CloudfrontMainConstructProps) {
    super(scope, id);


    const lambdaFunctionAssociations: cloudfront.EdgeLambda[] = [
      {
        functionVersion: props.proxyEdgeFunction.currentVersion,
        eventType: cloudfront.LambdaEdgeEventType.ORIGIN_REQUEST,
        includeBody: false,
      },
    ];

    const cfMainCachePolicy = new CachePolicy(this, 'cfMainCachePolicy', {
      comment: 'Managed by CDK',
      minTtl: Duration.seconds(0),
      defaultTtl: Duration.seconds(0),
      maxTtl: Duration.seconds(31536000),
      cookieBehavior: {
        behavior: 'all',
      },
      headerBehavior: CacheHeaderBehavior.allowList('Authorization', 'host'),
      queryStringBehavior: CacheQueryStringBehavior.all(),
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
    });

    const cfImageOptimizerCachePolicy = new CachePolicy(this, 'cfImageOptimizerCachePolicy', {
      comment: 'Managed by CDK - Image Optimizer',
      minTtl: Duration.seconds(0),
      defaultTtl: Duration.seconds(86400),
      maxTtl: Duration.seconds(31536000),
      cookieBehavior: {
        behavior: 'none',
      },
      headerBehavior: CacheHeaderBehavior.allowList('accept', 'referer'),
      queryStringBehavior: CacheQueryStringBehavior.allowList('url', 'w', 'q'),
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
    });

    const cfImageOptimizerOriginRequestPolicy = new OriginRequestPolicy(this, 'cfImageOptimizerOriginRequestPolicy', {
      comment: 'Managed by CDK - Image Optimizer Request Policy',
      cookieBehavior: {
        behavior: 'none',
      },
      headerBehavior: CacheHeaderBehavior.allowList('accept'),
      queryStringBehavior: CacheQueryStringBehavior.allowList('url', 'w', 'q'),
    });


    this.cloudfrontMain = new cloudfront.Distribution(this, 'CfMain', {
      defaultBehavior: {
        origin: new origins.S3Origin(props.staticsDeployBucket, {
          originAccessIdentity: props.staticsDeployOriginAccessIdentity,
          customHeaders: {
            'x-env-config-endpoint': `http://${props.proxyConfigEndpoint}`,
          },
        }),
        allowedMethods: AllowedMethods.ALLOW_ALL,
        cachedMethods: AllowedMethods.ALLOW_GET_HEAD,
        compress: true,
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        originRequestPolicy: OriginRequestPolicy.ALL_VIEWER,
        cachePolicy: cfMainCachePolicy,
        edgeLambdas: lambdaFunctionAssociations,
      },
      additionalBehaviors: {
        '/_next/image*': {
          origin: new origins.HttpOrigin(Fn.select(2, Fn.split('/', props.imageOptimizerApi.apiEndpoint)), {
            originShieldRegion: process.env.CDK_DEFAULT_REGION as string,
          }),
          viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          originRequestPolicy: cfImageOptimizerOriginRequestPolicy,
          allowedMethods: AllowedMethods.ALLOW_ALL,
          cachedMethods: AllowedMethods.ALLOW_GET_HEAD,
          cachePolicy: cfImageOptimizerCachePolicy,
        },
      },
      domainNames: props.cloudfrontAliases,
      certificate: acm.Certificate.fromCertificateArn(this, 'CloudfrontMainACM', props.cloudfrontAcmCertificateARN),
      enabled: true,
      enableIpv6: true,
      comment: `${props.deploymentName} - Main`,
      priceClass: props.cloudfrontPriceClass,
      minimumProtocolVersion: props.cloudfrontMinimumProtocolVersion ?? SecurityPolicyProtocol.TLS_V1,
      // add error response

      // probably need to add image optimization origin bucket later

    });
  }
}