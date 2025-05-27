const express = require('express');
const router = express.Router();
const authCotnroller = require('../controllers/authController');

router.post('/login', authCotnroller.login);
router.post('/logout', authCotnroller.logout);
router.get('/checksession', authCotnroller.checkSession);
router.post('/adduser', authCotnroller.addUser);
router.get('/getusers', authCotnroller.getUsers);

module.exports = router;
    