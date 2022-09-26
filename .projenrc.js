const { awscdk, JsonFile } = require('projen');
const { NodePackageManager } = require('projen/lib/javascript');
const { NpmAccess } = require('projen/lib/javascript');

const project = new awscdk.AwsCdkConstructLibrary({
  author: 'huss-jay',
  authorAddress: '65642137+huss-jay@users.noreply.github.com',
  cdkVersion: '2.4.0',
  defaultReleaseBranch: 'main',
  prerelease: true,
  name: '@jayhuss/atomic-serverless-nextjs',
  npmAccess: NpmAccess.PUBLIC,
  repositoryUrl: 'https://github.com/huss-jay/atomic-serverless-nextjs.git',
  packageManager: NodePackageManager.NPM,
  deps: [
    '@aws-cdk/aws-apigatewayv2-alpha@2.4.0-alpha.0',
    '@aws-cdk/aws-apigatewayv2-integrations-alpha@2.4.0-alpha.0',
    '@aws-cdk/aws-apigatewayv2-authorizers-alpha@2.4.0-alpha.0',
  ] /* Runtime dependencies of this module. */,
  // description: undefined,  /* The description is just a string that helps people understand the purpose of the package. */
  devDeps: [
    'esbuild',
    '@tsconfig/node14',
    'aws-sdk',
    'ncc-zip',
  ] /* Build dependencies for this module. */,
  // packageName: undefined,  /* The "name" in package.json. */
});

project.npmignore.include('dist.zip');

project.addTask('install:packages', {
  exec: 'find packages/. -maxdepth 2 -name package.json -execdir npm ci \\;',
});

project.addTask('install:image-optimizer', {
  exec: ' find image-optimizer/. -maxdepth 2 -name package.json -execdir yarn \\;',
});

project.addTask('zip:packages', {
  exec: 'find packages/. -maxdepth 2 -name package.json -execdir npm run build \\;',
});

project.addTask('zip:image-optimizer', {
  exec: ' find image-optimizer/. -maxdepth 1 -name package.json -execdir yarn build \\;',
});

project.addTask('cp:packages', {
  exec: "find packages -maxdepth 2 -name dist.zip -exec sh -c 'cd lib && mkdir -p `dirname {}` && cd .. && cp {} `dirname {}`/`basename {} dist.zip` ./lib/`dirname {}`' \\;",
});

project.addTask('cp:image-optimizer', {
  exec: "find image-optimizer -maxdepth 2 -name dist.zip -exec sh -c 'cd lib && mkdir -p `dirname {}` && cd .. && cp {} `dirname {}`/`basename {} dist.zip` ./lib/`dirname {}`' \\;",
});

project.synth();
