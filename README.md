# Atomic Serverless Nextjs

**Experimental Version**

This wouldn't have been possible without MilliVolt Infrastructure's Terraform [module](https://github.com/milliHQ/terraform-aws-next-js).

- MilliVolt's latest infrastructure introduced the separation of responsibilities between the infrastructure and deployment of NextJS.

- The module is still in the experimental phase so this construct may have the same bugs/limitations as the module.

- If you are not familiar with MilliVolt Infrastructure, I highly recommend reading their [blogs](https://milli.is).

The drive to creating this construct came from keeping the number of languages and technologies down to a minimum for developers.

\*\* This construct depends on the tf-next cli to deploy at its current state.

\*\* disclaimer: All resources that are created in your AWS account are designed to be fully serverless.
However, always keep an eye or two on the costs of any infrastructure you are provisioning regardless of the serverless aspect of it.

## Additional Information

This construct is however built with an batteries included approach. Here are the following infrastructure resources that it will create:

- Cloudfront
- Dynamodb
- API Gateway
- Lambda
- Lambda@edge
- SQS
- SNS
- S3
- R53 records
- ACM certificates
- IAM roles/policies

The only arguments it requires
is:

- Deployment Name (can be anything or will default to 'sls-nextjs')
- domain (will be used as the wildcard domain for atomic deployments)
- hosted zone domain name (hosted zone that exists within the AWS account)

## Installation

Install cdk construct with npm

```bash
  npm install @jayhuss/atomic-serverless-nextjs
```

Import module

```bash
  import { NextJsDeployment } from '@jayhuss/atomic-serverless-nextjs'

  export class SampleStack extends Stack {

	constructor(scope: Construct, id: string, props?: StackProps) {
		super(scope, id, props);

		 new NextJsDeployment(this, 'nextjsDeployment', {
			deploymentName: 'sls-nextjs',
			domain: 'web.example.com',
			hostedZoneDomainName: 'example.com'
		});
	}
}
```

Output will be an API endpoint which will be used to deploy your nextJS application

```
Outputs:
SampleStack.nextjsDeploymentslsApiOutput = https://<api-id>.execute-api.<region>.amazonaws.com/
```

## Deployments

In order to deploy, you will need to use the tf-next CLI

```
npm i -g tf-next@1.0.0-canary.5
```

Build the NextJS project (in order to run in serverless environment)

```
tf-next build
```

Deploy the application

```
tf-next deploy --endpoint https://<api-id>.execute-api.<region>.amazonaws.com

> success Deployment package uploaded
> success Deployment ready
> Available at: https://abasdkj323.example.com/

```
