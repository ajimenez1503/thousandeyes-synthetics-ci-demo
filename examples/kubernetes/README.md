# Shared Kubernetes setup

Argo CD and Argo Rollouts run the same CLI inside a Kubernetes Job. The image and resource names in the manifests are examples; configure them for an existing demo namespace. These commands prepare resources and do not themselves create ThousandEyes instant tests.

## Build the CLI image

There is no published CLI container assumed by these examples. Build the shared CLI's Dockerfile at its pinned source commit and push the image to a registry your cluster can access:

```sh
export TE_CLI_IMAGE='your-registry/thousandeyes-cli:0.0.1-next'
docker build --platform linux/amd64 -t "$TE_CLI_IMAGE" \
  'https://github.com/ajimenez1503/thousandeyes-cli.git#5448e6e99e2a662756619a7f7a2cf1af81f1b5e9'
docker push "$TE_CLI_IMAGE"
```

Use `linux/arm64` for arm64 nodes, or publish a multi-platform image. Replace `your-registry/thousandeyes-cli:0.0.1-next` in the Argo example with your image, preferably pinned by digest. Configure image-pull authentication if your registry requires it. The CLI image has no shell or `jq`; render the suite before mounting it.

## Prepare the suite and token

From the repository root, load `TE_TOKEN` into your terminal environment without putting it in command history. Set your account settings and an existing namespace:

```sh
export TE_NAMESPACE='<demo-namespace>'
export TE_ACCOUNT_GROUP_ID='<account-group-id>'
export TE_AGENT_IDS='<agent-id>,<another-agent-id>'

TE_SUITE_FILE="$(mktemp)"
jq --arg aid "$TE_ACCOUNT_GROUP_ID" --arg ids "$TE_AGENT_IDS" \
  '.accountGroupId = $aid | .tests[].config.agents = ($ids | split(",") | map({agentId: .}))' \
  thousandeyes-ci.json > "$TE_SUITE_FILE"

kubectl -n "$TE_NAMESPACE" create configmap thousandeyes-suite \
  --from-file=thousandeyes-ci.json="$TE_SUITE_FILE" \
  --dry-run=client -o yaml | kubectl apply -f -
rm -f "$TE_SUITE_FILE"

set +x
printf 'TE_TOKEN=%s\n' "$TE_TOKEN" | \
  kubectl -n "$TE_NAMESPACE" create secret generic thousandeyes-api \
  --from-env-file=/dev/stdin --dry-run=client -o yaml | kubectl apply -f -
```

The Secret has a `TE_TOKEN` key, which both Job examples reference. Keep shell tracing disabled when handling the token. For a GitOps deployment, deliver the ConfigMap and Secret through your normal configuration and secret-management mechanism; do not commit the generated Secret YAML.

Both resources must exist in the namespace where the Job runs. The Jobs read the suite from `/config/thousandeyes-ci.json`, send the token through the environment, print sanitized JSON to their logs, and use the CLI exit code for success or failure. They use a five-minute CLI timeout, a six-minute Job deadline, and no retries.

For candidate validation, edit the suite to target the candidate or preview endpoint explicitly. A weighted endpoint may measure the stable revision. Selected ThousandEyes agents must be able to reach that endpoint; a Job running inside Kubernetes does not change their network reachability.
