## Authorization Strategy

Authorization strategies can be complex, this document aims to provide a flexible and scalable authorization solution that combines hierarchical RBAC (Role Based Access Control) and ABAC (Attribute Based Access Control).

Let's take a company as an example. Say a company has multiple departments, each department has multiple teams, and each team has multiple employees. The company has multiple resources, and each resource has multiple actions.

The definition of the company's position is as follows:

```ts
type Role = {
	name: string;
	parent: string | null;
	/* attribute `members` is for illustration purpose only, in real world, it's recommended to use many-to-many relationship */
	members: string[];
	"children-roles": Role[];
};

const role: Role[] = [
	{
		name: "admin",
		parent: null,
		members: ["Bob"],
		"children-roles": [
			{
				name: "chief-secretary",
				parent: "admin",
				members: ["Alice"],
				"children-roles": [],
			},
			{
				name: "vice-president",
				parent: "admin",
				members: ["David"],
				"children-roles": [],
			},
			{
				name: "chief-hr",
				parent: "admin",
				members: ["Charlie"],
				"children-roles": [
					{
						name: "hr",
						parent: "chief-hr",
						members: [],
						"children-roles": [
							{
								name: "hr-bp",
								parent: "hr",
								members: ["Eve", "Frank"],
								"children-roles": [],
							},
							{
								name: "hr-team-1-manager",
								parent: "hr",
								members: ["Grace"],
								"children-roles": [
									{
										name: "hr-team-1",
										parent: "hr-team-1-manager",
										members: ["Helen", "Henry"],
										"children-roles": [],
									},
								],
							},
							{
								name: "hr-team-2-manager",
								parent: "hr",
								members: ["Ian"],
								"children-roles": [
									{
										name: "hr-team-2",
										parent: "hr-team-2-manager",
										members: ["Ivy", "Isaac"],
										"children-roles": [],
									},
								],
							},
						],
					},
				],
			},
			{
				name: "cfo",
				parent: "admin",
				members: ["Iris"],
				"children-roles": [
					{
						name: "finance",
						parent: "cfo",
						members: [],
						"children-roles": [
							{
								name: "accounting-manager",
								parent: "finance",
								members: ["Jack"],
								"children-roles": [
									{
										name: "accounting",
										parent: "accounting-manager",
										members: ["Jane", "Joe"],
										"children-roles": [],
									},
								],
							},
						],
					},
				],
			},
			{
				name: "cto",
				parent: "admin",
				members: ["Kevin"],
				"children-roles": [
					{
						name: "vp-of-engineering",
						parent: "cto",
						members: ["Lily"],
						"children-roles": [],
					},
					{
						name: "engineering",
						parent: "cto",
						members: ["Daniel", "Daisy", "Dora"],
						"children-roles": [],
					},
				],
			},
		],
	},
];
```

There are two typical forms of resources when dealing with data models in a system:

Dynamic resources, where `Resource` is considered as a highly abstract model and is hard-coded, you're allowed to define different types of resources as actual models at runtime based on the abstract model `Resource`, then you create instances of these models. This form is adopted by [Strapi](https://docs.strapi.io/).

Static resources, where you don't have the `resource` concept to be explicitly defined in your code, instead, you hard-code different types of resources in your code directly as models, such as `Payroll`, `Performance`, etc. This form is adopted by [Prisma](https://www.prisma.io/).

In this document, we will focus on the static resources form.

### Basic RBAC

Say we have roles `admin`, `cfo`, and `accounting` (roles should be as granular as possible, even the role is only for one person), and resources `Payroll`.

Each instance of resource `Payroll` should only be scoped by roles `admin`, `cfo`, and `accounting`, note that we're not saying whether resource type `Payroll` can be accessed by certain roles, but whether a specific instance of resource `Payroll` can be accessed by certain roles.

Therefore, for whatever type of resource, we should have a `roles: Role[]` attribute to specify which roles can access the resource.

The model of resource `Payroll` can be defined as follows:

```ts
type Payroll = {
	id: number;
	roles: Role[];
};
```

An instance of resource `Payroll` can be defined as follows:

```json
{
	"id": 1,
	"roles": ["admin", "cfo", "accounting"]
}
```

### Hierarchical RBAC

