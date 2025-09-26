# Travel Nurse Logbook - Minimal Docker Setup

This is a **bare minimum Docker configuration** for testing the Travel Nurse Logbook static website locally with HTTPS.

## 🚀 Quick Start

```bash
# Start the site
cd docker
./tnl-docker.sh start

# Visit https://localhost in your browser
# (Accept the self-signed certificate warning)
```

## 📋 What's Included

- **Nginx Alpine**: Lightweight web server
- **HTTPS/SSL**: Self-signed certificates for localhost testing
- **Static Site**: Serves the TNL site from the `/site` directory
- **Auto HTTP→HTTPS**: All HTTP requests redirect to HTTPS

## 🛠 Management Commands

```bash
cd docker                   # Enter docker directory first
./tnl-docker.sh start       # Start the web server
./tnl-docker.sh stop        # Stop the web server  
./tnl-docker.sh restart     # Restart the web server
./tnl-docker.sh status      # Check status and connectivity
./tnl-docker.sh logs        # View container logs
```

## 📁 File Structure

```
TNL/
├── docker/                 # Docker configuration directory
│   ├── docker-compose.yml # Docker configuration
│   ├── nginx-https.conf   # Nginx HTTPS configuration
│   ├── ssl/               # SSL certificates
│   │   ├── cert.pem       # Self-signed certificate
│   │   └── key.pem        # Private key
│   ├── tnl-docker.sh      # Management script
│   └── DOCKER-README.md   # This documentation
└── site/                  # Website files (from GitHub)
```

## 🔧 Configuration Details

- **URL**: https://localhost (port 443)
- **HTTP Redirect**: http://localhost → https://localhost
- **Container Name**: `tnl_web`
- **Network**: `tnl_default`

## ⚠️ Notes

1. **Testing Only**: This setup is designed for local testing, not production
2. **Self-Signed Certificates**: Browser will show security warnings - accept them
3. **No Backend**: Database and API are excluded for minimal testing
4. **Static Files Only**: Serves files from `/site` directory

## 🔄 Switching Between Setups

This minimal setup automatically stops conflicting containers on the same ports. To return to the full setup:

```bash
# Stop minimal setup
cd docker && ./tnl-docker.sh stop

# Start full setup (from original location)
cd /home/jason/Desktop/TravelNurseLogbook
docker-compose up -d
```

## 🎯 Purpose

This configuration provides the **absolute minimum** needed to:
- Test the static website locally
- Use HTTPS for proper functionality
- Avoid Python web server complications
- Keep resource usage minimal
- Enable quick iteration and testing