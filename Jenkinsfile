pipeline {
    agent { label 'thousandeyes' }

    options {
        skipDefaultCheckout(true)
        timeout(time: 10, unit: 'MINUTES')
    }

    parameters {
        string(name: 'TE_ACCOUNT_GROUP_ID', defaultValue: '', description: 'ThousandEyes account group ID')
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
                        thousandeyes synthetics run-tests \
                          --config thousandeyes-ci.json \
                          --account-group-id "$TE_ACCOUNT_GROUP_ID" \
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
