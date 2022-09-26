# API Reference <a name="API Reference" id="api-reference"></a>

## Constructs <a name="Constructs" id="Constructs"></a>

### NextJsDeployment <a name="NextJsDeployment" id="@jayhuss/atomic-serverless-nextjs.NextJsDeployment"></a>

#### Initializers <a name="Initializers" id="@jayhuss/atomic-serverless-nextjs.NextJsDeployment.Initializer"></a>

```typescript
import { NextJsDeployment } from '@jayhuss/atomic-serverless-nextjs'

new NextJsDeployment(scope: Construct, id: string, props: NextJsDeploymentProps)
```

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@jayhuss/atomic-serverless-nextjs.NextJsDeployment.Initializer.parameter.scope">scope</a></code> | <code>constructs.Construct</code> | *No description.* |
| <code><a href="#@jayhuss/atomic-serverless-nextjs.NextJsDeployment.Initializer.parameter.id">id</a></code> | <code>string</code> | *No description.* |
| <code><a href="#@jayhuss/atomic-serverless-nextjs.NextJsDeployment.Initializer.parameter.props">props</a></code> | <code><a href="#@jayhuss/atomic-serverless-nextjs.NextJsDeploymentProps">NextJsDeploymentProps</a></code> | *No description.* |

---

##### `scope`<sup>Required</sup> <a name="scope" id="@jayhuss/atomic-serverless-nextjs.NextJsDeployment.Initializer.parameter.scope"></a>

- *Type:* constructs.Construct

---

##### `id`<sup>Required</sup> <a name="id" id="@jayhuss/atomic-serverless-nextjs.NextJsDeployment.Initializer.parameter.id"></a>

- *Type:* string

---

##### `props`<sup>Required</sup> <a name="props" id="@jayhuss/atomic-serverless-nextjs.NextJsDeployment.Initializer.parameter.props"></a>

- *Type:* <a href="#@jayhuss/atomic-serverless-nextjs.NextJsDeploymentProps">NextJsDeploymentProps</a>

---

#### Methods <a name="Methods" id="Methods"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@jayhuss/atomic-serverless-nextjs.NextJsDeployment.toString">toString</a></code> | Returns a string representation of this construct. |

---

##### `toString` <a name="toString" id="@jayhuss/atomic-serverless-nextjs.NextJsDeployment.toString"></a>

```typescript
public toString(): string
```

Returns a string representation of this construct.

#### Static Functions <a name="Static Functions" id="Static Functions"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@jayhuss/atomic-serverless-nextjs.NextJsDeployment.isConstruct">isConstruct</a></code> | Checks if `x` is a construct. |

---

##### ~~`isConstruct`~~ <a name="isConstruct" id="@jayhuss/atomic-serverless-nextjs.NextJsDeployment.isConstruct"></a>

```typescript
import { NextJsDeployment } from '@jayhuss/atomic-serverless-nextjs'

NextJsDeployment.isConstruct(x: any)
```

Checks if `x` is a construct.

###### `x`<sup>Required</sup> <a name="x" id="@jayhuss/atomic-serverless-nextjs.NextJsDeployment.isConstruct.parameter.x"></a>

- *Type:* any

Any object.

---

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@jayhuss/atomic-serverless-nextjs.NextJsDeployment.property.node">node</a></code> | <code>constructs.Node</code> | The tree node. |

---

##### `node`<sup>Required</sup> <a name="node" id="@jayhuss/atomic-serverless-nextjs.NextJsDeployment.property.node"></a>

```typescript
public readonly node: Node;
```

- *Type:* constructs.Node

The tree node.

---


## Structs <a name="Structs" id="Structs"></a>

### NextJsDeploymentProps <a name="NextJsDeploymentProps" id="@jayhuss/atomic-serverless-nextjs.NextJsDeploymentProps"></a>

#### Initializer <a name="Initializer" id="@jayhuss/atomic-serverless-nextjs.NextJsDeploymentProps.Initializer"></a>

```typescript
import { NextJsDeploymentProps } from '@jayhuss/atomic-serverless-nextjs'

const nextJsDeploymentProps: NextJsDeploymentProps = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@jayhuss/atomic-serverless-nextjs.NextJsDeploymentProps.property.deploymentName">deploymentName</a></code> | <code>string</code> | *No description.* |
| <code><a href="#@jayhuss/atomic-serverless-nextjs.NextJsDeploymentProps.property.domain">domain</a></code> | <code>string</code> | *No description.* |
| <code><a href="#@jayhuss/atomic-serverless-nextjs.NextJsDeploymentProps.property.hostedZoneDomainName">hostedZoneDomainName</a></code> | <code>string</code> | *No description.* |

---

##### `deploymentName`<sup>Required</sup> <a name="deploymentName" id="@jayhuss/atomic-serverless-nextjs.NextJsDeploymentProps.property.deploymentName"></a>

```typescript
public readonly deploymentName: string;
```

- *Type:* string

---

##### `domain`<sup>Required</sup> <a name="domain" id="@jayhuss/atomic-serverless-nextjs.NextJsDeploymentProps.property.domain"></a>

```typescript
public readonly domain: string;
```

- *Type:* string

---

##### `hostedZoneDomainName`<sup>Required</sup> <a name="hostedZoneDomainName" id="@jayhuss/atomic-serverless-nextjs.NextJsDeploymentProps.property.hostedZoneDomainName"></a>

```typescript
public readonly hostedZoneDomainName: string;
```

- *Type:* string

---



