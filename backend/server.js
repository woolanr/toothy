// backend/server.js
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const pasienRoutes = require("./routes/pasienRoutes");

const app = express();
const port = 3000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../frontend/views"));

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "../frontend/public")));

app.use((req, res, next) => {
  console.log(
    `[${new Date().toISOString()}] Incoming Request: ${req.method} ${
      req.originalUrl
    }`
  );
  next();
});

app.get("/", (req, res) => {
  console.log("Serving index page.");
  res.render("index");
});

app.get("/login", (req, res) => {
  console.log("Serving login page.");
  res.render("login");
});

app.get("/register", (req, res) => {
  console.log("Serving register page.");
  res.render("register");
});

app.get("/forgot-password", (req, res) => {
  console.log("Serving forgot-password page.");
  res.render("forgot-password");
});

app.get("/reset-password", (req, res) => {
  console.log("Serving reset-password page.");
  res.render("reset-password");
});

app.get("/verification", (req, res) => {
  console.log("Serving verification page.");
  res.render("verification", { message: req.query.message || null });
});

app.get("/admin/register", (req, res) => {
  console.log("Serving admin register page.");
  res.render("admin/register");
});

app.get("/admin/dashboard", (req, res) => {
  console.log("Serving admin dashboard page.");
  res.render("admin/dashboard");
});

app.get("/pasien/dashboard", (req, res) => {
  console.log("Serving pasien dashboard page.");
  res.render("pasien/dashboard");
});

app.use("/", authRoutes);
app.use("/admin", adminRoutes);
app.use("/pasien", pasienRoutes);

app.use((req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  console.warn(
    `[${new Date().toISOString()}] 404 Error: ${req.method} ${req.originalUrl}`
  );
  res
    .status(404)
    .json({ message: "API endpoint not found. Please check the URL." });
});

app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] SERVER ERROR (Unhandled):`);
  console.error(err.stack);
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    message: err.message || "Internal Server Error",
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
});

app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});
