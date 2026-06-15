# 🚖 NextRide Backend

A scalable microservices-based ride booking platform inspired by modern transportation systems like Uber and Ola.

This backend is built using a distributed architecture with independent services, asynchronous communication using RabbitMQ, real-time location tracking, JWT authentication, Google OAuth, Docker containerization, and automated CI/CD deployment pipelines.

---

# 🏗️ Architecture Overview

```text
Frontend (Next.js)
        │
        ▼
 ┌─────────────────┐
 │   Auth Service  │
 └─────────────────┘
        │
        ▼
      RabbitMQ
        │
 ┌──────┼────────┬──────────────┐
 ▼      ▼        ▼              ▼
Ride  Booking  Notification  Realtime
Service Service   Service     Service
```

The system follows a Microservices Architecture where each service is independently deployable and scalable.

---

# 📦 Services

## 🔐 Auth Service

Responsibilities:

* User Registration
* User Login
* Google OAuth Authentication
* JWT Authentication
* Role Based Access Control
* User Management

Port:

```text
5000
```

---

## 🔔 Notification Service

Responsibilities:

* OTP Generation
* Email Notifications
* Verification Messages
* Event Driven Notifications

Port:

```text
5001
```

---

## 🚗 Ride Service

Responsibilities:

* Ride Creation
* Ride Lifecycle Management
* Ride Status Updates
* Partner Matching

Port:

```text
5002
```

---

## 🛠 Utils Service

Responsibilities:

* Shared Utilities
* Common Functions
* Reusable Services

Port:

```text
5003
```

---

## 📡 Realtime Service

Responsibilities:

* Socket.IO Communication
* Live Location Updates
* Real-Time Ride Tracking
* User ↔ Partner Messaging

Port:

```text
5004
```

---

## 📖 Booking Service

Responsibilities:

* Ride Booking
* Booking Management
* Booking History
* Booking Status Tracking

Port:

```text
5005
```

---

# ✨ Key Features

## Authentication

* JWT Authentication
* Google OAuth Login
* Protected Routes
* Role-Based Authorization

---

## Real-Time Features

* Live Partner Tracking
* Real-Time Location Updates
* User ↔ Partner Chat
* Socket.IO Integration

---

## Ride Matching

* MongoDB GeoSpatial Queries
* Nearby Partner Discovery
* 5 KM Radius Matching System

---

## Event-Driven Architecture

RabbitMQ is used for service-to-service communication.

Example:

```text
User Registration
        │
        ▼
  Auth Service
        │
        ▼
    RabbitMQ
        │
        ▼
Notification Service
        │
        ▼
     Send OTP
```

---

## Video KYC Workflow

* Video KYC Requests
* Admin Approval Process
* Rejection Reason Management

---

## AI Features

* Smart Chat Suggestions
* AI Assisted Messaging
* Future AI Ride Intelligence Support

---

# 🐳 Dockerized Services

Each service runs inside an isolated Docker container.

Docker Images:

```text
bhuvan32085/nextride-auth
bhuvan32085/nextride-booking
bhuvan32085/nextride-notification
bhuvan32085/nextride-realtime
bhuvan32085/nextride-ride
bhuvan32085/nextride-utils
```

---

# 🚀 CI/CD Pipeline

The project uses GitHub Actions for automated deployment.

Workflow:

```text
Code Change
      │
      ▼
Git Push
      │
      ▼
GitHub Actions
      │
      ▼
Docker Build
      │
      ▼
Docker Hub Push
      │
      ▼
Render Deploy Hook
      │
      ▼
Production Deployment
```

Every service can be deployed independently.

---

# ☁️ Deployment

## Frontend

* Vercel

## Backend Services

* Render

## Container Registry

* Docker Hub

---

# 🗄️ Database

MongoDB is used as the primary database.

Features:

* User Storage
* Ride Data
* Booking Records
* Partner Information
* GeoSpatial Queries

---

# 🧰 Tech Stack

## Backend

* Node.js
* Express.js
* TypeScript
* MongoDB
* Mongoose

## Authentication

* JWT
* Google OAuth

## Messaging

* RabbitMQ

## Real-Time

* Socket.IO

## DevOps

* Docker
* Docker Hub
* GitHub Actions
* Render

---

# 📂 Project Structure

```text
Nextride_backend
│
├── auth
├── booking
├── notification
├── realtime
├── ride
├── utils
│
└── .github
    └── workflows
        ├── auth.yml
        ├── booking.yml
        ├── notification.yml
        ├── realtime.yml
        ├── ride.yml
        └── utils.yml
```

---

# 🔮 Future Enhancements

* Redis Caching
* API Gateway
* Nginx Reverse Proxy
* Kubernetes Deployment
* AI Ride Recommendation System
* Driver ETA Prediction
* Monitoring with Prometheus & Grafana

---

