import { prisma } from "../server.js"
import { ApiError } from "../utils/api-error.js"
import { sendResponse } from "../utils/api-response.js"
import { processAirtelPayment, processMoovPayment } from "../services/payment.service.js"
import { sendOrderNotification } from "../services/notification.service.js"

// Initialiser un paiement
export const initiatePayment = async (req, res, next) => {
  try {
    const { orderId, method, phoneNumber } = req.body

    // Vérifier si la méthode de paiement est valide
    if (!["AIRTEL_MONEY", "MOOV_MONEY"].includes(method)) {
      throw new ApiError(400, "Méthode de paiement invalide")
    }

    // Vérifier si la commande existe
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    })

    if (!order) {
      throw new ApiError(404, "Commande non trouvée")
    }

    // Vérifier si l'utilisateur est le propriétaire de la commande
    if (order.clientId !== req.user.id) {
      throw new ApiError(403, "Vous n'êtes pas autorisé à payer cette commande")
    }

    // Vérifier si la commande est en attente de paiement
    if (order.status !== "PENDING_PAYMENT") {
      throw new ApiError(400, "Cette commande n'est pas en attente de paiement")
    }

    // Vérifier si un paiement existe déjà pour cette commande
    const existingPayment = await prisma.payment.findUnique({
      where: { orderId },
    })

    if (existingPayment && existingPayment.status === "COMPLETED") {
      throw new ApiError(400, "Cette commande a déjà été payée")
    }

    // Initialiser le paiement selon la méthode
    let paymentResult

    if (method === "AIRTEL_MONEY") {
      paymentResult = await processAirtelPayment(order.totalAmount, phoneNumber, order.orderNumber)
    } else {
      paymentResult = await processMoovPayment(order.totalAmount, phoneNumber, order.orderNumber)
    }

    // Créer ou mettre à jour l'enregistrement de paiement
    const payment = await prisma.payment.upsert({
      where: { orderId },
      update: {
        method,
        status: "PENDING",
        transactionId: paymentResult.transactionId,
        paymentDetails: paymentResult,
      },
      create: {
        orderId,
        amount: order.totalAmount,
        method,
        status: "PENDING",
        transactionId: paymentResult.transactionId,
        paymentDetails: paymentResult,
      },
    })

    return sendResponse(res, {
      data: {
        payment,
        redirectUrl: paymentResult.redirectUrl,
      },
      message: "Paiement initié avec succès",
    })
  } catch (error) {
    next(error)
  }
}

// Confirmer un paiement (webhook)
export const confirmPayment = async (req, res, next) => {
  try {
    const { transactionId, status, details } = req.body

    // Vérifier si le paiement existe
    const payment = await prisma.payment.findUnique({
      where: { transactionId },
    })

    if (!payment) {
      throw new ApiError(404, "Paiement non trouvé")
    }

    // Mettre à jour le statut du paiement
    const updatedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: status === "success" ? "COMPLETED" : "FAILED",
        paymentDetails: {
          ...payment.paymentDetails,
          confirmationDetails: details,
        },
      },
      include: {
        order: true,
      },
    })

    // Si le paiement est réussi, mettre à jour le statut de la commande
    if (status === "success") {
      await prisma.order.update({
        where: { id: payment.orderId },
        data: {
          status: "PAYMENT_RECEIVED",
          statusHistory: {
            create: {
              status: "PAYMENT_RECEIVED",
              comment: "Paiement reçu et confirmé",
              createdBy: updatedPayment.order.clientId,
            },
          },
        },
      })

      // Envoyer une notification au client
      await sendOrderNotification(updatedPayment.order.clientId, "Votre paiement a été confirmé", {
        orderId: payment.orderId,
        orderNumber: updatedPayment.order.orderNumber,
        paymentId: payment.id,
      })
    }

    return sendResponse(res, {
      data: updatedPayment,
      message: status === "success" ? "Paiement confirmé avec succès" : "Échec du paiement",
    })
  } catch (error) {
    next(error)
  }
}

// Vérifier le statut d'un paiement
export const checkPaymentStatus = async (req, res, next) => {
  try {
    const { orderId } = req.params

    // Vérifier si la commande existe
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    })

    if (!order) {
      throw new ApiError(404, "Commande non trouvée")
    }

    // Vérifier si l'utilisateur est autorisé
    if (order.clientId !== req.user.id && req.user.role !== "ADMIN") {
      throw new ApiError(403, "Vous n'êtes pas autorisé à vérifier ce paiement")
    }

    // Récupérer le paiement
    const payment = await prisma.payment.findUnique({
      where: { orderId },
    })

    if (!payment) {
      throw new ApiError(404, "Aucun paiement trouvé pour cette commande")
    }

    return sendResponse(res, {
      data: payment,
    })
  } catch (error) {
    next(error)
  }
}
