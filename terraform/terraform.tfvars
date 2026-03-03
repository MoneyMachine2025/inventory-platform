aws_region = "us-east-1"
app_name   = "inventory-platform"
environment = "prod"

vpc_cidr       = "10.0.0.0/16"
public_subnets = ["10.0.1.0/24", "10.0.2.0/24"]
private_subnets = ["10.0.10.0/24", "10.0.11.0/24"]

api_cpu             = 512
api_memory          = 1024
api_desired_count   = 2

alert_email = "alerts@example.com"
