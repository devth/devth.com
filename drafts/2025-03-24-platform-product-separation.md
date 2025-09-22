
Every tech company has a platform and a product, and most of them get things
fundamentally wrong by mixing these two concepts to their great detriment.

Examples:

- A Terraform monorepo that sets up things like AWS accounts, IAM permissions,
  and also creates app-specific resources like S3 buckets, RDS databases, IAM
  roles, and GitHub repos.

## Programmatic Operation

A true platform is a system that can be programmatically managed and operated.
If your platform upgrade requires opening a PR in 60 (or 600) app-repos, you're
doing it wrong.

## What does this mean?

It means specs for artifacts like Dockerfiles and Helm Charts are generated, not
specified in-repo.

Database. Secrets. Networking.

These are things that services should just get for "free". It should be as easy
as:

```yaml
database: true
```

or

```yaml
database:
  enabled: true
  size: xl
```

or whateber your minimum required specification is. If you're single region,
don't make users care about region. If you're multi region, abstract over the
regional specifics. Compare the specs of running an app on Fly.io vs a Helm
Chart deployed to an EKS cluster. If you have a platform, your spec looks much
more like Fly.io's.

## Kubernetes specific product resources

If you're using Kubernetes underneath, consider using Custom Resource
Definitions to allow services to manage dependent infrastructure. The continuous
reconcilliation model is incredibly elegant and works well for this.

For example, your service may consist of the usual K8S concepts, like:

- a `Deployment` running containers
- a `Service` to route traffic to the containers
- an `Ingress` to allow traffic from outside the cluster and handle TLS
- a `Secret` to hold the database credentials

But it may also include non-K8S-native resources, like:

- an `ExternalSecret` to fetch secrets from your cloud secret manager repository
- a `PagerDuty` resource to represent the Service, Escalation Policy, and Team
  in PagerDuty
- a `Grafana` Alerting Policy, Contact Point, and Notification Policy
- an AWS Aurora instance for database storage

Or whatever your stack happens to consist of. This should all be represented
alongside the app as K8S objects, continuously reconciled in the same lifecycle
as the containers themselves. **It does not belong in Terraform**. Terraform
defines the platform layer. This is the product layer that lives on top.


## Terraform

If you insist on using Terraform, do it right. Terraform specifies the
infrastructure of your **platform**, not your **apps**. Apps run on the
platform and are dynamic in nature. They come and go and change and reorg.
Whereas the platform is relatively stable.

