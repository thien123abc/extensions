def handleCheckout() {
    // Merge Request
    if (env.gitlabMergeRequestId) {
        sh "echo 'Merge request detected. Merging...'"
        def credentialsId = scm.userRemoteConfigs[0].credentialsId
        checkout ([
                $class: 'GitSCM',
                branches: scm.branches,
                extensions: [
                        [$class: 'PruneStaleBranch'],
                        [$class: 'CleanCheckout']
                ],
                userRemoteConfigs: scm.userRemoteConfigs
        ])
        // Changes the name --> Repo
        checkout ([
                $class: 'GitSCM',
                branches: [[name: "rnd-ai/virtual-soc/extension/${env.gitlabSourceBranch}"]],
                extensions: [
                        [$class: 'PruneStaleBranch'],
                        [$class: 'CleanCheckout'],
                        [
                                $class: 'PreBuildMerge',
                                options: [
                                        fastForwardMode: 'NO_FF',
                                        mergeRemote: "rnd-ai/virtual-soc/extension",
                                        mergeTarget: env.gitlabTargetBranch
                                ]
                        ]
                ],
                userRemoteConfigs: [
                        [
                                credentialsId: credentialsId,
                                name: "rnd-ai/virtual-soc/extension",
                                url: env.gitlabTargetRepoHttpURL
                        ],
                        [
                                credentialsId: credentialsId,
                                name: "rnd-ai/virtual-soc/extension",
                                url: env.gitlabSourceRepoHttpURL
                        ]
                ]
        ])
    } else {
        sh "echo 'No merge request detected. Checking out current branch'"
        checkout ([
                $class: 'GitSCM',
                branches: scm.branches,
                extensions: [
                        [$class: 'PruneStaleBranch'],
                        [$class: 'CleanCheckout']
                ],
                userRemoteConfigs: scm.userRemoteConfigs
        ])
    }
}

def loginHarborRegistry(){
    // get env from Global credentials
    sh "echo 'get harbour credentials ...'"
    withCredentials([
        string(credentialsId: 'robot-name', variable: 'robotName'),
        string(credentialsId: 'robot-token', variable: 'robotToken'),
    ]) {
        withEnv(["username=${robotName}", "password=${robotToken}"]){
            // login to VCS Harbor registry
            sh "echo $password | docker login --username $username --password-stdin hub.viettelcybersecurity.com"
        }
    }
}

def processCheckout() {
    stage("Step 1: Check out") {
        gitlabCommitStatus("Step 1: Check out") {
            handleCheckout()
            sh "make env"
        }
    }
}

def buildImageDocker() {
    stage("Step 2: Build") {
        gitlabCommitStatus("Step 2: Build") {
            // build
            sh "echo 'Build....'"
            sh "make jenkins-build"
            //.........
        }
//          if (env.gitlabMergeRequestId) {
//              addGitLabMRComment(comment: "Build  Done....")
//          }
    }
}

def unitTest() {
    stage("Step 3: Unit test") {
        gitlabCommitStatus("Step 3: Unit test") {
            //run unit test
            sh "echo 'Unit test....'"
            // sh "make jenkins-test"
        }
    }
}

def codeQuality() {
    stage("Step 4: Code Quality") {
         gitlabCommitStatus("Step 4: Code Quality") {
            //run code quality - SonarQube
            sh "echo 'Code Quality....'"
            //sh "sed -i 's/\\/opt\\/api/\\/usr\\/src/g' coverage_report/coverage.xml"
            //.........
            if (env.gitlabMergeRequestId) {
                sh "make jenkins-sonar-check-merge"
            } else {
                sh "make jenkins-sonar-check-commit"
            }
        }
    }
}

def vulnerabilitiesCheck() {
    stage("Step 5: Vulnerabilities Check") {
        gitlabCommitStatus("Step 5: Vulnerabilities Check") {
            sh "echo 'Vulnerabilities Check....'"

            if (env.gitlabMergeRequestId) {
                sh "make jenkins-license-check-merge"
            } else {
                if (env.gitlabActionType == "TAG_PUSH") {
                    // format refs/tags/[tagName]
                    tagName = env.gitlabTargetBranch.substring(10)
                    sh "make jenkins-license-tag NEW-TAG=${tagName}"
                } else {
                    sh "make jenkins-license-check-commit"
                }
            }
        }
    }
}

def pushToArtifactRepo() {
    stage("Step 6: Push to artifact repo") {
        gitlabCommitStatus("Step 6: Push to artifact repo") {
             try {
                // push to artifact repo
                if (env.gitlabActionType == "TAG_PUSH") {
                    // format refs/tags/[tagName]
                    tagName = env.gitlabTargetBranch.substring(10)
                    println "Push to artifact repo with tagName: ${tagName}"
                    // loginHarborRegistry()
                    sh "make jenkins-push-tag NEW-TAG=${tagName}"

                } else {
                    if (env.gitlabTargetBranch.startsWith("master")) {
                        tagName = 'latest'
                        println "Push to artifact repo with tagName: ${tagName}"
                        // loginHarborRegistry()
                        sh "make jenkins-push-tag NEW-TAG=${tagName}"
                    }
                }
            } catch (exc) {
                echo exc
            } finally {
                sh "docker logout hub.viettelcybersecurity.com"
            }
        }
    }
}

