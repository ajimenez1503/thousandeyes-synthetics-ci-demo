# ThousandEyes synthetic CI demo

Run instant HTTP and network checks in GitHub Actions with the [ThousandEyes synthetic CI Action](https://github.com/ajimenez1503/thousandeyes-synthetics-ci-github-action). This repository is a consumer example: its workflow calls the external Action pinned to merged commit `1d59d4d82e07e1015e553995a4ecd820938915f2`.

The preview supports `http-server` and `agent-to-server` tests. The Action installs the pinned CLI, creates instant tests, waits for results from every assigned agent, evaluates thresholds, and publishes a job summary plus JSON and JUnit reports. The shared CLI handles execution and evaluation.

## Try the demo without an account

1. Open [Actions: ThousandEyes synthetic CI demo](https://github.com/ajimenez1503/thousandeyes-synthetics-ci-demo/actions/workflows/demo.yml).
2. Select **Run workflow**, choose `main`, leave **mode** as `mock`, and run it. A push to `main` or a pull request also runs mock mode.
3. Open the run to inspect the steps and job summary. Download **mock-synthetic-reports** from its artifacts.

Mock mode uses the real published Action and CLI against a loopback mock of the ThousandEyes API. The token, account group, agents, and measurements are fixtures. It creates no live ThousandEyes tests and consumes no ThousandEyes units.

| Scenario | Simulated result | Actual Action step | Expected test counts |
| --- | --- | --- | --- |
| Healthy | Two agents pass HTTP and TCP checks | Success, CLI exit 0 | 2 passed |
| Blocking failure | Both agents report HTTP 503 instead of 200 | Failure, CLI exit 1 | 1 failed |
| Non-blocking failure | Both agents report HTTP 503 instead of 200 | Success, CLI exit 0 | 1 failed, including 1 non-blocking failure |
| Incomplete results | One agent passes; the second never reports | Failure, CLI exit 1 | 1 timed out |

The two intentional failed steps use `continue-on-error` so the demonstration can continue. A separate verification step checks their actual `outcome`, CLI exit codes, test counts, and report contents. The overall mock job is green only when these expectations match. Each test uses two agents, and counts remain per test.

For a normal release gate, omit `continue-on-error` from blocking checks, as the live job does. A non-blocking assertion failure remains visible in JSON and JUnit even when the Action succeeds. An independent JUnit gate must account for that rule. Timeouts and execution errors fail the Action regardless of the non-blocking assertion rule.

## Run against a real ThousandEyes account

Live mode creates real instant tests and consumes applicable ThousandEyes units. Use a nonproduction account group and a target you control. Reports can contain target information and measurements; this repository and its workflow runs are public. Use a private copy for private targets or operational data.

1. In this repository, open **Settings > Secrets and variables > Actions > New repository secret**. Add your ThousandEyes API bearer token as `TE_TOKEN`. Choose a token with permission to create instant tests and read results in the selected account group. Do not commit it to a file or enter it as a workflow input.
2. Choose one to five available Cloud or Enterprise Agent IDs. These agents must be assigned or available to your account group and able to reach your target. Private targets require reachable Enterprise Agents. Remote agents cannot reach an application running only on the GitHub runner's `localhost`.
3. Open the demo workflow, select **Run workflow**, and choose `mode: live`.
4. Fill in **account-group-id**, comma-separated **agent-ids**, and **target-url**, using an HTTPS health endpoint that returns 200. Select the API matching the token: production or STG. The optional **network-host** defaults to the target URL's hostname; **network-port** defaults to TCP 443.
5. Start with `scenario: healthy`. Both the HTTP and TCP tests use the selected agents. Open the job summary and download **live-synthetic-reports** to inspect measurements and per-agent failure reasons.

The live suite uses a five-minute deadline, five-second polling, maximum HTTP response time of 2 seconds, maximum total time of 3 seconds, no network loss, maximum latency of 150 ms, and maximum jitter of 50 ms. Adjust thresholds in [`scripts/create-live-suite.js`](scripts/create-live-suite.js) to fit your service and agent locations.

To demonstrate a gate failure against the same healthy endpoint, rerun with `scenario: blocking-failure`. The HTTP assertion deliberately expects status 599, so an actual 200 fails the job. Select `non-blocking-failure` to report the same assertion failure while allowing success if the network test passes. These scenarios change the test expectation; they do not change your application. Authentication failures, missing measurements, or network problems can still fail either run.

Live mode is manual only. Forking the repository does not copy its secrets. Mock CI proves the integration behavior; a successful live run separately proves your token, account group, agent access, and target reachability.

## Copy the release gate into your project

Deploy your preview or staging application first, then run the Action against its reachable URL. Do not assume checking out a pull request makes its application reachable to ThousandEyes agents.

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

Use [`examples/thousandeyes-ci.json`](https://github.com/ajimenez1503/thousandeyes-synthetics-ci-github-action/blob/1d59d4d82e07e1015e553995a4ecd820938915f2/examples/thousandeyes-ci.json) as the suite template. Replace its placeholder account group, agents, target, and thresholds. The workflow needs `permissions: contents: read` and a checkout step with `persist-credentials: false`.

The same suite runs from a terminal or another CI system with `thousandeyes synthetics run-tests --config thousandeyes-ci.json --json-report results.json --junit-report results.xml`. Supply the token through `TE_TOKEN`. See the [CLI repository](https://github.com/ajimenez1503/thousandeyes-cli) for installation.

## Maintain the demo

Node.js 24 or newer is required for the helper scripts. They use built-in modules and need no npm dependencies.

```sh
npm test
```

The mock helpers are adapted from the Action's Apache-2.0 licensed test fixtures. Execution logic stays in the shared CLI; this repository does not implement a separate synthetic engine.