Based on the rule we established previously that roles should be as granular as possible, each person should have at least one role. With this in mind, we can create hierarchical relationships between roles by adding a `parent: Role` attribute to roles. This is where ABAC comes to help.

> Essentially, ABAC is a model that defines access control based on **attributes** of the users(subjects), resources, actions, and environment. **Policies** (rules) are defined based on these attributes.
>
> https://www.permit.io/blog/how-to-implement-abac

Roles can now be connected in a tree structure.

The model of role can be defined as follows:

```ts
type Role = {
	id: number;
	name: string;
	parent: Role | null;
};
```

An instance of role can be defined as follows:

```json
{
	"id": 1,
	"name": "admin",
	"parent": null
}
```

```json
{
	"id": 2,
	"name": "cfo",
	"parent": 1
}
```

The key feature we want to achieve is by implementing hierarchical RBAC, as the parent of role `cfo` and role `cto`, role `admin` should have access to resource `Performance` of theirs automatically. This requires adding an attribute `superior: boolean` to resources, adding this to resource allows us to decouple the hierarchical business logic from the role model, keep the role model neat and simple, yet still achieve the hierarchical RBAC.

For example, some resource `Performance`'s `roles` attribute could be `['cfo']`, and some could be `['cto']`, and with `superior: true`, as parent role, `admin` should have access to both of them.

The model of resource `Performance` can be defined as follows:

```ts
type Performance = {
	id: number;
	roles: Role[];
	superior: boolean;
};
```

An instance of resource `Performance` can be defined as follows:

```json
{
	"id": 1,
	"roles": ["cfo"],
	"superior": true
}
```

Still we have one last challenge, at the lowest level of the hierarchy, suppose we have a role `engineering`, in which we have multiple engineers, and each engineer should have access to their own `Performance` resource, while they should not have access to other engineers' `Performance` resource. We cannot add a role to each engineer just for this purpose as it dramatically increases the number of roles and the complexity of the system.

