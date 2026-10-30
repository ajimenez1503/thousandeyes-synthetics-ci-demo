# Developer terminal

From the repository root, use Bash or Zsh with the CLI installed as described in the [main README](../../README.md#cli-installation). Agent IDs and targets are already configured in the shared suite.

Load `TE_TOKEN` from your secret manager or enter it without echoing it:

```sh
read -rs TE_TOKEN
export TE_TOKEN
```

Set your account group and run the suite directly:

```sh
export TE_ACCOUNT_GROUP_ID='<account-group-id>'
TE_REPORT_DIR="$(mktemp -d)"

thousandeyes synthetics run-tests \
  --config thousandeyes-ci.json \
  --account-group-id "$TE_ACCOUNT_GROUP_ID" \
  --json-report "$TE_REPORT_DIR/results.json" \
  --junit-report "$TE_REPORT_DIR/results.xml"
```

The CLI exits `0` when the blocking checks pass and nonzero for failures, execution errors, or incomplete results. The reports are in `$TE_REPORT_DIR`. Check the command's exit status before running another command if you are using it as a gate.

The same suite also runs through the CLI container used by Argo:

```sh
docker run --rm --user "$(id -u):$(id -g)" -e TE_TOKEN \
  -v "$PWD/thousandeyes-ci.json:/config/thousandeyes-ci.json:ro" \
  "$TE_CLI_IMAGE" synthetics run-tests \
  --config /config/thousandeyes-ci.json \
  --account-group-id "$TE_ACCOUNT_GROUP_ID" --json
```

Build `TE_CLI_IMAGE` using the [Kubernetes setup instructions](../kubernetes/README.md#build-the-cli-image). The container command writes its report to stdout and preserves the CLI exit status.
