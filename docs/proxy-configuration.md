# GitLab Proxy Configuration

This document explains how to configure GitLab Bud Chart to work with GitLab instances behind a proxy server.

Both the backend (Python) and frontend (Node.js/Vite) support proxy configuration.

## Environment Variables

Add the following environment variables to your `.env` file:

### Basic Proxy Settings

```bash
# HTTP proxy for GitLab API requests
HTTP_PROXY=http://proxy.example.com:8080

# HTTPS proxy for GitLab API requests
HTTPS_PROXY=https://proxy.example.com:8080

# Comma-separated list of hosts to bypass proxy
NO_PROXY=localhost,127.0.0.1,.internal.company.com
```

### SSL Certificate Verification

If your GitLab instance uses self-signed certificates or you're in a development environment:

```bash
# Disable SSL verification (not recommended for production)
GITLAB_SSL_VERIFY=false
```

## Configuration Examples

### Corporate Proxy with Authentication

```bash
HTTP_PROXY=http://username:password@proxy.company.com:8080
HTTPS_PROXY=https://username:password@proxy.company.com:8080
NO_PROXY=localhost,127.0.0.1,.company.com,gitlab.company.com
```

### Development Environment with Local GitLab

```bash
# No proxy needed for local development
NO_PROXY=localhost,127.0.0.1,host.docker.internal
GITLAB_SSL_VERIFY=false  # If using self-signed certificates
```

### Production Environment

```bash
HTTPS_PROXY=https://proxy.production.com:443
NO_PROXY=.internal.domain,.trusted.domain
GITLAB_SSL_VERIFY=true  # Always verify SSL in production
```

### Frontend API Configuration

```bash
# Frontend API URL (used by the frontend to connect to backend)
VITE_API_URL=http://localhost:8000

# Frontend proxy settings (for Vite dev server)
VITE_HTTP_PROXY=http://proxy.example.com:8080
VITE_HTTPS_PROXY=https://proxy.example.com:8080
VITE_NO_PROXY=localhost,127.0.0.1,.company.com
```

## Docker Compose Configuration

When running with Docker Compose, proxy settings are automatically passed to both backend and frontend containers:

```yaml
services:
  backend:
    environment:
      - HTTP_PROXY=${HTTP_PROXY}
      - HTTPS_PROXY=${HTTPS_PROXY}
      - NO_PROXY=${NO_PROXY}
      - GITLAB_SSL_VERIFY=${GITLAB_SSL_VERIFY}
  
  frontend:
    environment:
      - VITE_HTTP_PROXY=${HTTP_PROXY}
      - VITE_HTTPS_PROXY=${HTTPS_PROXY}
      - VITE_NO_PROXY=${NO_PROXY}
      - VITE_API_URL=${VITE_API_URL}
```

## Troubleshooting

### Connection Timeout

If you experience connection timeouts:
1. Verify proxy settings are correct
2. Check if GitLab URL is in the NO_PROXY list (if it shouldn't use proxy)
3. Test proxy connectivity: `curl -x $HTTP_PROXY https://gitlab.example.com`

### SSL Certificate Errors

If you get SSL certificate verification errors:
1. For development only: Set `GITLAB_SSL_VERIFY=false`
2. For production: Add the CA certificate to your system's certificate store
3. Consider using the full certificate chain

### Authentication Errors

If proxy authentication fails:
1. Ensure username and password are URL-encoded
2. Check proxy authentication method (Basic, NTLM, etc.)
3. Verify credentials with your network administrator

## Security Considerations

1. **Never commit `.env` files** containing proxy credentials
2. Use environment-specific `.env` files (`.env.development`, `.env.production`)
3. In production, use secrets management systems instead of `.env` files
4. Always enable SSL verification in production environments
5. Rotate proxy credentials regularly

### Frontend API Connection Issues

If the frontend cannot connect to the backend API:
1. Check `VITE_API_URL` is set correctly
2. Ensure backend is accessible from frontend container
3. For local development, verify Vite proxy configuration
4. Check browser console for CORS errors

### Development vs Production

- **Development**: Vite dev server handles proxy configuration
- **Production**: Frontend makes direct HTTP requests to backend

## Testing Proxy Configuration

Test your proxy configuration:

```bash
# Test backend connection
curl http://localhost:8000/api/gitlab/status

# Test frontend connection to backend
curl http://localhost:3000

# Check logs for proxy usage
docker-compose logs backend | grep -i proxy
docker-compose logs frontend | grep -i proxy

# Test with environment variables
HTTP_PROXY=http://proxy.example.com:8080 curl https://gitlab.example.com
```