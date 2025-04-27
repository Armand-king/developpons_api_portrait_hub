import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import crypto from "crypto"
import { prisma } from "../server.js"
import { ApiError } from "../utils/api-error.js"
import { sendResponse } from "../utils/api-response.js"
import { sendVerificationEmail, sendPasswordResetEmail } from "../services/email.service.js"

// Inscription d'un nouvel utilisateur
export const register = async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, role, phoneNumber } = req.body

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      throw new ApiError(409, "Cet email est déjà utilisé")
    }

    // Hasher le mot de passe
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    // Générer un token de vérification
    const verificationToken = crypto.randomBytes(32).toString("hex")

    // Créer l'utilisateur
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phoneNumber,
        role: role || "CLIENT",
        verificationToken,
      },
    })

    // Si l'utilisateur est un artiste, créer un profil d'artiste
    if (role === "ARTIST") {
      await prisma.artistProfile.create({
        data: {
          userId: user.id,
        },
      })
    }

    // Si l'utilisateur est un imprimeur, créer un profil d'imprimeur
    if (role === "PRINTER") {
      await prisma.printerProfile.create({
        data: {
          userId: user.id,
          companyName: req.body.companyName || "Entreprise",
          address: req.body.address || "Adresse non spécifiée",
          capabilities: req.body.capabilities || [],
        },
      })
    }

    // Envoyer un email de vérification
    await sendVerificationEmail(user.email, verificationToken)

    // Supprimer le mot de passe de la réponse
    const { password: _, ...userWithoutPassword } = user

    return sendResponse(res, {
      statusCode: 201,
      data: userWithoutPassword,
      message: "Inscription réussie. Veuillez vérifier votre email.",
    })
  } catch (error) {
    next(error)
  }
}

// Connexion d'un utilisateur
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body

    // Vérifier si l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      throw new ApiError(401, "Email ou mot de passe incorrect")
    }

    // Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
      throw new ApiError(401, "Email ou mot de passe incorrect")
    }

    // Vérifier si l'utilisateur a vérifié son email
    if (!user.isVerified) {
      throw new ApiError(401, "Veuillez vérifier votre email avant de vous connecter")
    }

    // Générer un token JWT
    const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "24h" })

    // Supprimer le mot de passe de la réponse
    const { password: _, ...userWithoutPassword } = user

    return sendResponse(res, {
      data: {
        user: userWithoutPassword,
        token,
      },
      message: "Connexion réussie",
    })
  } catch (error) {
    next(error)
  }
}

// Vérification de l'email
export const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.params

    const user = await prisma.user.findFirst({
      where: { verificationToken: token },
    })

    if (!user) {
      throw new ApiError(400, "Token de vérification invalide")
    }

    // Mettre à jour l'utilisateur
    await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        verificationToken: null,
      },
    })

    return sendResponse(res, {
      message: "Email vérifié avec succès. Vous pouvez maintenant vous connecter.",
    })
  } catch (error) {
    next(error)
  }
}

// Demande de réinitialisation de mot de passe
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body

    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      // Pour des raisons de sécurité, on ne révèle pas si l'email existe ou non
      return sendResponse(res, {
        message: "Si cet email existe, vous recevrez un lien de réinitialisation",
      })
    }

    // Générer un token de réinitialisation
    const resetToken = crypto.randomBytes(32).toString("hex")
    const resetExpires = new Date(Date.now() + 3600000) // 1 heure

    // Mettre à jour l'utilisateur
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordExpires: resetExpires,
      },
    })

    // Envoyer un email de réinitialisation
    await sendPasswordResetEmail(user.email, resetToken)

    return sendResponse(res, {
      message: "Un email de réinitialisation a été envoyé",
    })
  } catch (error) {
    next(error)
  }
}

// Réinitialisation du mot de passe
export const resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params
    const { password } = req.body

    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: {
          gt: new Date(),
        },
      },
    })

    if (!user) {
      throw new ApiError(400, "Token de réinitialisation invalide ou expiré")
    }

    // Hasher le nouveau mot de passe
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    // Mettre à jour l'utilisateur
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    })

    return sendResponse(res, {
      message: "Mot de passe réinitialisé avec succès",
    })
  } catch (error) {
    next(error)
  }
}

// Obtenir l'utilisateur actuel
export const getCurrentUser = async (req, res, next) => {
  try {
    // L'utilisateur est déjà disponible grâce au middleware d'authentification
    const { password, ...userWithoutPassword } = req.user

    return sendResponse(res, {
      data: userWithoutPassword,
    })
  } catch (error) {
    next(error)
  }
}
