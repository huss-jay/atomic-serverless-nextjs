import { CfnOutput, RemovalPolicy } from 'aws-cdk-lib';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import { CertificateValidation } from 'aws-cdk-lib/aws-certificatemanager';
import { PriceClass } from 'aws-cdk-lib/aws-cloudfront';

import * as cf from 'aws-cdk-lib/aws-cloudfront';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Role, ServicePrincipal, PolicyDocument, PolicyStatement, Effect, AnyPrincipal } from 'aws-cdk-lib/aws-iam';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { BucketAccessControl } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { MainApi } from './components/api';
import { CloudfrontMain } from './components/cloudfront-main';
import { DeployController } from './components/deploy-controller';
import { ImageOptimizerConstruct } from './components/image-optimizer';
import { ProxyEdgeFunction } from './components/proxy';
import { ProxyConfigConstruct } from './components/proxy-config';
import { StaticsDeployConstruct } from './components/statics-deploy';


const DEPLOYMENT_NAME = 'sls-nextjs';
const MANIFEST_KEY = '_tf-next/deployment.json';

export interface NextJsDeploymentProps {
  readonly deploymentName: string;
  readonly domain: string;
  readonly hostedZoneDomainName: string;
}

export class NextJsDeployment extends Construct {

  constructor(scope: Construct, id: string, props: NextJsDeploymentProps) {
    super(scope, id);

    const hostedZone = route53.HostedZone.fromLookup(this, `${props.deploymentName}-HostedZone`, {
      domainName: props.hostedZoneDomainName,
    });

    const cert = new acm.Certificate(this, `${props.deploymentName}-Cert`, {
      domainName: props.domain,
      subjectAlternativeNames: [`*.${props.domain}`],
      validation: CertificateValidation.fromDns(hostedZone),
    });

    const deploymentName = props.deploymentName ?? DEPLOYMENT_NAME;

    const ddbAliases = new dynamodb.Table(this, `${deploymentName}_aliases`, {
      tableName: `${deploymentName}_aliases`,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: {
        name: 'PK',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'SK',
        type: dynamodb.AttributeType.STRING,
      },
    });

    ddbAliases.addGlobalSecondaryIndex({
      indexName: 'DeploymentIdIndex',
      partitionKey: { name: 'GSI1PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI1SK', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.INCLUDE,
      nonKeyAttributes: [
        'BasePath',
        'CreateDate',
        'DeploymentId',
        'DeploymentAlias',
        'HostnameRev',
      ],
    });


    const ddbDeployments = new dynamodb.Table(this, `${deploymentName}_deployments`, {
      tableName: `${deploymentName}_deployments`,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: {
        name: 'PK',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'SK',
        type: dynamodb.AttributeType.STRING,
      },
    });

    ddbDeployments.addGlobalSecondaryIndex({
      indexName: 'CreateDateIndex',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI1SK', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.INCLUDE,
      nonKeyAttributes: ['CreateDate', 'DeploymentAlias', 'DeploymentId', 'Status'],
    });

    /********************************************************************* */

    /**
       # Serve Bucket (unzipped)
    */

    const staticsDeployServeBucket = new s3.Bucket(this, 'StaticsDeployServeBucket', {
      bucketName: `${deploymentName}-static-deploy-serve`,
      removalPolicy: RemovalPolicy.DESTROY,
      accessControl: BucketAccessControl.PRIVATE,
    });

    const staticsDeployOriginAccessIdentity = new cf.OriginAccessIdentity(this, 'StaticsDeployOriginAccessIdentity', {
      comment: `S3 CloudFront access ${staticsDeployServeBucket.bucketName}`,
    });

    staticsDeployServeBucket.addToResourcePolicy(new PolicyStatement({
      actions: ['s3:GetObject'],
      resources: [`${staticsDeployServeBucket.bucketArn}/*`],
      principals: [new AnyPrincipal()],
    }));

    staticsDeployServeBucket.addToResourcePolicy(new PolicyStatement({
      actions: ['s3:GetObject'],
      effect: Effect.DENY,
      resources: [`${staticsDeployServeBucket.bucketArn}/${MANIFEST_KEY}`],
      principals: [new AnyPrincipal()],
    }));
    /********************************************************************* */

    const deployControllerConstruct = new DeployController(this, 'DeployController', {
      deploymentName: deploymentName,
      ddbDeploymentTable: ddbDeployments,
      ddbAliasTable: ddbAliases,
      multipleDeploymentsBaseDomain: `.${props.domain}`,
    });

    /***
 *  CloudFormation Role
****/

    const cloudformationRole = new Role(
      this,
      `${deploymentName}-cfControl`,
      {
        assumedBy: new ServicePrincipal('cloudformation.amazonaws.com'),
        inlinePolicies: {
          'inline-sls-cfrole-policy': new PolicyDocument({
            // Allow CloudFormation to publish status changes to the SNS queue
            statements: [
              new PolicyStatement({
                effect: Effect.ALLOW,
                actions: ['sns:Publish'],
                resources: [`${deployControllerConstruct.deployControllerSnsTopic.topicArn}`], // this needs to be module.deploy_controller.sns_topic_arn
              }),
              // Allow CloudFormation to access the lambda content
              new PolicyStatement({
                effect: Effect.ALLOW,
                actions: ['s3:GetObject'],
                resources: [`${staticsDeployServeBucket.bucketArn}`, `${staticsDeployServeBucket.bucketArn}/*`], // this needs to be   module.statics_deploy.static_bucket_arn,
                // "${module.statics_deploy.static_bucket_arn}/*"
              }),
              new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                  // TODO: Restrict the API Gateway action more
                  'apigateway:*',
                  'iam:CreateRole',
                  'iam:GetRole',
                  'iam:GetRolePolicy',
                  'iam:PassRole',
                  'iam:PutRolePolicy',
                  'iam:TagRole',
                  'lambda:AddPermission',
                  'lambda:CreateFunction',
                  'lambda:CreateFunctionUrlConfig',
                  'lambda:GetFunctionUrlConfig',
                  'lambda:GetFunction',
                  'lambda:TagResource',
                  'logs:CreateLogGroup',
                  'logs:PutRetentionPolicy',
                  'logs:TagLogGroup',
                ],
                resources: ['*'],
              }),
              new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                  'apigateway:*',
                  'iam:DeleteRole',
                  'iam:DeleteRolePolicy',
                  'iam:UntagRole',
                  'lambda:DeleteFunction',
                  'lambda:DeleteFunctionUrlConfig',
                  'lambda:RemovePermission',
                  'lambda:UntagResource',
                  'logs:DeleteLogGroup',
                  'logs:DeleteRetentionPolicy',
                  'logs:UntagLogGroup',
                ],
                resources: ['*'],
              }),
            ],
          }),
        },
      },
    );


    const proxyConstruct = new ProxyEdgeFunction(this, 'CloudfrontProxy', {
      deploymentName: deploymentName,
    });

    const proxyConfigConstruct = new ProxyConfigConstruct(this, 'ProxyConfig', {
      deploymentName: deploymentName,
      ddbTableAlias: ddbAliases,
      dynamodbRegion: process.env.CDK_DEFAULT_REGION as string,
      staticDeployBucketId: staticsDeployServeBucket.bucketName,
      staticDeployBucketRegion: process.env.CDK_DEFAULT_REGION as string,
    });

    const imageOptimizerConstruct = new ImageOptimizerConstruct(this, 'ImageOptimizer', {
      deploymentName: deploymentName,
      staticsDeployBucket: staticsDeployServeBucket,
    });

    const cloudfrontMainConstruct = new CloudfrontMain(scope, 'CloufrontMain', {
      staticsDeployBucket: staticsDeployServeBucket,
      cloudfrontAliases: [`${props.domain}`, `*.${props.domain}`],
      proxyConfigEndpoint: proxyConfigConstruct.cloudfrontProxyConfig.distributionDomainName,
      cloudfrontAcmCertificateARN: cert.certificateArn,
      proxyEdgeFunction: proxyConstruct.cfProxyEdgeFunction,
      staticsDeployOriginAccessIdentity: staticsDeployOriginAccessIdentity,
      cloudfrontDefaultRootObject: '',
      deploymentName: DEPLOYMENT_NAME,
      cloudfrontPriceClass: PriceClass.PRICE_CLASS_100,
      imageOptimizerApi: imageOptimizerConstruct.apigw,
    });

    const staticDeploy = new StaticsDeployConstruct(this, 'StaticsDeploy', {
      cloudformationRole: cloudformationRole,
      staticsDeployBucket: staticsDeployServeBucket,
      cloudfrontMainId: cloudfrontMainConstruct.cloudfrontMain.distributionId,
      cloudfrontMainArn: `arn:aws:cloudfront::${cloudfrontMainConstruct.cloudfrontMain.env.account}:distribution/${cloudfrontMainConstruct.cloudfrontMain.distributionId}`,
      ddbAliasTable: ddbAliases,
      ddbDeploymentTable: ddbDeployments,
      deploymentName: deploymentName,
      deployStatusSnsTopic: deployControllerConstruct.deployControllerSnsTopic,
      multipleDeploymentsBaseDomain: `.${props.domain}`,
    });

    const api = new MainApi(this, 'MainApi', {
      ddbAliasTable: ddbAliases,
      ddbDeploymentTable: ddbDeployments,
      deploymentName: deploymentName,
      staticsDeployBucket: staticDeploy.staticUploadBucket,
    });

    new route53.ARecord(this, `${props.deploymentName}CFRecord`, {
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(cloudfrontMainConstruct.cloudfrontMain)),
      zone: hostedZone,
      recordName: props.domain,
    });

    new route53.ARecord(this, `${props.deploymentName}CF2Record`, {
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(cloudfrontMainConstruct.cloudfrontMain)),
      zone: hostedZone,
      recordName: `*.${props.domain}`,
    });

    new CfnOutput(this, `${props.deploymentName}ApiOutput`, {
      exportName: 'APIEndpoint',
      value: api.api.url as string,
    });

  }

}