# terraform/acm-route53.tf
# ACM Certificate (only if custom domain is enabled)
resource "aws_acm_certificate" "frontend" {
  count             = var.enable_custom_domain ? 1 : 0
  domain_name       = var.domain_name
  validation_method = "DNS"

  # Certificate must be in us-east-1 for CloudFront
  provider = aws.us_east_1

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "${var.project_name}-frontend-cert"
  }
}

# Route53 Hosted Zone (only if custom domain is enabled)
data "aws_route53_zone" "frontend" {
  count = var.enable_custom_domain ? 1 : 0
  name  = var.domain_name
}

# Certificate validation records
resource "aws_route53_record" "frontend_cert_validation" {
  count   = var.enable_custom_domain ? 1 : 0
  zone_id = data.aws_route53_zone.frontend[0].zone_id
  name    = tolist(aws_acm_certificate.frontend[0].domain_validation_options)[0].resource_record_name
  type    = tolist(aws_acm_certificate.frontend[0].domain_validation_options)[0].resource_record_type
  records = [tolist(aws_acm_certificate.frontend[0].domain_validation_options)[0].resource_record_value]
  ttl     = 60
}

# Certificate validation
resource "aws_acm_certificate_validation" "frontend" {
  count           = var.enable_custom_domain ? 1 : 0
  certificate_arn = aws_acm_certificate.frontend[0].arn
  validation_record_fqdns = [
    aws_route53_record.frontend_cert_validation[0].fqdn
  ]

  provider = aws.us_east_1

  timeouts {
    create = "5m"
  }
}

# Route53 A record pointing to CloudFront
resource "aws_route53_record" "frontend" {
  count   = var.enable_custom_domain ? 1 : 0
  zone_id = data.aws_route53_zone.frontend[0].zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.frontend.domain_name
    zone_id                = aws_cloudfront_distribution.frontend.hosted_zone_id
    evaluate_target_health = false
  }
}

# Additional provider for us-east-1 (required for ACM certificates used with CloudFront)
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
  
  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "Terraform"
      Owner       = var.owner
    }
  }
}