def deployService() {
    stage("Step 7: Deploy") {
        if (env.gitlabActionType == "PUSH") {
            if (env.gitlabTargetBranch.startsWith("master")) {
                gitlabCommitStatus("Step 7: Deploy") {
                    // deploy to preprod env
                    // sh "ssh kb@10.255.250.164 < /home/debian/scripts/deploy_gatekeeper.sh"
                    //.........
                    sh "cd /home/ubuntu/Workspace/iml/iml-core-ansible && bash ansible_run.sh common.yml"
                    
                    sh "cd /home/ubuntu/Workspace/iml/iml-core-ansible && bash ansible_run.sh crawler.yml"
                }
            }
        }
        if (env.gitlabActionType == "PUSH") {
            if (env.gitlabTargetBranch.startsWith("staging")) {
                gitlabCommitStatus("Step 7: Deploy") {
                    // deploy to preprod env
                    // sh "ssh kb@10.255.250.164 < /home/debian/scripts/deploy_gatekeeper.sh"
                    //.........
                    sh "cd /home/ubuntu/Workspace/iml/iml-core-ansible && bash ansible_run.sh common.yml"

                    sh "cd /home/ubuntu/Workspace/iml/iml-core-ansible && bash ansible_run.sh crawler.yml"
                }
            }
        }
    }
}

def processCheckmarx() {
    withCredentials([
            string(credentialsId: 'CHECKMARX_PASSWORD', variable: 'CHECKMARX_PASSWORD'),
            string(credentialsId: 'CHECKMARX_USERNAME', variable: 'CHECKMARX_USERNAME'),
            usernamePassword(credentialsId: 'lochb_gitlab', usernameVariable: 'USERNAME', passwordVariable: 'GITLAB_TOKEN'),    // pragma: allowlist secret
            string(credentialsId: 'CHECKMARX_SEATABLE_TOKEN', variable: 'CHECKMARX_SEATABLE_TOKEN')
    ])
    {
        stage("Step 8: Checkmarx Scan") {
            if (env.gitlabMergeRequestId) {
                // do nothing
                //sh "make jenkins-checkmarx-merge GITLAB_TOKEN=$GITLAB_TOKEN"
            } else if (env.gitlabActionType == "TAG_PUSH" || env.gitlabBranch.startsWith("checkmarx-release") || env.gitlabBranch.startsWith("master")) {
                generateCxCommentScript()
                sh "make jenkins-checkmarx-commit GITLAB_TOKEN=$GITLAB_TOKEN"
                def branchName = env.gitlabBranch
                echo 'Running checkmarx when a new tag created'
                if (env.gitlabActionType == "TAG_PUSH" ) {
                    // format refs/tags/[tagName]
                    branchName = env.gitlabTargetBranch.substring(10)

                    // export report
                    echo branchName
                    sh "make jenkins-push-checkmarx-report BRANCH_NAME=$branchName"
                    sh "rm -R ${env.WORKSPACE}/seatable_json"
                }
                
                if (env.gitlabBranch.startsWith("master")) {
                        branchName = env.gitlabBranch

                        // export report
                        echo branchName
                        sh "make jenkins-push-checkmarx-report BRANCH_NAME=$branchName"
                        sh "rm -R ${env.WORKSPACE}/seatable_json"
                }
            }
        }
    }
}


def generateCxCommentScript(){
    def script = '''
        def repoUrl = request.getRepoUrl()
        def branch = request.getBranch()
        def app = request.getApplication()
        String scanComment = "$app | $branch | $repoUrl"
        println "INFO : Scanning code from $scanComment"
        return scanComment
    '''
    writeFile(file: "scanComment.groovy", text: script)
}

// {NODE_JENKINS_AGENT}
node("10.255.250.231") {
    try {
        withCredentials([
            string(credentialsId: 'SONAR_TOKEN', variable: 'sonarToken'),
            string(credentialsId: 'SCA_TOKEN', variable: 'SCA_TOKEN'),
        ]) {
        // step 1: Checkout
        processCheckout()
        // step 2: Build image
        // buildImageDocker()
        }
        // step 3: Unit test
        unitTest()
        // step 4: Code Quality
        codeQuality()
        // step 5: Vulnerabilities Check
        vulnerabilitiesCheck()
        // step 6: Checkmarx
        processCheckmarx()
    }
    catch (exc) {
        //echo exc.printStackTrace()
        echo exc.toString()
        echo exc.getMessage()
        echo "Failed"
    }
    finally {
        cleanWs()
    }
}
