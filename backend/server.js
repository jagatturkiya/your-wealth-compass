const dns = require("dns");
try { dns.setServers(["8.8.8.8", "1.1.1.1"]); } catch(e) {}

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const authRoutes = require("./routes/auth");
const reportRoutes = require("./routes/reports");
const adminRoutes = require("./routes/admin");

const app = express();
const PORT = process.env.PORT || 5000;

// --- Middleware ---
app.use((req, res, next) => {
  const origin = req.headers.origin || "*";
  res.header("Access-Control-Allow-Origin", origin);
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma, Expires");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});
app.use(cors({
  origin: true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Cache-Control", "Pragma", "Expires", "X-Requested-With"]
}));
app.options("*", cors());
app.use(express.json({ limit: "5mb" }));

// --- Routes ---
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/reports", reportRoutes);
app.use("/api/v1/admin", adminRoutes);

// --- Health check ---
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Wealth Compass API is running" });
});

app.get("/api/v1/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

// --- Start server & Connect to MongoDB ---
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

const startServer = () => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Wealth Compass API Server running on port ${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/`);
    console.log(`   API:    http://localhost:${PORT}/api/v1/`);
  });
};

startServer();

if (MONGO_URI) {
  mongoose
    .connect(MONGO_URI, { serverSelectionTimeoutMS: 8000 })
    .then(() => {
      console.log("✅ Connected to MongoDB Atlas");
    })
    .catch((err) => {
      console.error("⚠️ MongoDB connection notice:", err.message);
      console.log("Running API server with local fallback resilience.");
    });
} else {
  console.log("ℹ️ MONGO_URI not set in environment. Running API server in fallback mode.");
}

