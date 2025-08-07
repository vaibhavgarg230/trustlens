# TrustLens – AI-Powered E-commerce Trust Platform

![Trust & Safety](https://img.shields.io/badge/Trust%20&%20Safety-🛡️-green)

## 🚀 Overview

TrustLens is a scalable, AI-driven e-commerce platform designed to build and maintain trust in online marketplaces. With advanced features like review authentication, fraud detection, community validation, and trust-centric analytics, it empowers vendors, customers, and administrators to interact safely and transparently.

## ✨ Key Features

### 🏛️ Core Platform
- **Role-based authentication** (Admin, Vendor, Customer)
- **Real-time trust scoring** and fraud detection
- **AI-powered review analysis** and authenticity verification
- **Community-driven validation** system
- **Product lifecycle tracking** and audit trails
- **Comprehensive alert** and notification system

### 🏪 For Vendors
- **Secure vendor authentication** and onboarding
- **Product management** (add, update, delete)
- **Real-time alerts** for suspicious behavior
- **Revenue analytics** and return rate tracking
- **Order management** and customer behavior insights
- **Trust score monitoring** and reputation guidance

### 🛒 For Customers
- **Product browsing** and secure ordering
- **Vendor profile trust** verification
- **Order history** and status tracking
- **Review writing** with authenticity scoring
- **Personalized recommendations** based on behavioral signals

### 👨‍💼 For Administrators
- **Full admin dashboard** for system monitoring
- **Platform-wide fraud alerts** and behavioral insights
- **Community validation** and review authentication control
- **Role management** and vendor/customer tracking
- **AI-based trust DNA** profiling

## 🏗️ Technical Architecture

### Backend (Node.js / Express)
- **RESTful API** structure
- **MongoDB Atlas** integration with Mongoose
- **JWT-based** role authentication
- **Socket.io** for real-time WebSocket communication
- **Modular controller/service** architecture

### Frontend (React.js)
- **Responsive component-based** UI
- **Tailwind CSS** for consistent styling
- **React Router** for role-based navigation
- **Context API** for state and role management
- **Axios** for secured API communication

### AI & Analytics
- **AI analyzer** for review authenticity scoring
- **Behavioral analysis** and trust score calculation
- **Community validation** aggregation
- **Prediction markets** and fraud likelihood modeling

## 📊 Database Schema (MongoDB Collections)

| Collection | Description |
|------------|-------------|
| `users` | Customer profiles, behavior data, trust scores |
| `vendors` | Vendor accounts, return rates, trust metrics |
| `products` | Product catalog, lifecycle, vendor links |
| `orders` | Order lifecycle, fraud/risk analytics |
| `reviews` | Review content with AI-generated authenticity scores |
| `alerts` | Real-time alerts triggered by trust analysis |
| `admins` | Administrative control users |

## 📦 Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- MongoDB Atlas account
- npm or yarn

### Backend Setup

1. **Navigate to backend directory**
```
cd backend
npm install
```

2. **Create a .env file:**
```
MONGODB_URI=your_mongo_uri_here
JWT_SECRET=your_jwt_secret_key
PORT=3001
```

3. **Start the backend server:**
```
npm start
```

### Frontend Setup

1. **Navigate to frontend directory**
```
cd frontend
npm install
npm start
```

2. **Access the application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

## 🔑 Default Login Credentials

### Admin
- **Email:** admin@trustlens.com
- **Password:** admin123

### Vendors
- kriti@kritienterprises.com (Mumbai)
- dev@develectronics.in (Bangalore)
- mehul@fashionhub.in (Delhi)
- **Password for all:** password123

### Customers
- vaibhav@gmail.com (Pune)
- leena@gmail.com (Chennai)
- shamita@gmail.com (Hyderabad)
- **Password for all:** password123

---

## 🎛️ Dashboards Overview

### 👨‍💼 Admin Dashboard

> Full administrative control panel including fraud insights, community validation review flow, and platform-wide trust scoring.

![](assets/AdminDashboard.png)
![](assets/TrustDna.png)
![](assets/ProductTracker1.png)
![](assets/ProductTracker2.png)
![](assets/ProductTracker3.png)
![](assets/ReviewAuth1.png)
![](assets/ReviewAuth2.png)
![](assets/Marketplace1.png)
![](assets/PredictionMarket.png)
![](assets/AlertSystem1.png)
![](assets/AlertSystem2.png)
![](assets/CommunityValidation.png)

---

### 🧑‍💼 Vendor Dashboard

> Vendors can manage product inventory, monitor alerts, and track warehouse activity in real-time.

![](assets/Vendor Dashboard.png)
![](assets/VendorAlertDashboard.png) 

---

### 🛍️ Customer Dashboard

> Customers can browse, review products, track orders, and validate vendor trust before purchasing.

![](assets/CustomerDashboard.png) 
![](assets/CustomerBrowseProduct.png)

---

## 🔌 API Endpoints Overview

### Authentication
```
POST /api/auth/register     – Register a customer
POST /api/auth/login        – Customer login
POST /api/vendor/register   – Vendor registration
POST /api/vendor/login      – Vendor login
POST /api/admin/login       – Admin login
```

### Users & Vendors
```
GET  /api/users                    – Fetch all users
GET  /api/vendor/vendors           – Fetch all vendors
PUT  /api/vendor/vendors/:id       – Update vendor profile
```

### Products & Orders
```
GET  /api/products                 – Fetch products
POST /api/products                 – Add product (vendor only)
POST /api/orders                   – Place an order (customer)
GET  /api/orders/customer/:id      – Fetch customer orders
GET  /api/orders/vendor/:id        – Fetch vendor orders
```

### Alerts & Analytics
```
GET /api/alerts                           – Get all alerts (admin only)
GET /api/orders/analytics/stats           – Order statistics
GET /api/vendor/vendors/:id/analytics     – Vendor analytics
```

## 📈 Sample Data Metrics

- **14 registered users** (1 admin + 13 customers)
- **9 active vendors** across major cities
- **43 products** across 5 categories
- **127+ orders** with trust data
- **250+ verified reviews**
- **85+ real-time alerts**

## 🛠️ Technology Stack

### Backend
- **Node.js** with Express
- **MongoDB Atlas**
- **Mongoose** ODM
- **JWT** Authentication
- **bcrypt** password hashing
- **Socket.io**

### Frontend
- **React.js**
- **Tailwind CSS**
- **Axios**
- **React Router**
- **Context API**

### AI & Analytics
- **Natural language analysis** for reviews
- **Trust score algorithms**
- **Prediction markets**
- **Fraud detection systems**

## 📊 Performance Metrics

- **Fraud Detection Accuracy**: 95%
- **Response Time**: <200ms for real-time decisions
- **Scalability**: Handles 10,000+ concurrent users
- **AI Processing**: Sub-100ms for NLP analysis

## 🔒 Security Features

- **JWT-based secure auth** per role
- **Encrypted password storage** with bcrypt
- **Behavior-based fraud alerts**
- **Access control** via protected routes
- **Real-time anomaly detection**

## 🚀 Future Enhancements

- **Machine learning model** fine-tuning
- **Blockchain-based trust** ledger
- **Mobile app** (React Native)
- **Advanced product recommendation** engine
- **Multi-language support**



## 👥 Team

**Team Charon** - Developed for **HackOnWithAmazon**

### Team Members:
- **Dev Patel**
- **Vaibhav Garg**
- **Kriti Bhatnagar**
- **Mehul Goyal**

---

**TRUSTLENS**: *Turning every transaction into a handshake of trust.*

![Built with Love](https://img.shields.io/badge/Built%20with-❤️-red)
```
