pipeline {
    agent { label 'thousandeyes' }

    options {
        skipDefaultCheckout(true)
        timeout(time: 10, unit: 'MINUTES')
    }

    parameters {
        string(name: 'TE_ACCOUNT_GROUP_ID', defaultValue: '', description: 'ThousandEyes account group ID')
        string(name: 'TE_AGENT_IDS', defaultValue: '', description: 'Comma-separated numeric agent IDs')
    }

    stages {
        stage('Checkout') {
            steps {
                sh 'rm -f reports/results.json reports/results.xml'
                checkout scm
            }
        }

        stage('ThousandEyes checks') {
            steps {
                withCredentials([string(credentialsId: 'thousandeyes-api-token', variable: 'TE_TOKEN')]) {
                    sh '''
                        set +x
                        set -eu
                        mkdir -p reports
                        jq --arg aid "$TE_ACCOUNT_GROUP_ID" --arg ids "$TE_AGENT_IDS" \
                          '.accountGroupId = $aid | .tests[].config.agents = ($ids | split(",") | map({agentId: .}))' \
                          thousandeyes-ci.json > reports/thousandeyes-ci.json
                        thousandeyes synthetics run-tests \
                          --config reports/thousandeyes-ci.json \
                          --json-report reports/results.json \
                          --junit-report reports/results.xml
                    '''
                }
            }
        }
    }

    post {
        always {
            archiveArtifacts artifacts: 'reports/results.json,reports/results.xml', allowEmptyArchive: true
        }
    }
}
