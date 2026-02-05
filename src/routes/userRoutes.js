// routes/userRoutes.js
const express = require("express");
const router = express.Router();
const { getUserByFirebaseUid, deactivateUser, activateUser } = require("../controllers/userControllers");

router.get("/user/:id", getUserByFirebaseUid);
// router.patch("/user/status/:id", deactivateUser);
// router.patch("/user/activate/:id", activateUser);

router.patch("/user/deactivate/:id", deactivateUser);
router.patch("/user/activate/:id", activateUser);

//TO test these apis in postman
//http://localhost:3000/api/user/deactivate/6983419ebe2dbac49d57c488
//http://localhost:3000/api/user/activate/6983419ebe2dbac49d57c488
module.exports = router;
