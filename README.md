# DevOps Deployment Tracker

Starter mini-project: Node.js, Express, MySQL, Docker, Jenkins, and AWS EC2.

## Local run (Docker Compose)
1. Install Docker Engine and Docker Compose plugin.
2. Copy `.env.example` to `.env` and change the sample secrets.
3. Run `docker compose up --build -d`.
4. Open `http://localhost:3000` and check `http://localhost:3000/api/health`.
5. Logs: `docker compose logs -f app`.

## Local run without Docker
1. Install Node.js 20+ and MySQL 8+.
2. Run `mysql -u root -p < schema.sql`.
3. Copy `.env.example` to `.env`; set local DB credentials.
4. Run `npm install`, then `npm start`.

## API
- `GET /api/health`
- `GET /api/deployments?status=FAILED&project=payment`
- `GET /api/deployments/:id`
- `POST /api/deployments`
- `PUT /api/deployments/:id`
- `DELETE /api/deployments/:id`
- `POST /api/jenkins/deployments` (requires `x-tracker-api-key`)

Example:
```bash
curl -X POST http://localhost:3000/api/deployments -H 'Content-Type: application/json' -d '{"project_name":"payment-service","version":"1.0.0","build_number":"12","environment":"Testing","status":"SUCCESS","deployed_by":"vinay","image_tag":"example/payment-service:12","commit_id":"abc1234","logs":"Deployment completed"}'
```

## Jenkins + AWS notes
Install Pipeline, Git, Credentials Binding and SSH Agent plugins. Jenkins agent needs Node.js/npm, Docker CLI with daemon access, curl and SSH client. Create credentials:
- `dockerhub-creds`: username/password for Docker Hub
- `ec2-deploy-key`: SSH username + private key
- `ec2-deploy-host`: secret text such as `ec2-user@YOUR_EC2_PUBLIC_DNS`
- `tracker-api-key`: secret text matching `TRACKER_API_KEY` on the tracker server

Edit `DOCKER_IMAGE` and `TRACKER_URL` in `Jenkinsfile`. The EC2 host needs Docker installed, the SSH user must be allowed to run Docker, and `/opt/deployment-tracker/.env` must contain the app's DB settings and same API key. Ensure the tracker URL is reachable from Jenkins. The provided Jenkinsfile is a learning starter; validate the shell commands and callback behavior in a test environment before production use.

Security: keep `.env` out of Git, use strong secrets, restrict inbound rules, and never expose MySQL port 3306 publicly. Add authentication/authorization and HTTPS before making the dashboard public.
