# Argo CD

1. Complete the [shared Kubernetes setup](../kubernetes/README.md): publish the CLI image and create the suite ConfigMap and token Secret in the application's namespace.
2. Replace the image placeholder in [`post-sync-job.yaml`](post-sync-job.yaml), then include that manifest in the resources managed by your Argo CD Application.
3. Sync the Application. After the application resources are healthy, Argo CD runs the PostSync Job and its real ThousandEyes checks.
4. Inspect the sync result and Job logs:

```sh
kubectl -n "$TE_NAMESPACE" logs job/thousandeyes-synthetics
```

A passing Job completes the hook. A failed check marks the sync operation failed. A PostSync failure does not automatically roll back the deployed application. Use [Argo Rollouts](../argo-rollouts/README.md) when the check should control canary promotion or abort.

The hook retains the latest Job for inspection. `BeforeHookCreation` replaces it on the next sync. Hooks do not run during selective sync. See the official [Argo CD sync hooks documentation](https://argo-cd.readthedocs.io/en/stable/user-guide/sync-waves/).
