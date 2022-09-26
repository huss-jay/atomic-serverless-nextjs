# CDK ServerlessPros serverless-next.js CLI

Command-line interface (CLI) tool for [serverless-nextjs Next.js CDK construct for AWS](https://github.com/milliHQ/terraform-aws-next-js). Originally from MilliHQ [Terraform Next.js module for AWS](https://github.com/milliHQ/terraform-aws-next-js).

It is used for [building](#build) Next.js apps, deployment and management of deployments.

## Getting Started

1. Install the CLI tool

   ```plain
   npm i -g @serverlesspros/sp-next@1.0.0-alpha
   ```

2. Build the project

   ```plain
   sp-next build
   ```

3. Deploy the app

   ```plain
   sp-next deploy --endpoint https://<api-id>.execute-api.<region>.amazonaws.com

   > success Deployment package uploaded
   > success Deployment ready
   > Available at: https://1e02d46975338b63651b8587ea6a8475.example.com/
   ```

## Commands

### Build

#### Basic Usage

To build a Next.js app, run `sp-next build` from the directory where your `next.config.js` or `package.json` is located.
The app is then checked out into a temporary folder and build from there.
Once the build process is finished, a new folder `.sp-next` is added to your current working directory.
The `.sp-next` folder contains a deployment package that can be used together with the [deploy command](#deploy) to deploy your application.

```plain
sp-next build
```

#### Extended Usage

The `--skipDownload` flag can be used to prevent the checkout into a temporary folder (builds in the current working directory instead):

```plain
sp-next build --skipDownload
```

#### Global Options

The following options can be passed when using the `sp-next build` command:

- `--skipDownload`

### Deploy

To publish an previously built Next.js app to the system, run `sp-next deploy` from the same directory where the build command was executed from.

#### Basic Usage

```plain
sp-next deploy --endpoint <api-endpoint>
```

#### Global Options

The following options can be passed when using the `sp-next deploy` command:

- `--endpoint`
- `--profile` (also available as `--awsProfile`)  
  AWS profile to use for authenticating against the API endpoint. Uses `default` profile if not specified.

### Deployment

To manage the deployments that are published to the system.

#### Basic Usage

To show the most recent (25) deployments:

```plain
sp-next deployment ls
```

To remove (delete) an existing deployment from the system:

```plain
sp-next deployment rm <deployment-id>
```

#### Extended Usage

To delete an existing deployment including all of the aliases that are associated with it.

```plain
sp-next deployment rm <deployment-id> --force
```

#### Global Options

The following options can be passed when using the `sp-next deployment` command:

- `--endpoint`
- `--profile` (also available as `--awsProfile`)  
  AWS profile to use for authenticating against the API endpoint. Uses `default` profile if not specified.

### Alias

To managed the aliases that are deployed to the system

## License

Apache-2.0 - see [LICENSE](./LICENSE) for details.
