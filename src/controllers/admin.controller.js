import { prisma } from "../server.js"
import { ApiError } from "../utils/api-error.js"
import { sendResponse } from "../utils/api-response.js"

// Obtenir tous les utilisateurs (admin uniquement)
export const getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, role, search } = req.query

    const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit)

    // Construire les filtres
    const where = {}

    if (role) {
      where.role = role
    }

    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
      ]
    }

    // Compter le nombre total d'utilisateurs
    const total = await prisma.user.count({ where })

    // Récupérer les utilisateurs
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        profileImage: true,
        phoneNumber: true,
        role: true,
        subscription: true,
        createdAt: true,
        updatedAt: true,
        isVerified: true,
        artistProfile: true,
        printerProfile: true,
      },
      skip,
      take: Number.parseInt(limit),
      orderBy: {
        createdAt: "desc",
      },
    })

    return sendResponse(res, {
      data: {
        users,
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

// Obtenir un utilisateur par ID (admin uniquement)
export const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        profileImage: true,
        phoneNumber: true,
        role: true,
        subscription: true,
        createdAt: true,
        updatedAt: true,
        isVerified: true,
        artistProfile: true,
        printerProfile: true,
      },
    })

    if (!user) {
      throw new ApiError(404, "Utilisateur non trouvé")
    }

    return sendResponse(res, {
      data: user,
    })
  } catch (error) {
    next(error)
  }
}

// Mettre à jour un utilisateur (admin uniquement)
export const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params
    const { firstName, lastName, phoneNumber, role, subscription, isVerified } = req.body

    // Vérifier si l'utilisateur existe
    const existingUser = await prisma.user.findUnique({
      where: { id },
    })

    if (!existingUser) {
      throw new ApiError(404, "Utilisateur non trouvé")
    }

    // Mettre à jour l'utilisateur
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        firstName,
        lastName,
        phoneNumber,
        role,
        subscription,
        isVerified,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        profileImage: true,
        phoneNumber: true,
        role: true,
        subscription: true,
        createdAt: true,
        updatedAt: true,
        isVerified: true,
      },
    })

    // Si le rôle a changé, gérer les profils associés
    if (role && role !== existingUser.role) {
      // Si le nouveau rôle est ARTIST, créer un profil d'artiste s'il n'existe pas
      if (role === "ARTIST") {
        const artistProfile = await prisma.artistProfile.findUnique({
          where: { userId: id },
        })

        if (!artistProfile) {
          await prisma.artistProfile.create({
            data: {
              userId: id,
            },
          })
        }
      }

      // Si le nouveau rôle est PRINTER, créer un profil d'imprimeur s'il n'existe pas
      if (role === "PRINTER") {
        const printerProfile = await prisma.printerProfile.findUnique({
          where: { userId: id },
        })

        if (!printerProfile) {
          await prisma.printerProfile.create({
            data: {
              userId: id,
              companyName: "Entreprise",
              address: "Adresse non spécifiée",
              capabilities: [],
            },
          })
        }
      }
    }

    return sendResponse(res, {
      data: updatedUser,
      message: "Utilisateur mis à jour avec succès",
    })
  } catch (error) {
    next(error)
  }
}

// Supprimer un utilisateur (admin uniquement)
export const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params

    // Vérifier si l'utilisateur existe
    const existingUser = await prisma.user.findUnique({
      where: { id },
    })

    if (!existingUser) {
      throw new ApiError(404, "Utilisateur non trouvé")
    }

    // Supprimer l'utilisateur
    await prisma.user.delete({
      where: { id },
    })

    return sendResponse(res, {
      message: "Utilisateur supprimé avec succès",
    })
  } catch (error) {
    next(error)
  }
}

// Obtenir toutes les commandes (admin uniquement)
export const getAllOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, clientId, printerId } = req.query

    const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit)

    // Construire les filtres
    const where = {}

    if (status) {
      where.status = status
    }

    if (clientId) {
      where.clientId = clientId
    }

    if (printerId) {
      where.printerId = printerId
    }

    // Compter le nombre total de commandes
    const total = await prisma.order.count({ where })

    // Récupérer les commandes
    const orders = await prisma.order.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        printer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
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

// Obtenir les statistiques du tableau de bord (admin uniquement)
export const getDashboardStats = async (req, res, next) => {
  try {
    // Compter le nombre d'utilisateurs par rôle
    const userStats = await prisma.user.groupBy({
      by: ["role"],
      _count: {
        id: true,
      },
    })

    // Compter le nombre de commandes par statut
    const orderStats = await prisma.order.groupBy({
      by: ["status"],
      _count: {
        id: true,
      },
      _sum: {
        totalAmount: true,
      },
    })

    // Compter le nombre d'œuvres par statut
    const artworkStats = await prisma.artwork.groupBy({
      by: ["status"],
      _count: {
        id: true,
      },
    })

    // Récupérer les dernières commandes
    const recentOrders = await prisma.order.findMany({
      take: 5,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        client: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    // Récupérer les derniers utilisateurs inscrits
    const recentUsers = await prisma.user.findMany({
      take: 5,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
      },
    })

    return sendResponse(res, {
      data: {
        userStats,
        orderStats,
        artworkStats,
        recentOrders,
        recentUsers,
      },
    })
  } catch (error) {
    next(error)
  }
}
