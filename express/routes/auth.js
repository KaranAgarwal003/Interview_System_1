const express = require("express");
const {
  register,
  login,
  logout,
  getMe,
  updateDetails,
  updatePassword,
  forgotPassword,
  resetPassword,
} = require("../controllers/authController");

const { protect } = require("../middleware/auth");
const {
  validateSignup,
  validateLogin,
  validateChangePassword,
  validateForgotPassword,
  validateResetPassword,
} = require("../middleware/validation");

const router = express.Router();

// Public routes
router.post("/register", validateSignup, register);
router.post("/login", validateLogin, login);
router.post("/forgotpassword", validateForgotPassword, forgotPassword);
router.put("/resetpassword/:resettoken", validateResetPassword, resetPassword);

// Protected routes
router.get("/logout", protect, logout);
router.get("/me", protect, getMe);
router.put("/updatedetails", protect, updateDetails);
router.put("/updatepassword", protect, validateChangePassword, updatePassword);

module.exports = router;
