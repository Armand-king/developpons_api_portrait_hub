import { prisma } from "../server.js"
import { sendOrderStatusUpdateEmail } from "./email.service.js"
import { sendWhatsAppMessage } from "./whatsapp.service.js"

// Envoyer une notification à un utilisateur
export const sendOrderNotification = async (userId, content, metadata = {}) => {
  try {
    // Récupérer l'utilisateur
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      throw new Error("Utilisateur non trouvé")
    }

    // Créer une notification système
    const notification = await prisma.notification.create({
      data: {
        type: "SYSTEM",
        content,
        status: "SENT",
        recipient: {
          connect: { id: userId },
        },
        metadata,
        sentAt: new Date(),
      },
    })

    // Si l'utilisateur a un email, envoyer un email
    if (user.email && metadata.orderId) {
      // Récupérer la commande
      const order = await prisma.order.findUnique({
        where: { id: metadata.orderId },
      })

      if (order) {
        await sendOrderStatusUpdateEmail(user.email, order, order.status)
      }
    }

    // Si l'utilisateur a un numéro de téléphone, envoyer un message WhatsApp
    if (user.phoneNumber) {
      await sendWhatsAppMessage(user.phoneNumber, content)
    }

    return notification
  } catch (error) {
    console.error("Erreur lors de l'envoi de la notification:", error)
    throw error
  }
}
