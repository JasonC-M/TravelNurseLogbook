# 🏥 Travel Nurse Logbook

A secure web application for travel nurses to track their contracts, assignments, and career journey with integrated mapping and profile management.

## 🎯 **Project Status: Production Ready**

This application has been fully refactored from a client-side vulnerable architecture to a secure, production-ready system with comprehensive backend API and frontend integration.

---

## 🏗️ **Architecture Overview**

### **Secure Design:**
- ✅ Secure Node.js backend with Express.js
- ✅ Protected API endpoints with JWT authentication
- ✅ Row Level Security (RLS) implementation
- ✅ Input validation and sanitization
- ✅ Docker containerized environment with HTTPS
- ✅ Frontend integration with secure API client

### **System Components:**
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Nginx Proxy   │───▶│   Node.js API    │───▶│   Supabase DB   │
│  (Port 443)     │    │   (Port 3000)    │    │   (Cloud)       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
        │
        ▼
┌─────────────────┐
│  Frontend App   │
│  (Static HTML)  │
└─────────────────┘
```

---

## 🚀 **Quick Start**

### **Prerequisites:**
- Docker and Docker Compose installed
- Supabase account and project set up

### **Environment Setup:**
1. **Configure Backend Environment:**
   ```bash
   cp backend/.env.example backend/.env
   # Edit backend/.env with your Supabase credentials
   ```

2. **Start Services:**
   ```bash
   cd docker
   docker-compose up -d
   ```

3. **Access Application:**
   - **Website**: https://localhost (main application)
   - **API**: https://localhost/api/health (health check)

### **Default Development URLs:**
- Frontend: https://localhost
- Backend API: https://localhost/api/*
- Direct Backend: http://localhost:3000 (development only)

---

## 📋 **Features**

### **🔐 Authentication & Security**
- JWT-based authentication with automatic token refresh
- Secure user registration and login
- Password reset functionality
- Protected routes and endpoints

### **👤 Profile Management**
- Complete user profile system
- Profile completion tracking
- Secure profile updates
- Account deletion with full cleanup

### **📝 Contract Management**
- Full CRUD operations for nursing contracts
- Contract filtering and search
- Pagination for large datasets
- Contract statistics and analytics

### **🗺️ Interactive Mapping**
- Visual contract location mapping
- Geographic contract history
- Location-based contract insights

---

## 🔧 **Development**

### **Project Structure:**
```
├── backend/                 # Secure Node.js API
│   ├── src/
│   │   ├── routes/         # API endpoint definitions
│   │   ├── middleware/     # Authentication & validation
│   │   └── config/         # Database & environment config
│   ├── Dockerfile          # Backend containerization
│   └── package.json        # Backend dependencies
├── docker/                 # Container orchestration
│   ├── docker-compose.yml  # Service definitions
│   └── nginx/             # Reverse proxy configuration
└── site/                   # Frontend application
    ├── js/                # Frontend JavaScript
    ├── css/               # Styling
    └── components/        # UI components
```

### **API Endpoints:**
- **Authentication:** `POST /api/auth/{register,login,logout,reset-password}`
- **Profile:** `GET|PUT|DELETE /api/profile`
- **Contracts:** `GET|POST|PUT|DELETE /api/contracts`
- **Health:** `GET /api/health`

### **Development Commands:**
```bash
# View logs
docker-compose logs -f backend
docker-compose logs -f nginx

# Restart services
docker-compose restart

# Rebuild after changes
docker-compose up -d --build

# Stop services
docker-compose down
```

---

## 🛡️ **Security Features**

- **JWT Authentication** with secure token management
- **Row Level Security (RLS)** policies in database
- **Input validation** and sanitization
- **Rate limiting** and request throttling
- **HTTPS encryption** for all communications
- **Environment variable** protection
- **SQL injection** prevention
- **XSS protection** headers

---

## 📊 **Technology Stack**

### **Backend:**
- **Node.js** with Express.js framework
- **Supabase** for database and authentication
- **JWT** for secure token management
- **Docker** for containerization
- **Nginx** for reverse proxy and SSL

### **Frontend:**
- **Vanilla JavaScript** with modern ES6+
- **Responsive CSS** with mobile-first design
- **Component-based architecture**
- **Secure API client** with automatic token refresh

---

## 🚀 **Deployment**

The application is production-ready and can be deployed using:

1. **Docker Compose** (recommended for development/staging)
2. **Container orchestration** (Kubernetes, Docker Swarm)
3. **Cloud platforms** (AWS, Google Cloud, Azure)

### **Environment Variables Required:**
```bash
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
JWT_SECRET=your_jwt_secret
NODE_ENV=production
PORT=3000
```

---

## 🤝 **Contributing**

This is a complete, production-ready application. The secure architecture provides a solid foundation for future enhancements and features.

---

## 📄 **License**

This project is for educational and professional development purposes.

---

**🎉 Complete secure implementation ready for production use!** 🚀
