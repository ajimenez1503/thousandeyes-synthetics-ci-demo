# Argo Rollouts

1. Complete the [shared Kubernetes setup](../kubernetes/README.md): publish the CLI image and create the suite ConfigMap and token Secret in the Rollout's namespace.
2. Apply [`analysis-template.yaml`](analysis-template.yaml):

```sh
kubectl -n "$TE_NAMESPACE" apply -f examples/argo-rollouts/analysis-template.yaml
```

3. Set your image in [`rollout-step.yaml`](rollout-step.yaml) and insert its list entry under your Rollout's `spec.strategy.canary.steps`, after the candidate is ready. The snippet is not a standalone Kubernetes resource.
4. Deploy a new candidate revision. Inspect the resulting AnalysisRun and its Job logs.

The AnalysisTemplate runs the CLI once with a Job provider. Exit `0` passes the analysis; a nonzero exit fails it. With this inline analysis and `failureLimit: 0`, a failed check aborts the rollout's progression. Configure routing and abort behavior for your application. The suite must target the candidate explicitly, and its agents must reach that endpoint.

The template arguments let you override the CLI image, suite ConfigMap name, and token Secret name. The Job uses no pod retries and a six-minute deadline around the CLI's five-minute timeout. See the official [Argo Rollouts Job provider documentation](https://argo-rollouts.readthedocs.io/en/stable/analysis/job/).
