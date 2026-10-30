# Jenkins

Use the root [`Jenkinsfile`](../../Jenkinsfile) in a Pipeline job configured as **Pipeline script from SCM**.

1. Provision a Unix agent labeled `thousandeyes` with the pinned CLI and `jq` on `PATH`; see [CLI installation](../../README.md#cli-installation). Change the label in `Jenkinsfile` if your agents use another name.
2. Add a Jenkins **Secret text** credential containing your API token, with ID `thousandeyes-api-token`. Scope it to this job or folder.
3. Configure the Pipeline job to check out this repository and use `Jenkinsfile` as its script path.
4. Start **Build with Parameters** and supply `TE_ACCOUNT_GROUP_ID` and `TE_AGENT_IDS`. An initial build may be needed to register the parameters. With empty values, the CLI rejects configuration before creating tests; then use **Build with Parameters**.
5. Inspect the stage result and download the archived `reports/results.json` and `reports/results.xml` files.

The pipeline renders the shared suite, runs the CLI, and uses its exit code as the build gate. Reports are archived in `post { always { ... } }`. The generated suite is not archived. Credentials use Jenkins binding and shell environment expansion, following the [Jenkins credentials guidance](https://www.jenkins.io/doc/pipeline/steps/credentials-binding/).
