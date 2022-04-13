const express = require("express");
const bcrypt = require("bcrypt");
const router = express.Router();
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const userModel = require("../Model/userModel");
const storeModel = require("../Model/storeModel");

// Setting up storage for images
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

// The Upload function
const upload = multer({ storage: storage }).single("image");

// Creating the verif function
const verified = (req, res, next) => {
  try {
    const authToken = req.headers.authorization;

    if (authToken) {
      const token = authToken.split(" ")[2];
      if (token) {
        jwt.verify(token, "MySecret", (error, payload) => {
          if (error) {
            res.status(401).json({ message: "Check your credentials again" });
          } else {
            req.user = payload;
            next();
          }
        });
      } else {
        res.status(401).json({ message: "Check your credentials again" });
      }
    } else {
      res
        .status(404)
        .json({ message: "You don't have the right to perform this action" });
    }
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
};

// To get all registered users
router.get("/users", async (req, res) => {
  try {
    const getUsers = await userModel.find();
    res.status(200).json({
      message: "All Users Found Successfully",
      totalUser: getUsers.length,
      data: getUsers,
    });
  } catch (error) {
    res.status(400).json({ message: "No user found", error: error.message });
  }
});

// To get all store items
router.get("/stores", async (req, res) => {
  try {
    const getStores = await storeModel.find();
    res.status(200).json({
      message: "All Items Found Successfully",
      totalItems: getStores.length,
      data: getStores,
    });
  } catch (error) {
    res.status(400).json({ message: "No item found", error: error.message });
  }
});

// To get a single registered users
router.get("/users/:id", async (req, res) => {
  try {
    const getSingleUser = await userModel.findById(req.params.id);
    res.status(200).json({
      message: "User Found Successfully",
      data: getSingleUser,
    });
  } catch (error) {
    res
      .status(400)
      .json({ message: "No user with this id", error: error.message });
  }
});

// To get a single store items
router.get("/stores/:id", async (req, res) => {
  try {
    const getSingleStores = await storeModel.findById(req.params.id);
    res.status(200).json({
      message: "Item Found Successfully",
      data: getSingleStores,
    });
  } catch (error) {
    res
      .status(400)
      .json({ message: "No item with this id", error: error.message });
  }
});

// To create a store item
router.post("/stores", upload, verified, async (req, res) => {
  try {
    if (req.user.isAdmin) {
      const { productName, productDescription, productPrice } = req.body;
      const createStore = await storeModel.create({
        productName,
        productDescription,
        productPrice,
        image: req.file.path,
      });
      res.status(200).json({
        message: "Store Item Successfully Created",
        data: createStore,
      });
    }
  } catch (error) {
    res
      .status(400)
      .json({ message: "Can't create store item", error: error.message });
  }
});

// To create a user
router.post("/register", upload, async (req, res) => {
  try {
    const { name, email, password, phoneNumber } = req.body;
    const hashpassword = await bcrypt.genSalt(10);
    const realpassword = await bcrypt.hash(password, hashpassword);
    const createUser = await userModel.create({
      name,
      email,
      password: realpassword,
      phoneNumber,
      image: req.file.path,
    });
    res
      .status(200)
      .json({ message: "Registration Successful", data: createUser });
  } catch (error) {
    res
      .status(400)
      .json({ message: "Can't create this user", error: error.message });
  }
});

// To create user login
router.post("/login", async (req, res) => {
  try {
    const signed = await userModel.findOne({ email: req.body.email });
    if (signed) {
      const checkPassword = await bcrypt.compare(
        req.body.password,
        signed.password
      );
      if (checkPassword) {
        const { password, ...data } = signed._doc;
        const token = jwt.sign(
          {
            id: signed._id,
            email: signed.email,
            isAdmin: signed.isAdmin,
          },
          "MySecret",
          { expiresIn: "2d" }
        );
        res.status(201).json({
          message: `welcome back ${signed.name}`,
          data: { ...data, token },
        });
      } else {
        res.status(404).json({ message: "Password is incorrect" });
      }
    } else {
      res.status(404).json({ message: "User not found in the database" });
    }
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
});

// To update a user
router.patch("/users/:id", verified, async (req, res) => {
  try {
    if (req.user.id === req.params.id || req.user.isAdmin) {
      const updateUser = await userModel.findByIdAndUpdate(
        req.params.id,
        { name: req.body.name },
        { new: true }
      );
      res
        .status(200)
        .json({ message: "Successfully Updated this user", data: updateUser });
    }
  } catch (error) {
    res.status(400).json({ message: "Can't Update this user" });
  }
});

// To update a store
router.patch("/stores/:id", verified, async (req, res) => {
  try {
    if (req.user.isAdmin) {
      const { productName, productDescription, productPrice } = req.body;
      const updateStore = await storeModel.findByIdAndUpdate(
        req.params.id,
        { productName, productDescription, productPrice },
        { new: true }
      );
      res.status(200).json({
        message: "Successfully Updated this store",
        data: updateStore,
      });
    }
  } catch (error) {
    res.status(400).json({ message: "Can't Update this store" });
  }
});

// To delete a user
router.delete("/users/:id", verified, async (req, res) => {
  try {
    if (req.user.isAdmin) {
      const deleteUser = await userModel.findByIdAndRemove(req.params.id);
      res.status(200).json({
        message: "Successfully Deleted this user",
        data: deleteUser,
      });
    }
  } catch (error) {
    res.status(400).json({ message: "UnAuthorized to delete" });
  }
});

// To delete a store
router.delete("/stores/:id", verified, async (req, res) => {
  try {
    if (req.user.isAdmin) {
      const deleteStore = await storeModel.findByIdAndRemove(req.params.id);
      res.status(200).json({
        message: "Successfully Deleted this store",
        data: deleteStore,
      });
    }
  } catch (error) {
    res.status(400).json({ message: "UnAuthorized to delete" });
  }
});

module.exports = router;
