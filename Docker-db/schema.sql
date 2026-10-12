CREATE DATABASE IF NOT EXISTS deployment_tracker CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE deployment_tracker;
CREATE TABLE IF NOT EXISTS deployments (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 external_id VARCHAR(190) NULL UNIQUE,
 project_name VARCHAR(120) NOT NULL,
 version VARCHAR(80) NOT NULL,
 build_number VARCHAR(80) NOT NULL,
 environment ENUM('Development','Testing','Production') NOT NULL DEFAULT 'Development',
 status ENUM('IN_PROGRESS','SUCCESS','FAILED','ROLLED_BACK') NOT NULL DEFAULT 'IN_PROGRESS',
 deployed_by VARCHAR(120) NOT NULL DEFAULT 'manual',
 image_tag VARCHAR(255) NULL,
 commit_id VARCHAR(80) NULL,
 logs TEXT NULL,
 started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 finished_at DATETIME NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 INDEX idx_project_name(project_name), INDEX idx_status(status), INDEX idx_started_at(started_at)
);
