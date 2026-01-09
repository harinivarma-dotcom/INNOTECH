const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
app.use(express.json());

/* ---------- CONFIG ---------- */
const PORT = process.env.PORT || 5000;
const MONGO_URI =
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017/farmer_schemes";
const JWT_SECRET = process.env.JWT_SECRET || "secret123";
const JWT_EXPIRES_IN = "7d";

/* ---------- ROOT ROUTE ---------- */
app.get("/", (req, res) => {
  res.send("Farmer Schemes API is running");
});

/* ---------- MODELS ---------- */
const FarmerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true, select: false },
    location: {
      state: String,
      district: String
    },
    crops: [String],
    annualIncome: Number,
    landSize: Number,
    category: String
  },
  { timestamps: true }
);

const Farmer = mongoose.model("Farmer", FarmerSchema);

const SchemeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: String,
    eligibility: {
      states: [String],
      crops: [String],
      minIncome: Number,
      maxIncome: Number,
      minLandSize: Number,
      category: String
    }
  },
  { timestamps: true }
);

const Scheme = mongoose.model("Scheme", SchemeSchema);

const ApplicationSchema = new mongoose.Schema(
  {
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Farmer",
      required: true
    },
    scheme: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Scheme",
      required: true
    },
    status: { type: String, default: "submitted" }
  },
  { timestamps: true }
);

const Application = mongoose.model("Application", ApplicationSchema);

/* ---------- UTILS ---------- */
const eligibilityMatcher = (farmer, scheme) => {
  if (!farmer || !scheme) return false;
  const e = scheme.eligibility || {};

  if (e.states?.length && !e.states.includes(farmer.location?.state))
    return false;

  if (
    e.crops?.length &&
    (!farmer.crops?.length ||
      !farmer.crops.some(c => e.crops.includes(c)))
  )
    return false;

  if (e.minIncome != null && farmer.annualIncome < e.minIncome) return false;
  if (e.maxIncome != null && farmer.annualIncome > e.maxIncome) return false;
  if (e.minLandSize != null && farmer.landSize < e.minLandSize) return false;
  if (e.category && e.category !== farmer.category) return false;

  return true;
};

/* ---------- AUTH MIDDLEWARE ---------- */
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer "))
    return res.status(401).json({ message: "Authorization token missing" });

  try {
    const token = authHeader.split(" ")[1];
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

/* ---------- ROUTES ---------- */

/* Register */
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password, ...rest } = req.body;

    if (!name || !email || !password)
      return res
        .status(400)
        .json({ message: "Name, email and password required" });

    const exists = await Farmer.findOne({ email });
    if (exists)
      return res.status(409).json({ message: "Email already registered" });

    const hashed = await bcrypt.hash(password, 10);
    const farmer = await Farmer.create({
      name,
      email,
      password: hashed,
      ...rest
    });

    const result = farmer.toObject();
    delete result.password;

    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

/* Login */
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res
        .status(400)
        .json({ message: "Email and password required" });

    const farmer = await Farmer.findOne({ email }).select("+password");
    if (!farmer || !(await bcrypt.compare(password, farmer.password)))
      return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: farmer._id }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN
    });

    res.json({ token });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

/* All Schemes */
app.get("/api/schemes", async (req, res) => {
  const schemes = await Scheme.find().lean();
  res.json(schemes);
});

/* Eligible Schemes */
app.get("/api/schemes/eligible", authMiddleware, async (req, res) => {
  const farmer = await Farmer.findById(req.user.id).lean();
  if (!farmer)
    return res.status(404).json({ message: "Farmer not found" });

  const schemes = await Scheme.find().lean();
  res.json(schemes.filter(s => eligibilityMatcher(farmer, s)));
});

/* Apply for Scheme */
app.post("/api/applications", authMiddleware, async (req, res) => {
  const { schemeId } = req.body;
  if (!schemeId)
    return res.status(400).json({ message: "schemeId required" });

  const farmer = await Farmer.findById(req.user.id);
  const scheme = await Scheme.findById(schemeId);

  if (!farmer || !scheme)
    return res
      .status(404)
      .json({ message: "Farmer or Scheme not found" });

  if (!eligibilityMatcher(farmer, scheme))
    return res
      .status(400)
      .json({ message: "Not eligible for this scheme" });

  const exists = await Application.findOne({
    farmer: farmer._id,
    scheme: scheme._id
  });

  if (exists)
    return res.status(409).json({ message: "Already applied" });

  const application = await Application.create({
    farmer: farmer._id,
    scheme: scheme._id
  });

  res.status(201).json(application);
});

/* ---------- START SERVER ---------- */
(async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("MongoDB connected");
    app.listen(PORT, () =>
      console.log(`Server running on port ${PORT}`)
    );
  } catch (err) {
    console.error("DB connection error:", err);
    process.exit(1);
  }
})();
