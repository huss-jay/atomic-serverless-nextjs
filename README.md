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
