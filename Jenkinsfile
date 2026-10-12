pipeline {
  agent any
  options { timestamps(); disableConcurrentBuilds() }
  parameters {
    choice(name: 'DEPLOY_ENV', choices: ['Development','Testing','Production'], description: 'Target environment')
    string(name: 'APP_VERSION', defaultValue: '1.0.0', description: 'Release version')
  }
  environment {
    DOCKER_IMAGE = 'YOUR_DOCKERHUB_USERNAME/devops-deployment-tracker'
    TRACKER_URL = 'http://YOUR_TRACKER_HOST:3000'
  }
  stages {
    stage('Checkout') {
      steps { checkout scm; script { env.SHORT_COMMIT = sh(script:'git rev-parse --short HEAD',returnStdout:true).trim(); env.IMAGE_TAG="${env.DOCKER_IMAGE}:${env.BUILD_NUMBER}" } }
    }
    stage('Install and Test') { steps { sh 'npm install'; sh 'npm test' } }
    stage('Build Image') { steps { sh 'docker build -t "$IMAGE_TAG" .' } }
    stage('Push Image') {
      steps { withCredentials([usernamePassword(credentialsId:'dockerhub-creds',usernameVariable:'DOCKER_USER',passwordVariable:'DOCKER_PASSWORD')]) {
        sh '''set +x
echo "$DOCKER_PASSWORD" | docker login -u "$DOCKER_USER" --password-stdin
docker push "$IMAGE_TAG"
docker logout'''
      } }
    }
    stage('Deploy to EC2') {
      steps { sshagent(credentials:['ec2-deploy-key']) {
        withCredentials([string(credentialsId:'ec2-deploy-host',variable:'DEPLOY_HOST')]) {
          sh '''ssh -o StrictHostKeyChecking=accept-new "$DEPLOY_HOST" "docker pull $IMAGE_TAG && (docker rm -f deployment-tracker-app >/dev/null 2>&1 || true) && docker run -d --name deployment-tracker-app --restart unless-stopped -p 3000:3000 --env-file /opt/deployment-tracker/.env $IMAGE_TAG"'''
        }
      } }
    }
  }
  post {
    always {
      script {
        def finalStatus = currentBuild.currentResult == 'SUCCESS' ? 'SUCCESS' : 'FAILED'
        withCredentials([string(credentialsId:'tracker-api-key',variable:'TRACKER_API_KEY')]) {
          sh '''
            curl --silent --show-error --fail \\
              -X POST "$TRACKER_URL/api/jenkins/deployments" \\
              -H 'Content-Type: application/json' \\
              -H "x-tracker-api-key: $TRACKER_API_KEY" \\
              --data "{\\"external_id\\":\\"$JOB_NAME#$BUILD_NUMBER\\",\\"project_name\\":\\"$JOB_NAME\\",\\"version\\":\\"$APP_VERSION\\",\\"build_number\\":\\"$BUILD_NUMBER\\",\\"environment\\":\\"$DEPLOY_ENV\\",\\"status\\":\\"BUILD_RESULT_PLACEHOLDER\\",\\"deployed_by\\":\\"jenkins\\",\\"image_tag\\":\\"$IMAGE_TAG\\",\\"commit_id\\":\\"$SHORT_COMMIT\\",\\"logs\\":\\"$BUILD_URL\\"}" || true
          '''.replace('BUILD_RESULT_PLACEHOLDER', finalStatus)
        }
      }
    }
  }
}
