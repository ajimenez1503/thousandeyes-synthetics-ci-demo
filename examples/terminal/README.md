# Developer terminal

From the repository root, use Bash or Zsh with the CLI and `jq` installed as described in the [main README](../../README.md#cli-installation).

Load `TE_TOKEN` from your secret manager or enter it without echoing it:

```sh
read -rs TE_TOKEN
export TE_TOKEN
```

Set your account group and agent IDs, then run the shared suite:

```sh
export TE_ACCOUNT_GROUP_ID='<account-group-id>'
export TE_AGENT_IDS='<agent-id>,<another-agent-id>'

TE_REPORT_DIR="$(mktemp -d)"
jq --arg aid "$TE_ACCOUNT_GROUP_ID" --arg ids "$TE_AGENT_IDS" \
  '.accountGroupId = $aid | .tests[].config.agents = ($ids | split(",") | map({agentId: .}))' \
  thousandeyes-ci.json > "$TE_REPORT_DIR/thousandeyes-ci.json"

thousandeyes synthetics run-tests \
  --config "$TE_REPORT_DIR/thousandeyes-ci.json" \
  --json-report "$TE_REPORT_DIR/results.json" \
  --junit-report "$TE_REPORT_DIR/results.xml"
```

Use a single numeric ID for one agent. The CLI exits `0` when the blocking checks pass and nonzero for failures, execution errors, or incomplete results. The reports are in `$TE_REPORT_DIR`. Check the command's exit status before running another command if you are using it as a gate.

A prepared suite also runs through the same CLI container used by Argo:

```sh
docker run --rm --user "$(id -u):$(id -g)" -e TE_TOKEN \
  -v "$TE_REPORT_DIR/thousandeyes-ci.json:/config/thousandeyes-ci.json:ro" \
  "$TE_CLI_IMAGE" synthetics run-tests \
  --config /config/thousandeyes-ci.json --json
```

Build `TE_CLI_IMAGE` using the [Kubernetes setup instructions](../kubernetes/README.md#build-the-cli-image). The container command writes its report to stdout and preserves the CLI exit status.
