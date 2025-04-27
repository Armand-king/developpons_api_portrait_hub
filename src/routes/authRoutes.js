import express from "express"
import { body } from "express-validator"
import {
  register,
  login,
  verifyEmail,
  forgotPassword,
  resetPassword,
  getCurrentUser,
} from "../controllers/auth.controller.js"
import { authenticate } from "../middlewares/auth.middleware.js"
import { validate } from "../middlewares/validation.middleware.js"

const router = express.Router()

// Validation pour l'inscription
const registerValidation = [
  body("email").isEmail().withMessage("Email invalide"),
  body("password").isLength({ min: 6 }).withMessage("Le mot de passe doit contenir au moins 6 caractères"),
  body("firstName").notEmpty().withMessage("Le prénom est requis"),
  body("lastName").notEmpty().withMessage("Le nom est requis"),
  body("role").optional().isIn(["CLIENT", "ARTIST", "PRINTER"]).withMessage("Rôle invalide"),
]

// Validation pour la connexion
const loginValidation = [
  body("email").isEmail().withMessage("Email invalide"),
  body("password").notEmpty().withMessage("Le mot de passe est requis"),
]

// Validation pour la réinitialisation du mot de passe
const resetPasswordValidation = [
  body("password").isLength({ min: 6 }).withMessage("Le mot de passe doit contenir au moins 6 caractères"),
]

// Routes
router.post("/register", registerValidation, validate, register)
router.post("/login", loginValidation, validate, login)
router.get("/verify-email/:token", verifyEmail)
router.post("/forgot-password", body("email").isEmail().withMessage("Email invalide"), validate, forgotPassword)
router.post("/reset-password/:token", resetPasswordValidation, validate, resetPassword)
router.get("/me", authenticate, getCurrentUser)

export default router
