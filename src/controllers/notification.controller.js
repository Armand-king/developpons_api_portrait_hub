import { prisma } from "../server.js"
import { ApiError } from "../utils/api-error.js"
import { sendResponse } from "../utils/api-response.js"
import { sendWhatsAppMessage } from "../services/whatsapp.service.js"

// Obtenir les notifications de l'utilisateur
export const getUserNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id
    const { page = 1, limit = 10, status } = req.query

    const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit)

    // Construire les filtres
    const where = {
      recipientId: userId,
    }

    if (status) {
      where.status = status
    }

    // Compter le nombre total de notifications
    const total = await prisma.notification.count({ where })

    // Récupérer les notifications
    const notifications = await prisma.notification.findMany({
      where,
      skip,
      take: Number.parseInt(limit),
      orderBy: {
        createdAt: "desc",
      },
    })

    return sendResponse(res, {
      data: {
        notifications,
        pagination: {
          total,
          page: Number.parseInt(page),
          limit: Number.parseInt(limit),
          pages: Math.ceil(total / Number.parseInt(limit)),
        },
      },
    })
  } catch (error) {
    next(error)
  }
}

// Marquer une notification comme lue
export const markNotificationAsRead = async (req, res, next) => {
  try {
    const { id } = req.params

    // Vérifier si la notification existe et appartient à l'utilisateur
    const notification = await prisma.notification.findFirst({
      where: {
        id,
        recipientId: req.user.id,
      },
    })

    if (!notification) {
      throw new ApiError(404, "Notification non trouvée")
    }

    // Mettre à jour la notification
    const updatedNotification = await prisma.notification.update({
      where: { id },
      data: {
        status: "SENT",
      },
    })

    return sendResponse(res, {
      data: updatedNotification,
      message: "Notification marquée comme lue",
    })
  } catch (error) {
    next(error)
  }
}

// Envoyer une notification WhatsApp
export const sendWhatsAppNotification = async (req, res, next) => {
  try {
    const { userId, message } = req.body

    // Vérifier si l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      throw new ApiError(404, "Utilisateur non trouvé")
    }

    // Vérifier si l'utilisateur a un numéro de téléphone
    if (!user.phoneNumber) {
      throw new ApiError(400, "L'utilisateur n'a pas de numéro de téléphone")
    }

    // Envoyer le message WhatsApp
    const result = await sendWhatsAppMessage(user.phoneNumber, message)

    // Créer une notification dans la base de données
    const notification = await prisma.notification.create({
      data: {
        type: "WHATSAPP",
        content: message,
        status: result.success ? "SENT" : "FAILED",
        recipient: {
          connect: { id: userId },
        },
        metadata: result,
        sentAt: result.success ? new Date() : null,
      },
    })

    return sendResponse(res, {
      data: notification,
      message: result.success
        ? "Notification WhatsApp envoyée avec succès"
        : "Échec de l'envoi de la notification WhatsApp",
    })
  } catch (error) {
    next(error)
  }
}
