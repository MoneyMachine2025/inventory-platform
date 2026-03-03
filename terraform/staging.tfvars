aws_region = "us-east-1"
app_name   = "inventory-platform"
environment = "staging"

vpc_cidr       = "10.0.0.0/16"
public_subnets = ["10.0.1.0/24", "10.0.2.0/24"]
private_subnets = ["10.0.10.0/24", "10.0.11.0/24"]

# Minimal staging compute
api_cpu             = 256
api_memory          = 512
api_desired_count   = 1

alert_email = "rykoffofficial@gmail.com"

# Staging: no cache, no autoscaling
enable_redis = false
enable_autoscaling = false
