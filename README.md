# ThousandEyes synthetic CI demo

The [CI workflow](.github/workflows/ci.yml) runs real ThousandEyes HTTP and TCP instant tests using the [ThousandEyes Action](https://github.com/ajimenez1503/thousandeyes-synthetics-ci-github-action). A failed assertion or incomplete result fails the job. JSON and JUnit reports are saved as workflow artifacts.

## Run

1. Open **Actions > ThousandEyes checks > Run workflow**.
2. Choose `main` and select **Run workflow**.
3. Inspect the job summary and download the reports.

This repository already has the `TE_TOKEN` secret and the `TE_ACCOUNT_GROUP_ID` and `TE_AGENT_IDS` variables configured. In your own repository, configure those settings first. `TE_AGENT_IDS` is a comma-separated list of numeric agent IDs.

## Test configuration

Edit [`thousandeyes-ci.json`](thousandeyes-ci.json) to change the target and thresholds. CI fills the empty agent lists from `TE_AGENT_IDS` and passes the account group to the Action. Account settings and the token stay out of source files.

The HTTP check expects `401` because the example calls a public API without application credentials. The TCP check validates connectivity to port 443. Both checks run from your selected ThousandEyes agents.

The Action handles CLI installation, test creation, result polling, evaluation, and the CI exit code. This consumer demo needs no application code, helper scripts, npm packages, or unit tests.

The workflow is manually triggered. Each run creates instant tests and consumes applicable ThousandEyes units. Agents must be able to reach the configured target. Use a private repository for private targets or reports.
