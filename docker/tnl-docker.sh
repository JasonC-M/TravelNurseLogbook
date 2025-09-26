#!/bin/bash

# TNL (Travel Nurse Logbook) Docker Management Script
# Minimal setup for testing the static site on https://localhost

case "$1" in
    "start")
        echo "Starting TNL Docker container..."
        cd "$(dirname "$0")"
        docker-compose up -d
        echo "✅ TNL site is now running at https://localhost"
        echo "   (HTTP requests will be redirected to HTTPS)"
        ;;
    "stop")
        echo "Stopping TNL Docker container..."
        cd "$(dirname "$0")"
        docker-compose down
        echo "✅ TNL site has been stopped"
        ;;
    "restart")
        echo "Restarting TNL Docker container..."
        cd "$(dirname "$0")"
        docker-compose down
        docker-compose up -d
        echo "✅ TNL site has been restarted at https://localhost"
        ;;
    "logs")
        echo "Showing TNL container logs..."
        cd "$(dirname "$0")"
        docker-compose logs -f
        ;;
    "status")
        echo "TNL Docker container status:"
        cd "$(dirname "$0")"
        docker-compose ps
        echo ""
        echo "Testing connectivity..."
        if curl -k -s https://localhost > /dev/null 2>&1; then
            echo "✅ Site is accessible at https://localhost"
        else
            echo "❌ Site is not accessible"
        fi
        ;;
    *)
        echo "TNL Docker Management"
        echo "Usage: $0 {start|stop|restart|logs|status}"
        echo ""
        echo "Commands:"
        echo "  start   - Start the TNL web server on https://localhost:443"
        echo "  stop    - Stop the TNL web server"
        echo "  restart - Restart the TNL web server"
        echo "  logs    - Show container logs"
        echo "  status  - Show container status and test connectivity"
        echo ""
        echo "Note: This is a minimal setup for testing the static site only."
        echo "      No database or backend API is included in this configuration."
        ;;
esac