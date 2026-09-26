const express = require("express");
const cors = require("cors");
require("dotenv").config();
const pool = require("./config/db");
const operationsRoutes = require("./routes/operationsRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/operations", operationsRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.get("/", (req, res) => {
    res.json({
        status: "ok",
        message: "StockSense API is running"
    });
});

const PORT = process.env.PORT || 5000;

pool.query("SELECT NOW()", (err, result) => {
    if (err) {
        console.error("Database connection failed:", err.message);
    } else {
        console.log("Database connected successfully!");
        console.log("Database time:", result.rows[0].now);
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});