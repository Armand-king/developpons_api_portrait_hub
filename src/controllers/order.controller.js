import { prisma } from "../server.js"
import { ApiError } from "../utils/api-error.js"
import { sendResponse } from "../utils/api-response.js"
import { generateOrderNumber } from "../utils/helpers.js"
import { sendOrderNotification } from "../services/notification.service.js"

// Créer une nouvelle commande
export const createOrder = async (req, res, next) => {
  try {
    const { items, shippingDetails } = req.body

    if (!items || !items.length) {
      throw new ApiError(400, "La commande doit contenir au moins un article")
    }

    // Générer un numéro de commande unique
    const orderNumber = generateOrderNumber()

    // Calculer le montant total
    let totalAmount = 0
    const orderItems = []

    for (const item of items) {
      // Vérifier si l'œuvre existe
      const artwork = await prisma.artwork.findUnique({
        where: { id: item.artworkId },
      })

      if (!artwork) {
        throw new ApiError(404, `Œuvre d'art non trouvée: ${item.artworkId}`)
      }

      // Calculer le prix de l'article
      const itemPrice = artwork.price * item.quantity
      totalAmount += itemPrice

      // Ajouter l'article à la liste
      orderItems.push({
        artworkId: item.artworkId,
        quantity: item.quantity,
        unitPrice: artwork.price,
        customizations: item.customizations || {},
      })
    }

    // Créer la commande
    const order = await prisma.order.create({
      data: {
        orderNumber,
        totalAmount,
        status: "PENDING_PAYMENT",
        client: {
          connect: { id: req.user.id },
        },
        items: {
          create: orderItems,
        },
        shippingDetails: {
          create: shippingDetails,
        },
        statusHistory: {
          create: {
            status: "PENDING_PAYMENT",
            comment: "Commande créée, en attente de paiement",
            createdBy: req.user.id,
          },
        },
      },
      include: {
        items: {
          include: {
            artwork: true,
          },
        },
        shippingDetails: true,
      },
    })

    // Envoyer une notification au client
    await sendOrderNotification(req.user.id, "Votre commande a été créée avec succès", {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
    })

    return sendResponse(res, {
      statusCode: 201,
      data: order,
      message: "Commande créée avec succès",
    })
  } catch (error) {
    next(error)
  }
}

// Obtenir toutes les commandes de l'utilisateur
export const getUserOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status } = req.query

    const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit)

    // Construire les filtres
    const where = {
      clientId: req.user.id,
    }

    if (status) {
      where.status = status
    }

    // Compter le nombre total de commandes
    const total = await prisma.order.count({ where })

    // Récupérer les commandes
    const orders = await prisma.order.findMany({
      where,
      include: {
        items: {
          include: {
            artwork: {
              select: {
                id: true,
                title: true,
                imageUrl: true,
              },
            },
          },
        },
        shippingDetails: true,
        payment: true,
      },
      skip,
      take: Number.parseInt(limit),
      orderBy: {
        createdAt: "desc",
      },
    })

    return sendResponse(res, {
      data: {
        orders,
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

// Obtenir une commande par ID
export const getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            artwork: true,
          },
        },
        shippingDetails: true,
        payment: true,
        statusHistory: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    })

    if (!order) {
      throw new ApiError(404, "Commande non trouvée")
    }

    // Vérifier si l'utilisateur est autorisé à voir cette commande
    if (
      order.clientId !== req.user.id &&
      req.user.role !== "ADMIN" &&
      (req.user.role !== "PRINTER" || order.printerId !== req.user.id)
    ) {
      throw new ApiError(403, "Vous n'êtes pas autorisé à voir cette commande")
    }

    return sendResponse(res, {
      data: order,
    })
  } catch (error) {
    next(error)
  }
}

