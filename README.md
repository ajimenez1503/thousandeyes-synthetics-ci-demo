# ThousandEyes synthetic CI demo

Run the same real ThousandEyes HTTP and TCP checks from your CI pipeline, deployment controller, or terminal. Every example uses [`thousandeyes-ci.json`](thousandeyes-ci.json) and the shared [`thousandeyes synthetics run-tests` CLI](https://github.com/ajimenez1503/thousandeyes-cli#synthetic-checks-for-ci-and-progressive-delivery).

| Platform | Example | Setup |
| --- | --- | --- |
| GitHub Actions | [`.github/workflows/ci.yml`](.github/workflows/ci.yml) | [Run below](#github-actions). |
| Jenkins | [`Jenkinsfile`](Jenkinsfile) | [Jenkins instructions](examples/jenkins/README.md). |
| GitLab CI | [`.gitlab-ci.yml`](.gitlab-ci.yml) | [GitLab instructions](examples/gitlab/README.md). |
| Developer terminal | [CLI commands](examples/terminal/README.md) | Install the CLI. |
| Argo CD | [PostSync Job](examples/argocd/post-sync-job.yaml) | [Argo CD instructions](examples/argocd/README.md). |
| Argo Rollouts | [AnalysisTemplate](examples/argo-rollouts/analysis-template.yaml) and [rollout step](examples/argo-rollouts/rollout-step.yaml) | [Rollouts instructions](examples/argo-rollouts/README.md). |

The Action is the GitHub wrapper. The other platforms invoke the shared CLI directly or through its container. This repository contains configuration examples and setup instructions, with no helper scripts, npm packages, or unit-test scaffolding.

## Shared settings

Provide these values in each platform's secret or variable settings:

| Setting | Purpose |
| --- | --- |
| `TE_TOKEN` | ThousandEyes API token; store as a secret. |
| `TE_ACCOUNT_GROUP_ID` | Account group in which to create instant tests. |

The token and account group ID stay in platform settings. Agent ID `66` is configured directly in both tests in `thousandeyes-ci.json`; edit the `agents` lists to use different agents. Each platform passes the account group through the CLI override. The CLI validates the suite before submitting tests.

Edit `thousandeyes-ci.json` to change targets and thresholds. The HTTP example expects `401` from an unauthenticated public API request. The TCP example checks port 443. Both use real measurements from the selected Cloud or Enterprise Agents.

Each execution creates instant tests and consumes applicable ThousandEyes units. The examples use manual CI execution. Argo examples run when their sync or rollout reaches the configured hook or analysis step. Agents must reach the target; running a Job inside Kubernetes does not give remote agents access to a private Service. Use connected Enterprise Agents for private targets and a private repository for private configuration or reports.

## GitHub Actions

This repository already has its GitHub secret and account variables configured.

1. Open **Actions > ThousandEyes checks > Run workflow**.
2. Choose `main` and select **Run workflow**.
3. Inspect the job summary and download **thousandeyes-results**.

The Action installs the pinned CLI automatically. The workflow preserves its exit status and uploads JSON/JUnit reports even when checks fail.

## CLI installation

The terminal, Jenkins, and GitLab examples require the `thousandeyes` executable on a Bash-compatible Linux/macOS host. GitLab's example assumes a provisioned Linux shell runner. If you use a container executor, its runner image must contain the CLI.

Install the matching OS/architecture archive from the pinned [CLI `0.0.1-next` release](https://github.com/ajimenez1503/thousandeyes-cli/releases/tag/0.0.1-next), verify it against the release checksum manifest, and place the executable on `PATH`. The GitHub Action performs its own verified installation. Kubernetes uses a CLI image that you build and publish as described in [Kubernetes setup](examples/kubernetes/README.md).

## Validation

Real ThousandEyes execution has been verified from GitHub Actions and a developer terminal. The added examples were reviewed, and their YAML, embedded shell syntax, and suite configuration were checked locally. They have not been executed in your Jenkins, GitLab, or Argo CD environment. Live ThousandEyes execution through Argo Rollouts also remains to verify.
