// routes/userRoutes.js
const express = require("express");
const router = express.Router();
const { getUserByFirebaseUid } = require("../controllers/userControllers");

router.get("/user/:id", getUserByFirebaseUid);

module.exports = router;
