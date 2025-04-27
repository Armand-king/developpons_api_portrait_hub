import express from "express"
import { body } from "express-validator"
import { initiatePayment, confirmPayment, checkPaymentStatus } from "../controllers/payment.controller.js"
import { authenticate } from "../middlewares/auth.middleware.js"
import { validate } from "../middlewares/validation.middleware.js"

const router = express.Router()

// Validation pour l'initialisation d'un paiement
const initiatePaymentValidation = [
  body("orderId").notEmpty().withMessage("L'ID de la commande est requis"),
  body("method").isIn(["AIRTEL_MONEY", "MOOV_MONEY"]).withMessage("Méthode de paiement invalide"),
  body("phoneNumber").notEmpty().withMessage("Le numéro de téléphone est requis"),
]

// Routes
router.post("/initiate", authenticate, initiatePaymentValidation, validate, initiatePayment)
router.post("/confirm", confirmPayment) // Webhook, pas d'authentification
router.get("/status/:orderId", authenticate, checkPaymentStatus)

export default router
