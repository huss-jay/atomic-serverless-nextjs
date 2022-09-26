import * as path from 'path';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export interface ProxyEdgeFunctionProps {
  deploymentName: string;
}

export class ProxyEdgeFunction extends Construct {
  public readonly cfProxyEdgeFunction: cloudfront.experimental.EdgeFunction;

  constructor(scope: Construct, id: string, props: ProxyEdgeFunctionProps) {
    super(scope, id);

    this.cfProxyEdgeFunction = new cloudfront.experimental.EdgeFunction(this, 'CfProxy', {
      code: lambda.Code.fromAsset(path.join(__dirname, '../../../packages/proxy/dist.zip')),
      handler: 'handler.handler',
      description: `Proxy function managed by CDK - ${props.deploymentName}`,
      runtime: Runtime.NODEJS_14_X,
    });

  }
}