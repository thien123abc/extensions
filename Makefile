VERSION-TAG=latest
WORKSPACE=.

# ENVIRONMENT
PROXY=http://10.255.250.223:3128

# {PROJECT-NAME}
PROJECT-NAME=vsoc-extension

# SONARQUBE
SONAR_URL=https://sonarqube.viettelcyber.com
# {SONAR_ID}
SONAR_ID=vsoc-extension
sonarToken=7891f02670b35d0db5504e6f1465fad47003ec8b

# {RID}
SCA_URL=sca.viettelcyber.com
RID=vsoc-extension
SCA_TOKEN=rPW72zCnq13Kry6-UP36f4vfDFAy_0q8L52DZSu8Mq4

# [CD] {SERVER_DEPLOY}
SERVER_DEPLOY=10.255.250.164
USER_ROOT=kb
PATH_SCRIPT_DEPLOY=/home/debian/scripts/deploy_gatekeeper.sh
LANGUAGE=python
CX_PRJ=ML
DOMAIN_IP=10.255.244.100
CHECKMARX_SEATABLE_TOKEN=0f8b3f80327b52d85ef52b27d1f04576053c95ea


env:
	env | sort

jenkins-test:
	cd $(WORKSPACE)
	mkdir coverage_report
	chmod 777 coverage_report
	docker run --rm -v $(WORKSPACE)/coverage_report:/tmp/coverage_report $(PROJECT-NAME):$(VERSION-TAG) pytest --cov-config=.coveragerc --cov=application/services --cov=helpers --cov-report xml --cov-report term-missing tests --disable-warnings -n 4

run-unit-test:
	pytest --cov-config=.coveragerc --cov=application/services --cov=helpers --cov-report html --cov-report term-missing tests --disable-warnings -n 4

jenkins-build:
	docker build $(WORKSPACE) -t $(PROJECT-NAME):$(VERSION-TAG)

build-dev:
	export HTTP_PROXY=$(PROXY)
	export HTTPS_PROXY=$(PROXY)
	export NO_PROXY=gitlab.viettelcyber.com,127.0.0.1
	export GIT_SSL_NO_VERIFY=true
	pip install -r requirements.txt
	pip install -r test_requirements.txt

jenkins-sonar-check-merge:
	docker run --rm --add-host=sonarqube.viettelcyber.com:$(DOMAIN_IP) -v "$(WORKSPACE):/usr/src" sonarsource/sonar-scanner-cli -D"sonar.projectKey=$(SONAR_ID)" -D"sonar.sources=." -Dsonar.host.url=$(SONAR_URL) -Dsonar.login=$(sonarToken) -D"sonar.pullrequest.key=$(gitlabMergeRequestIid)" -D"sonar.pullrequest.branch=$(gitlabSourceBranch)" -D"sonar.pullrequest.base=$(gitlabTargetBranch)" -Dsonar.scm.revision="$(gitlabMergeRequestLastCommit)" -Dsonar.scm.forceReloadAll=true

jenkins-sonar-check-commit:
	docker run --rm --add-host=sonarqube.viettelcyber.com:$(DOMAIN_IP) -v "$(WORKSPACE):/usr/src" sonarsource/sonar-scanner-cli -D"sonar.projectKey=$(SONAR_ID)" -D"sonar.sources=." -Dsonar.host.url=$(SONAR_URL) -Dsonar.login=$(sonarToken) -D"sonar.branch.name=$(gitlabBranch)" -Dsonar.scm.forceReloadAll=true

jenkins-push-artifact:
	docker tag $(PROJECT-NAME):$(VERSION-TAG) hub.viettelcybersecurity.com/vcssca/$(PROJECT-NAME):$(VERSION-TAG)
	docker push hub.viettelcybersecurity.com/vcssca/$(PROJECT-NAME):$(VERSION-TAG)

jenkins-license-check-merge:
	cd $(WORKSPACE)
	chmod +x sca
	docker run --rm --add-host=sca.viettelcyber.com:10.255.244.100 --env https_proxy=${PROXY} --env http_proxy=${PROXY} --env no_proxy=sca.viettelcyber.com -v $(WORKSPACE):/opt/project -w /opt/project ${LANGUAGE} /bin/sh -c "./sca analyze merge_request --rid=$(RID) --ob=$(gitlabSourceBranch) --tb=$(gitlabTargetBranch) --mid=$(gitlabMergeRequestIid) --tk=$(SCA_TOKEN)"

jenkins-license-check-commit:
	cd $(WORKSPACE)
	chmod +x sca
	docker run --rm --add-host=sca.viettelcyber.com:10.255.244.100 --env https_proxy=${PROXY} --env http_proxy=${PROXY} --env no_proxy=sca.viettelcyber.com -v $(WORKSPACE):/opt/project -w /opt/project ${LANGUAGE} /bin/sh -c "./sca analyze branch_commit --rid=$(RID) --bn=$(gitlabSourceBranch) --token=$(SCA_TOKEN)"

