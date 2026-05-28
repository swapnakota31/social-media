require("dotenv").config();

const express = require("express");

const cors = require("cors");

const pool = require("./db");

const authRoutes = require("./routes/authRoutes");

const app = express();

app.use(cors());

app.use(express.json());

app.use("/api/auth", authRoutes);

pool.connect()
  .then(() => {

    console.log("PostgreSQL Connected 🚀");

  })
  .catch((err) => {

    console.log(err);

  });

app.get("/", (req, res) => {

  res.send("Social Media Backend Running 🚀");

});

const PORT = 3000;

app.listen(PORT, () => {

  console.log(`Server running on port ${PORT}`);

});