output "alb_dns_name" {
  description = "DNS name of the load balancer"
  value       = aws_lb.main.dns_name
}

output "api_url" {
  description = "API endpoint URL"
  value       = "https://${aws_lb.main.dns_name}"
}

output "ecr_repository_url" {
  description = "ECR repository URL for Docker images"
  value       = aws_ecr_repository.api.repository_url
}

output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.main.endpoint
}

output "rds_database_name" {
  description = "RDS database name"
  value       = aws_db_instance.main.db_name
}

output "inventory_events_queue_url" {
  description = "SQS inventory events queue URL"
  value       = aws_sqs_queue.inventory_events.url
}

output "inventory_events_dlq_url" {
  description = "SQS inventory events DLQ URL"
  value       = aws_sqs_queue.inventory_events_dlq.url
}

output "projection_jobs_queue_url" {
  description = "SQS projection jobs queue URL"
  value       = aws_sqs_queue.projection_jobs.url
}

output "projection_jobs_dlq_url" {
  description = "SQS projection jobs DLQ URL"
  value       = aws_sqs_queue.projection_jobs_dlq.url
}

output "app_secrets_arn" {
  description = "ARN of the application secrets"
  value       = aws_secretsmanager_secret.app_secrets.arn
}

output "db_password_secret_arn" {
  description = "ARN of the database password secret"
  value       = aws_secretsmanager_secret.db_password.arn
}



output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = aws_ecs_cluster.main.name
}

output "ecs_service_name" {
  description = "ECS service name"
  value       = aws_ecs_service.api.name
}

output "log_group_name" {
  description = "CloudWatch log group for ECS"
  value       = aws_cloudwatch_log_group.ecs_api.name
}