jenkins-license-tag:
	cd $(WORKSPACE)
	chmod +x sca
	docker run --rm --add-host=sca.viettelcyber.com:10.255.244.100 --env https_proxy=${PROXY} --env http_proxy=${PROXY} --env no_proxy=sca.viettelcyber.com -v $(WORKSPACE):/opt/project -w /opt/project ${LANGUAGE} /bin/sh -c "./sca analyze branch_commit --rid=$(RID) --bn=$(NEW-TAG) --token=$(SCA_TOKEN)"

jenkins-push-tag:
	bash /home/ubuntu/workspace/docker_login.sh
	docker tag $(PROJECT-NAME):$(VERSION-TAG) hub.viettelcybersecurity.com/iml/$(PROJECT-NAME):$(NEW-TAG)
	docker push hub.viettelcybersecurity.com/iml/$(PROJECT-NAME):$(NEW-TAG)

jenkins-deploy-dev:
	docker run --rm -v $(WORKSPACE)/ansible-cd:/opt/worker -v $(SCA_PWD_FILE):/tmp/pass --env ANS_USR=$(ANS_USR) --env ANS_PWD=$(ANS_PWD) --env ANSIBLE_HOST_KEY_CHECKING=False --env ANS_HOST=$(ANS_HOST) --env TAG=$(VERSION-TAG) hub.viettelcybersecurity.com/vcssca/ansible:final ansible-playbook -i hosts.yml deploy.yml --vault-password-file /tmp/pass

dev-run:
	python -m application

dev-docker-build:
	docker build -t $(PROJECT-NAME):$(VERSION-TAG) .


IGNORE_FOLDERS=data,.vscode,coverage,design,src/test,.scannerwork
IGNORE_FILES=sca,*.ini,*.txt,*.yml,*.yaml,Jenkinsfile,*.md,*.conf

jenkins-checkmarx-merge:
	docker run --rm --add-host checkmarx.viettelcyber.com:$(DOMAIN_IP) --add-host gitlab.viettelcyber.com:$(DOMAIN_IP) -v $(WORKSPACE):/opt/$(PROJECT-NAME) -v $(WORKSPACE)/scanComment.groovy:/opt/scanComment.groovy --env-file=.cx_env --env CHECKMARX_PASSWORD=$(CHECKMARX_PASSWORD) --env CHECKMARX_USERNAME=$(CHECKMARX_USERNAME) --env GITLAB_TOKEN=$(GITLAB_TOKEN) --env CX_FLOW_BUG_TRACKER=Gitlab --env CX_FLOW_BUG_TRACKER_IMPL=Gitlab hub.viettelcybersecurity.com/library/cx-flow java -jar /app/cx-flow.jar --scan --gitlab --app="$(PROJECT-NAME)" --cx-project=$(CX_PRJ) --spring.profiles.active=sast --f="/opt/$(PROJECT-NAME)" --repo-url="$(gitlabSourceRepoHomepage)" --project-id=$(gitlabMergeRequestTargetProjectId) --merge-id=$(gitlabMergeRequestIid) --bug-tracker="GITLABMERGE" --branch="$(gitlabSourceBranch)" --cx-flow.comment-script="/opt/scanComment.groovy" --exclude-folders=$(IGNORE_FOLDERS) --exclude-files=$(IGNORE_FILES)

jenkins-checkmarx-commit:
	docker run --rm --add-host checkmarx.viettelcyber.com:$(DOMAIN_IP) --add-host gitlab.viettelcyber.com:$(DOMAIN_IP) -v $(WORKSPACE):/opt/$(PROJECT-NAME) -v $(WORKSPACE)/seatable_json:/opt/json -v $(WORKSPACE)/scanComment.groovy:/opt/scanComment.groovy --env-file=.cx_env --env CHECKMARX_PASSWORD=$(CHECKMARX_PASSWORD) --env CHECKMARX_USERNAME=$(CHECKMARX_USERNAME) --env GITLAB_TOKEN=$(GITLAB_TOKEN) hub.viettelcybersecurity.com/library/cx-flow java -jar /app/cx-flow.jar --scan --app="$(PROJECT-NAME)" --cx-project=$(CX_PRJ) --spring.profiles.active=sast --f="/opt/$(PROJECT-NAME)" --branch="$(gitlabBranch)" --repo-url="$(gitlabSourceRepoHomepage)" --cx-flow.comment-script="/opt/scanComment.groovy" --exclude-folders=$(IGNORE_FOLDERS) --exclude-files=$(IGNORE_FILES) --cx-flow.bug-tracker=Json --cx-flow.bug-tracker-impl=Json --json.file-name-format="data.json" --json.data-folder="/opt/json"

jenkins-push-checkmarx-report:
	docker run --rm -v $(WORKSPACE)/seatable_json/data.json:/app/config/data.json --add-host seatable.viettelcyber.com:$(DOMAIN_IP) hub.viettelcybersecurity.com/library/checkmarx_seatable_report:latest /app/checkmarx_extension -app=$(PROJECT-NAME) -branch=$(BRANCH_NAME) -tk=$(CHECKMARX_SEATABLE_TOKEN)
