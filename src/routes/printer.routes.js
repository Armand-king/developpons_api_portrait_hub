import express from "express"
import {
  getPrinterProfile,
  updatePrinterProfile,
  getPrinterOrders,
  updateOrderStatus,
  getPrinterStats,
} from "../controllers/printer.controller.js"
import { authenticate, authorize } from "../middlewares/auth.middleware.js"
import { validate } from "../middlewares/validation.middleware.js"
import { body } from "express-validator"

const router = express.Router()

// Routes pour le profil d'imprimeur
router.get("/profile", authenticate, authorize("PRINTER"), getPrinterProfile)
router.put("/profile", authenticate, authorize("PRINTER"), updatePrinterProfile)

// Routes pour les commandes d'un imprimeur
router.get("/orders", authenticate, authorize("PRINTER"), getPrinterOrders)
router.patch(
  "/orders/:id/status",
  authenticate,
  authorize("PRINTER"),
  body("status").isIn(["PRINTING", "READY_FOR_SHIPPING"]).withMessage("Statut invalide"),
  validate,
  updateOrderStatus,
)

// Statistiques de l'imprimeur
router.get("/stats", authenticate, authorize("PRINTER"), getPrinterStats)

export default router