In nature, we're talking about if a resource should be private or public for owner's peers within a role. This can be achieved by adding an attribute `peer: boolean` to resources. Then we can say, for resource `Performance`, it should be `peer: true` (again, we're not talking about the resource type, but the instance of the resource, however, when defining a new resource type, you could hardcode this attribute to apply it to every instance of the resource type if needed).

| superior | peer  | superiors | peers | self |
| -------- | ----- | --------- | ----- | ---- |
| true     | false | yes       | yes   | yes  |
| false    | true  | no        | no    | yes  |
| false    | false | no        | yes   | yes  |
| true     | true  | yes       | no    | yes  |

Let's add the `peer: boolean` attribute to the model of resource `Performance`:

```ts
type Performance = {
	id: number;
	roles: Role[];
	superior: boolean;
	peer: boolean;
};
```

At this point, we actually introduced a new access control model, which is relationship-based access control (ReBAC), where access control is based on the relationship between subjects.

We will soon encounter an issue that if try to translate the rule using [CASL](https://casl.js.org/v6/en)'s syntax based on ([Prisma WhereInput](https://www.prisma.io/docs/reference/api-reference/prisma-client-reference#where)), we will find it's not possible to express the rule. Because we need to check whether the requester's role is a superior of the resource's role recursively, which is not supported by Prisma's WhereInput.

```ts
export class CaslAbilityFactory {
	constructor(private readonly prismaService: PrismaService) {}

	async defineAbilityFor(requester: Member): Promise<AppAbility> {
		const { can, cannot, build } = new AbilityBuilder<AppAbility>(
			createPrismaAbility
		);

		can(Actions.READ, "Performance", {
			where: {
				AND: [
					/* is superior */
					{
						roles: {
							some: {
								/* ??? */
								/* You can't express recursive query here */
							},
						},
					},
				],
			},
		});

		const ability = build();
		return ability;
	}
}
```

CASL is therefore not suitable for this scenario, and the terrible thing is there is no library that can handle such a complex authorization strategy. We have to implement our own authorization strategy, and NestJS's Guard is a good place to start.

### Action

For simplicity, we've been downplaying an important concept, the `action`, which plays a crucial role in the authorization strategy, now it's time to bring it up.

CRUD operations are typical actions. However, in a real-world scenario, actions can be more complex, such as `approve`, `reject`, `submit`, `cancel`, etc. We definitely don't want to limit the actions to CRUD operations only. Therefore, we should have a `actions: Action[]` attribute in the resource model. The reason actions are associated with resources is that actions are more related to resources than roles, different resources could have different actions.

You can of course allow dynamically defining actions at runtime, just like permit.io does, while permit.io is developer-oriented, actions are meant to be defined by developers, not by end-users. Developers should have a good understanding of the system to define actions properly, in this case, runtime action definition offers little benefit. Therefore, we opted to hard-code actions in the system, that is to say, we need to define available actions for a certain resource type when defining the resource type.

### Resource

Resources can be anything that needs to be protected, such as `Payroll`, `Performance`, etc.

Let's modify the model of resource `Performance` to meet our needs:

```ts
type Performance = {
	id: number;
	score: number;
	/* roles that can access the resource */
	roles: Role[];
	/* actions that can be performed on the resource */
	readonly actions: string[];
	/* owner of the resource */
	owner?: Member;
	/* what actions the owner can perform on the resource */
	ownerActions: string[];
	/* what actions superior roles can perform on the resource */
	superiorActions: string[];
	/* what actions peers within the same role can perform on the resource */
	peerActions: string[];
};
```

Now you may think although this model appears eligible, it still heavily couples business logic with access control logic. And you will probably say, well I want to decouple them.

Now let's see what would happen if we try to decouple them by adding a `Policy` model.

Before we move on to the `Policy` model, let's trim the `Performance` model to include only business logic:

```ts
type Performance = {
	id: number;
	score: number;
	owner?: Member;
};
```

### Policy

Our goal is to build an independent PDP (Policy Decision Point), exposing APIs for our application to make authorization decisions based on policies.

In simple terms, policies are rules that define who (role or user) can do what (action) on which resource, and under what conditions, it should be agnostic to the business logic, so we can only use strings to represent roles, actions, and resources.

To combine RBAC, ABAC, and ReBAC, we need to decide the priority of these models. In our case, we prioritize ReBAC over ABAC, and ABAC over RBAC. This means if a policy is defined in ReBAC, it should be checked first, then ABAC, and finally RBAC.

The model of a RBAC policy can be defined as follows:

```ts
type Policy = {
	id: number;
	resource: string;
	/* actions that can be performed on the resource */
	actions: string[];
	/* a role that can access the resource */
	roleId: string;
	/* actions that can be performed by the role */
	roleActions: string[];
	/* actions that can be performed by the owner of the resource */
	ownerActions: string[];
	/* actions that can be performed by superior roles */
	superiorActions: string[];
	/* actions that can be performed by peers within the same role */
	peerActions: string[];
	// condition: any;
};
```

For example, a policy can be defined as follows:

```json
{
	"id": 1,
	"resource": "Performance",
	"action": ["approve", "reject"],
	"roleId": "admin",
	"roleActions": ["approve", "reject"],
	"ownerActions": [],
	"superiorActions": ["approve", "reject"],
	"peerActions": []
}
```

And the request body of a PDP API can look like this:

```http
POST /pdp
Content-Type: application/json

{
	"resource": "Performance"
	"role": "admin",
	"action": "approve",
}
```

PDP will find policies that match `resource` and `role`, then check if the `action` is allowed.

So now, we have a clear picture of RBAC policies implementation, let's move on to ABAC policies.

ABAC can be more complex as it's attribute-based, which is used to define conditions for access control.

Permit.io offers UI for defining policies (conditions), for example, it gives you 2 dropdowns for selecting a member's attribute (e.g. `member.roles`) and a criteria (e.g. `equals`, `not`, `contains`, `does not contain`, etc.), and a text input for entering the value for a single row, and you can add more rows then combine them with `AND` or `OR` operators.

To achieve this, we will need a parsing engine to parse the condition string into a function that can be executed to get the result. This is a complex task if we want to support all kinds of conditions.

Now let's think about a question: do we really benefit from decouple business logic from access control logic? The answer is no, and it's almost impossible to decouple them completely.

-   Ideally we want PDP to be agnostic to business logic, but in reality, but how can we define policies without knowing business logic? Especially when we need to define conditions for ABAC policies, PDP need to know a instance's attributes to make decisions.
