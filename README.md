# ThousandEyes synthetic CI demo

Run real HTTP and TCP checks from GitHub Actions with the [ThousandEyes synthetic CI Action](https://github.com/ajimenez1503/thousandeyes-synthetics-ci-github-action). The workflow calls the Action pinned to merged commit `1d59d4d82e07e1015e553995a4ecd820938915f2`.

Cloud or Enterprise Agents measure your application and network. The Action installs the pinned CLI, which creates instant tests, waits for every assigned agent, evaluates thresholds, and produces JSON and JUnit reports. The preview supports `http-server` and `agent-to-server` test types.

## Run the demo

Each run creates real instant tests and consumes applicable ThousandEyes units. Use a nonproduction account group and a target you control. Workflow runs and report artifacts in this public repository can expose target information and measurements. Use a private copy for private operational data.

1. Store your ThousandEyes API bearer token as the repository secret `TE_TOKEN` under **Settings > Secrets and variables > Actions**. The token needs permission to create instant tests and read results in the chosen account group. Never put it in a workflow input or commit it to a file.
2. Select one to five Cloud or Enterprise Agent IDs available to that account group. The agents must be able to reach your target. Private targets require reachable Enterprise Agents. Remote agents cannot reach an application running only on the GitHub runner's `localhost`.
3. Open [Actions: ThousandEyes synthetic CI demo](https://github.com/ajimenez1503/thousandeyes-synthetics-ci-demo/actions/workflows/demo.yml), select **Run workflow**, and choose `main`.
4. Enter your account group ID, comma-separated agent IDs, and an HTTPS target URL. Set **expected-http-status** to the response the endpoint should return, such as `200` for a health endpoint or `401` for a deliberately unauthenticated endpoint. Select the API matching your token: production or STG.
5. Leave **scenario** as `healthy` for the first run. Open the job summary and download **live-synthetic-reports** to inspect JSON and JUnit results, including each agent's measurements and failure reasons.

The workflow runs only when manually dispatched. A push or pull request does not start billable instant tests. Forking this repository does not copy its secrets.

This repository has defaults configured for the `antonjim-demo` account group, the Ashburn, VA Cloud Agent, and `https://api.thousandeyes.com/v7/stream`. The HTTP check deliberately sends no application credentials and expects `401`; the TCP check targets the same host on port 443. Select **Run workflow** with the default `healthy` scenario to use this setup.

Blank inputs use the repository variables `TE_ACCOUNT_GROUP_ID`, `TE_AGENT_IDS`, `TE_TARGET_URL`, and `TE_EXPECTED_HTTP_STATUS`. Optional `TE_NETWORK_HOST` and `TE_NETWORK_PORT` variables override the network destination defaults. Explicit workflow inputs take precedence. In a fork or private copy, configure your own secret and variables, or enter the values when dispatching.

## Workflow inputs

| Input | Purpose |
| --- | --- |
| `account-group-id` | Account group in which to create the instant tests. |
| `agent-ids` | One to five unique positive agent IDs, separated by commas. |
| `target-url` | Reachable HTTPS application or API endpoint. |
| `expected-http-status` | Expected HTTP response code; defaults to `200`. |
| `network-host` | Optional DNS hostname or IP address; defaults to the target URL's hostname. Enter the host without a port. |
| `network-port` | TCP destination port; defaults to `443`. |
| `api-base-url` | Production or STG ThousandEyes API origin matching your token. |
| `scenario` | `healthy`, `blocking-failure`, or `non-blocking-failure`. |

The suite uses a five-minute deadline, five-second polling, maximum HTTP response time of 2 seconds, maximum total time of 3 seconds, no network loss, maximum network latency of 150 ms, and maximum jitter of 50 ms. Adjust thresholds in [`scripts/create-live-suite.js`](scripts/create-live-suite.js) to fit your service and agent locations.

## Demonstrate CI gate behavior

| Scenario | HTTP expectation | CI behavior |
| --- | --- | --- |
| `healthy` | Your expected HTTP status | Passes when HTTP and TCP checks meet all thresholds. |
| `blocking-failure` | Deliberately incorrect status | Fails the job when the endpoint returns its normal status. |
| `non-blocking-failure` | Deliberately incorrect status | Reports the HTTP assertion failure but permits success if the TCP check passes. |

Failure scenarios change the test expectation; they do not change the application. The TCP check remains blocking. Authentication failures, missing agent measurements, and execution errors can still fail either scenario.

Counts describe suite tests, not agents. A non-blocking assertion failure remains visible in JSON and JUnit even when the Action succeeds, so an independent JUnit gate must account for that rule. The workflow uploads reports with `if: always()` so reports remain available after a failed check.

## Copy the release gate into your project

Deploy your preview or staging application first, then run the Action against its reachable URL. Checking out a pull request does not make its application reachable to ThousandEyes agents.

```yaml
- name: Check deployed application and network
  id: synthetics
  uses: ajimenez1503/thousandeyes-synthetics-ci-github-action@1d59d4d82e07e1015e553995a4ecd820938915f2
  with:
    api-token: ${{ secrets.TE_TOKEN }}
    config-path: thousandeyes-ci.json
- name: Save reports even when the checks fail
  if: always()
  uses: actions/upload-artifact@cf430e030ddbb5b0abf93d22962f4752f3646cd9 # v7
  with:
    name: thousandeyes-results
    path: |
      ${{ steps.synthetics.outputs.json-report }}
      ${{ steps.synthetics.outputs.junit-report }}
```

Use the Action's [`examples/thousandeyes-ci.json`](https://github.com/ajimenez1503/thousandeyes-synthetics-ci-github-action/blob/1d59d4d82e07e1015e553995a4ecd820938915f2/examples/thousandeyes-ci.json) as a suite template. Replace the placeholder account group, agents, target, and thresholds. The workflow needs `permissions: contents: read` and a checkout step with `persist-credentials: false`.

The same suite runs from a terminal or another CI system:

```sh
thousandeyes synthetics run-tests --config thousandeyes-ci.json --json-report results.json --junit-report results.xml
```

Supply the token through `TE_TOKEN`. See the [CLI repository](https://github.com/ajimenez1503/thousandeyes-cli) for installation.

## Maintain the demo

Node.js 24 or newer is required for the suite generator and its input-validation tests. They use built-in modules and need no npm dependencies.

```sh
npm test
```

These tests validate configuration generation. Run the GitHub workflow to verify real account access, agent measurements, and target reachability.