// Annuler une commande
export const cancelOrder = async (req, res, next) => {
  try {
    const { id } = req.params

    const order = await prisma.order.findUnique({
      where: { id },
    })

    if (!order) {
      throw new ApiError(404, "Commande non trouvée")
    }

    // Vérifier si l'utilisateur est autorisé à annuler cette commande
    if (order.clientId !== req.user.id && req.user.role !== "ADMIN") {
      throw new ApiError(403, "Vous n'êtes pas autorisé à annuler cette commande")
    }

    // Vérifier si la commande peut être annulée
    if (["SHIPPED", "DELIVERED", "CANCELLED"].includes(order.status)) {
      throw new ApiError(400, "Cette commande ne peut pas être annulée")
    }

    // Annuler la commande
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status: "CANCELLED",
        statusHistory: {
          create: {
            status: "CANCELLED",
            comment: "Commande annulée par le client",
            createdBy: req.user.id,
          },
        },
      },
    })

    // Envoyer une notification au client
    await sendOrderNotification(req.user.id, "Votre commande a été annulée", {
      orderId: updatedOrder.id,
      orderNumber: updatedOrder.orderNumber,
      status: updatedOrder.status,
    })

    return sendResponse(res, {
      data: updatedOrder,
      message: "Commande annulée avec succès",
    })
  } catch (error) {
    next(error)
  }
}

// Mettre à jour le statut d'une commande (admin ou imprimeur)
export const updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params
    const { status, comment } = req.body

    // Vérifier si le statut est valide
    const validStatuses = ["PROCESSING", "CUSTOMIZING", "PRINTING", "READY_FOR_SHIPPING", "SHIPPED", "DELIVERED"]

    if (!validStatuses.includes(status)) {
      throw new ApiError(400, "Statut invalide")
    }

    const order = await prisma.order.findUnique({
      where: { id },
    })

    if (!order) {
      throw new ApiError(404, "Commande non trouvée")
    }

    // Vérifier si l'utilisateur est autorisé à mettre à jour cette commande
    if (req.user.role !== "ADMIN" && (req.user.role !== "PRINTER" || order.printerId !== req.user.id)) {
      throw new ApiError(403, "Vous n'êtes pas autorisé à mettre à jour cette commande")
    }

    // Mettre à jour le statut
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status,
        statusHistory: {
          create: {
            status,
            comment: comment || `Statut mis à jour vers ${status}`,
            createdBy: req.user.id,
          },
        },
      },
    })

    // Envoyer une notification au client
    await sendOrderNotification(order.clientId, `Le statut de votre commande a été mis à jour: ${status}`, {
      orderId: updatedOrder.id,
      orderNumber: updatedOrder.orderNumber,
      status: updatedOrder.status,
    })

    return sendResponse(res, {
      data: updatedOrder,
      message: "Statut de la commande mis à jour avec succès",
    })
  } catch (error) {
    next(error)
  }
}

// Assigner une commande à un imprimeur (admin uniquement)
export const assignOrderToPrinter = async (req, res, next) => {
  try {
    const { id } = req.params
    const { printerId } = req.body

    // Vérifier si l'utilisateur est un admin
    if (req.user.role !== "ADMIN") {
      throw new ApiError(403, "Seuls les administrateurs peuvent assigner des commandes")
    }

    // Vérifier si la commande existe
    const order = await prisma.order.findUnique({
      where: { id },
    })

    if (!order) {
      throw new ApiError(404, "Commande non trouvée")
    }

    // Vérifier si l'imprimeur existe et a le rôle PRINTER
    const printer = await prisma.user.findFirst({
      where: {
        id: printerId,
        role: "PRINTER",
      },
    })

    if (!printer) {
      throw new ApiError(404, "Imprimeur non trouvé")
    }

    // Assigner la commande à l'imprimeur
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        printer: {
          connect: { id: printerId },
        },
        status: "PROCESSING",
        statusHistory: {
          create: {
            status: "PROCESSING",
            comment: `Commande assignée à l'imprimeur ${printer.firstName} ${printer.lastName}`,
            createdBy: req.user.id,
          },
        },
      },
    })

    // Envoyer une notification à l'imprimeur
    await sendOrderNotification(printerId, "Une nouvelle commande vous a été assignée", {
      orderId: updatedOrder.id,
      orderNumber: updatedOrder.orderNumber,
      status: updatedOrder.status,
    })

    return sendResponse(res, {
      data: updatedOrder,
      message: "Commande assignée avec succès",
    })
  } catch (error) {
    next(error)
  }
}
