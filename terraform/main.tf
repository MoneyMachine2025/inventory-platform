terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  # Backend will be configured in prod once S3 bucket created
  # For now, local state is fine for staging
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "inventory-platform"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# ============================================================================
# VPC & NETWORKING
# ============================================================================

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "${var.app_name}-vpc"
  }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${var.app_name}-igw"
  }
}

# Public Subnets (for ALB)
resource "aws_subnet" "public" {
  count                   = 2
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnets[count.index]
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "${var.app_name}-public-subnet-${count.index + 1}"
  }
}

# Private Subnets (for ECS, RDS)
resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_subnets[count.index]
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "${var.app_name}-private-subnet-${count.index + 1}"
  }
}

# No NAT gateways - using VPC endpoints instead for staging (cheaper)
# If endpoints hit blocker, can add NAT later

# Route Table for Public Subnets
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "${var.app_name}-public-rt"
  }
}

resource "aws_route_table_association" "public" {
  count          = 2
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# Route Tables for Private Subnets (no NAT gateway, using VPC endpoints)
resource "aws_route_table" "private" {
  count  = 2
  vpc_id = aws_vpc.main.id

  # VPC endpoints provide egress to AWS services; no default route to internet
  # This keeps private subnets truly private

  tags = {
    Name = "${var.app_name}-private-rt-${count.index + 1}"
  }
}

resource "aws_route_table_association" "private" {
  count          = 2
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}

# Data source for availability zones
data "aws_availability_zones" "available" {
  state = "available"
}

# ============================================================================
# SECURITY GROUPS
# ============================================================================

# ALB Security Group
resource "aws_security_group" "alb" {
  name_prefix = "alb-"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS from internet"
  }

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTP redirect to HTTPS"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound traffic"
  }

  tags = {
    Name = "${var.app_name}-alb-sg"
  }
}

# ECS Security Group
resource "aws_security_group" "ecs" {
  name_prefix = "ecs-"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
    description     = "API port from ALB"
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
    description = "HTTPS within VPC"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound traffic"
  }

  tags = {
    Name = "${var.app_name}-ecs-sg"
  }
}

# RDS Security Group
resource "aws_security_group" "rds" {
  name_prefix = "rds-"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs.id]
    description     = "PostgreSQL from ECS"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound traffic"
  }

  tags = {
    Name = "${var.app_name}-rds-sg"
  }
}

# No Redis for staging MVP

# ============================================================================
# RDS POSTGRESQL
# ============================================================================

resource "aws_db_subnet_group" "main" {
  name_prefix = "inventory-"
  subnet_ids  = aws_subnet.private[*].id

  tags = {
    Name = "${var.app_name}-db-subnet-group"
  }
}

resource "aws_rds_cluster_parameter_group" "main" {
  name_prefix = "inventory-"
  family      = "aurora-postgresql16"

  parameter {
    name  = "log_statement"
    value = "all"
  }

  tags = {
    Name = "${var.app_name}-cluster-pg"
  }
}

# Single-AZ RDS for staging (cheap, sufficient for MVP validation)
resource "aws_db_instance" "main" {
  identifier            = "${var.app_name}-db"
  engine               = "postgres"
  # Use latest available version (Terraform will select)
  instance_class       = "db.t4g.micro"  # Cheapest option for MVP
  allocated_storage    = 20              # GB (can grow to 50GB if needed)
  storage_type         = "gp3"
  storage_encrypted    = true
  
  db_name              = "inventory"
  username             = "postgres"
  password             = random_password.db_password.result
  
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  
  multi_az               = false  # Staging: single-AZ for cost
  publicly_accessible    = false
  
  backup_retention_period = 7  # Staging: 7 days (prod: 14)
  backup_window          = "03:00-04:00"
  maintenance_window     = "mon:04:00-mon:05:00"
  
  enabled_cloudwatch_logs_exports = ["postgresql"]
  
  skip_final_snapshot       = false
  final_snapshot_identifier = "${var.app_name}-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"
  
  tags = {
    Name = "${var.app_name}-db"
  }
}

# RDS monitoring via CloudWatch is sufficient for staging

# Redis: Not needed for staging MVP
# Projections in Postgres already achieve <20ms target
# Can add via CacheProvider abstraction in Phase 2 if needed

# ============================================================================
# SQS QUEUES
# ============================================================================

resource "aws_sqs_queue" "inventory_events_dlq" {
  name                      = "${var.app_name}-inventory-events-dlq"
  message_retention_seconds = 1209600  # 14 days

  tags = {
    Name = "${var.app_name}-inventory-dlq"
  }
}

resource "aws_sqs_queue" "inventory_events" {
  name                       = "${var.app_name}-inventory-events"
  visibility_timeout_seconds = 300
  message_retention_seconds  = 86400  # 1 day
  
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.inventory_events_dlq.arn
    maxReceiveCount     = 3
  })

  tags = {
    Name = "${var.app_name}-inventory-events"
  }
}

resource "aws_sqs_queue" "projection_jobs_dlq" {
  name                      = "${var.app_name}-projection-jobs-dlq"
  message_retention_seconds = 1209600

  tags = {
    Name = "${var.app_name}-projection-dlq"
  }
}

resource "aws_sqs_queue" "projection_jobs" {
  name                       = "${var.app_name}-projection-jobs"
  visibility_timeout_seconds = 300
  message_retention_seconds  = 86400
  
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.projection_jobs_dlq.arn
    maxReceiveCount     = 3
  })

  tags = {
    Name = "${var.app_name}-projection-jobs"
  }
}

# ============================================================================
# SECRETS MANAGER
# ============================================================================

resource "random_password" "db_password" {
  length            = 32
  special           = true
  override_special  = "_!#$%&*()-=+[]{}<>:?"  # Only RDS-safe special chars
}

resource "aws_secretsmanager_secret" "db_password" {
  name_prefix             = "inventory-db-password-"
  recovery_window_in_days = 0

  tags = {
    Name = "${var.app_name}-db-password"
  }
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = random_password.db_password.result
}

resource "aws_secretsmanager_secret" "app_secrets" {
  name_prefix             = "inventory-app-secrets-"
  recovery_window_in_days = 0

  tags = {
    Name = "${var.app_name}-app-secrets"
  }
}

resource "aws_secretsmanager_secret_version" "app_secrets" {
  secret_id = aws_secretsmanager_secret.app_secrets.id
  secret_string = jsonencode({
    DATABASE_URL = "postgresql://postgres:${random_password.db_password.result}@${aws_db_instance.main.endpoint}:5432/inventory"
    NODE_ENV     = "production"
  })
}

# ============================================================================
# S3 FOR TERRAFORM STATE
# ============================================================================

resource "aws_s3_bucket" "terraform_state" {
  bucket_prefix = "inventory-platform-terraform-state-"

  tags = {
    Name = "${var.app_name}-terraform-state"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_dynamodb_table" "terraform_locks" {
  name           = "terraform-locks"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  tags = {
    Name = "terraform-locks"
  }
}

# ============================================================================
# SNS FOR ALARMS
# ============================================================================

resource "aws_sns_topic" "alerts" {
  name_prefix = "inventory-alerts-"

  tags = {
    Name = "${var.app_name}-alerts"
  }
}

resource "aws_sns_topic_subscription" "alerts_email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}
