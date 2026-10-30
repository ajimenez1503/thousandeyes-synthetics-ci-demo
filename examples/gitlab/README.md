# GitLab CI

Import or mirror this repository into a GitLab project. GitLab reads the root [`.gitlab-ci.yml`](../../.gitlab-ci.yml).

1. Provision a Linux shell runner with the pinned CLI and `jq` on `PATH`; see [CLI installation](../../README.md#cli-installation). A container runner needs an image with both tools installed.
2. In **Settings > CI/CD > Variables**, add `TE_TOKEN` as a masked secret and add `TE_ACCOUNT_GROUP_ID` and `TE_AGENT_IDS`. If the token is protected, protect the default branch so the job can access it.
3. Run a pipeline on the default branch and start its manual **thousandeyes** job.
4. Inspect the job result and download its JSON/JUnit artifacts.

The manual job uses `allow_failure: false`, so a failed CLI command fails the job and blocks the pipeline. Reports use `artifacts: when: always`, including failed checks; GitLab does not upload these artifacts after a job timeout. The generated suite is not uploaded. See the [GitLab YAML reference](https://docs.gitlab.com/ci/yaml/).
