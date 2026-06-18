require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/auth");
const transactionRoutes = require("./routes/transactions");
const budgetRoutes = require("./routes/budgets");
const aiRoutes = require("./routes/ai");
const receiptRoutes = require("./routes/receipt");
const adminRoutes = require("./routes/admin");
const analyticsRoutes = require("./routes/analytics");
const profileRoutes = require("./routes/profile");
const { seedAdmin } = require("./utils/seed");

const app = express();
const PORT = process.env.PORT || 8001;

app.options("*", cors());
// Middleware
// app.use(cors({
//   origin: (process.env.CORS_ORIGINS || '*').split(','),
//   credentials: true,
// }));
app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);

app.options("*", cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Rate limiter (auth-sensitive routes)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
});

// Static for uploaded receipts
app.use("/api/uploads", express.static(path.join(__dirname, "uploads")));

// Health
app.get("/api", (req, res) =>
  res.json({ message: "AI Finance Tracker API", status: "ok" }),
);
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// Routes
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/budgets", budgetRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/receipt", receiptRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/profile", profileRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error("[error]", err);
  res
    .status(err.status || 500)
    .json({ error: err.message || "Internal server error" });
});

// Start
async function start() {
  try {
    await mongoose.connect(process.env.MONGO_URL, {
      dbName: process.env.DB_NAME,
    });
    console.log("[mongo] connected:", process.env.DB_NAME);
    await seedAdmin();
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`[server] listening on 0.0.0.0:${PORT}`);
    });
  } catch (e) {
    console.error("[startup] failed:", e);
    process.exit(1);
  }
}
start();
