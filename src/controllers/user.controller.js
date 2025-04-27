import bcrypt from "bcryptjs"
import { prisma } from "../server.js"
import { ApiError } from "../utils/api-error.js"
import { sendResponse } from "../utils/api-response.js"
import { uploadImage } from "../services/upload.service.js"

// Obtenir le profil de l'utilisateur
export const getUserProfile = async (req, res, next) => {
  try {
    const userId = req.user.id

    const user = await prisma.user.findUnique({
      where: { id: userId },
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
        artistProfile: req.user.role === "ARTIST",
        printerProfile: req.user.role === "PRINTER",
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

// Mettre à jour le profil de l'utilisateur
export const updateUserProfile = async (req, res, next) => {
  try {
    const userId = req.user.id
    const { firstName, lastName, phoneNumber } = req.body

    // Vérifier si l'utilisateur existe
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!existingUser) {
      throw new ApiError(404, "Utilisateur non trouvé")
    }

    // Préparer les données à mettre à jour
    const updateData = {
      firstName,
      lastName,
      phoneNumber,
    }

    // Gérer l'upload d'image de profil si présent
    if (req.file) {
      const imageUrl = await uploadImage(req.file)
      updateData.profileImage = imageUrl
    }

    // Mettre à jour l'utilisateur
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
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
      },
    })

    return sendResponse(res, {
      data: updatedUser,
      message: "Profil mis à jour avec succès",
    })
  } catch (error) {
    next(error)
  }
}

// Changer le mot de passe
export const changePassword = async (req, res, next) => {
  try {
    const userId = req.user.id
    const { currentPassword, newPassword } = req.body

    // Vérifier si l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      throw new ApiError(404, "Utilisateur non trouvé")
    }

    // Vérifier le mot de passe actuel
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password)

    if (!isPasswordValid) {
      throw new ApiError(401, "Mot de passe actuel incorrect")
    }

    // Hasher le nouveau mot de passe
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(newPassword, salt)

    // Mettre à jour le mot de passe
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
      },
    })

    return sendResponse(res, {
      message: "Mot de passe changé avec succès",
    })
  } catch (error) {
    next(error)
  }
}

// Mettre à jour l'abonnement de l'utilisateur
export const updateSubscription = async (req, res, next) => {
  try {
    const userId = req.user.id
    const { subscription } = req.body

    // Vérifier si l'abonnement est valide
    if (!["FREE", "PREMIUM"].includes(subscription)) {
      throw new ApiError(400, "Type d'abonnement invalide")
    }

    // Mettre à jour l'abonnement
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        subscription,
      },
      select: {
        id: true,
        email: true,
        subscription: true,
      },
    })

    return sendResponse(res, {
      data: updatedUser,
      message: "Abonnement mis à jour avec succès",
    })
  } catch (error) {
    next(error)
  }
}

// Supprimer le compte utilisateur
export const deleteAccount = async (req, res, next) => {
  try {
    const userId = req.user.id

    // Supprimer l'utilisateur
    await prisma.user.delete({
      where: { id: userId },
    })

    return sendResponse(res, {
      message: "Compte supprimé avec succès",
    })
  } catch (error) {
    next(error)
  }
}
