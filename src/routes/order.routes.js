import express from "express"
import { body } from "express-validator"
import {
  createOrder,
  getUserOrders,
  getOrderById,
  cancelOrder,
  updateOrderStatus,
  assignOrderToPrinter,
} from "../controllers/order.controller.js"
import { authenticate, authorize } from "../middlewares/auth.middleware.js"
import { validate } from "../middlewares/validation.middleware.js"

const router = express.Router()

// Validation pour la création d'une commande
const createOrderValidation = [
  body("items").isArray({ min: 1 }).withMessage("La commande doit contenir au moins un article"),
  body("items.*.artworkId").notEmpty().withMessage("L'ID de l'œuvre est requis"),
  body("items.*.quantity").isInt({ min: 1 }).withMessage("La quantité doit être un entier positif"),
  body("shippingDetails.address").notEmpty().withMessage("L'adresse est requise"),
  body("shippingDetails.city").notEmpty().withMessage("La ville est requise"),
  body("shippingDetails.country").notEmpty().withMessage("Le pays est requis"),
  body("shippingDetails.contactPhone").notEmpty().withMessage("Le numéro de téléphone est requis"),
]

// Routes
router.post("/", authenticate, createOrderValidation, validate, createOrder)
router.get("/", authenticate, getUserOrders)
router.get("/:id", authenticate, getOrderById)
router.post("/:id/cancel", authenticate, cancelOrder)
router.patch(
  "/:id/status",
  authenticate,
  authorize("ADMIN", "PRINTER"),
  body("status").notEmpty().withMessage("Le statut est requis"),
  validate,
  updateOrderStatus,
)
router.post(
  "/:id/assign",
  authenticate,
  authorize("ADMIN"),
  body("printerId").notEmpty().withMessage("L'ID de l'imprimeur est requis"),
  validate,
  assignOrderToPrinter,
)

export default router
