# Free Tier RDS PostgreSQL Instance
resource "aws_db_instance" "sharedcart_free" {
  identifier = "sharedcart-db-free"
  
  # Database Configuration
  engine         = "postgres"
  engine_version = "16.4"
  instance_class = "db.t3.micro"  # FREE tier eligible
  
  # Storage (FREE tier limits)
  allocated_storage     = 20      # FREE: Up to 20 GB
  max_allocated_storage = 20      # Prevent auto-scaling charges
  storage_type          = "gp2"   # General Purpose SSD
  storage_encrypted     = true
  
  # Database Settings
  db_name  = "sharedcart"
  username = "postgres"
  password = var.db_password  # Set in terraform.tfvars
  port     = 5432
  
  # FREE tier backup settings
  backup_retention_period = 7                    # FREE: Up to 7 days
  backup_window          = "03:00-04:00"        # UTC time
  maintenance_window     = "sun:04:00-sun:05:00" # UTC time
  
  # Security
  publicly_accessible = true  # Needed for external access
  vpc_security_group_ids = [aws_security_group.rds_free.id]
  
  # FREE tier requirements
  availability_zone      = "ca-central-1a"  # Single-AZ only for free
  multi_az              = false             # Multi-AZ not free
  deletion_protection   = false             # For easy cleanup
  skip_final_snapshot   = true              # For easy cleanup
  
  tags = {
    Name        = "SharedCart Free RDS"
    Environment = "development"
    FreeTier    = "yes"
  }
}

# Security Group for RDS
resource "aws_security_group" "rds_free" {
  name_prefix = "sharedcart-rds-free-"
  description = "Security group for SharedCart free RDS instance"
  
  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]  # Open for development
    description = "PostgreSQL access"
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = {
    Name = "SharedCart RDS Free Security Group"
  }
}

# Output database connection details
output "rds_endpoint" {
  value = aws_db_instance.sharedcart_free.endpoint
  description = "RDS instance endpoint"
}

output "rds_port" {
  value = aws_db_instance.sharedcart_free.port
  description = "RDS instance port"
}

output "rds_database_name" {
  value = aws_db_instance.sharedcart_free.db_name
  description = "RDS database name"
}
