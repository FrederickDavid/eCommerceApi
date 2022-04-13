const express = require("express");
const app = express();
const port = 2033;
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const url = "mongodb://localhost/eCommercePlatForm";

mongoose.connect(url).then(() => {
  console.log("Database is now Connected Successfully");
});

app.use(express.json());
app.use(cors({ origin: "*" }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/", require("./Router/userRouter"));

app.get("/", (req, res) => {
  res.status(200).json({ message: "An eCommerce PlatForm Api" });
});

app.listen(port, (req, res) => {
  console.log(`App is now Listening to Port: ${port}`);
});
