import nodemailer from "nodemailer"

// Créer un transporteur pour l'envoi d'emails
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_SECURE === "true",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
})

// Envoyer un email de vérification
export const sendVerificationEmail = async (email, token) => {
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${token}`
  if (process.env.NODE_ENV === 'developpement') {
    // envoyer les emails avec transporter.sendMail()
  } else {
    console.log('EMAIL SIMULÉ (pas d\'envoi en développement)');
  }
  
  const mailOptions = {
    from: `"Art and Déco" <${process.env.EMAIL_FROM}>`,
    to: email,
    subject: "Vérification de votre adresse email",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Bienvenue sur Art and Déco – Portrait Hub</h2>
        <p>Merci de vous être inscrit sur notre plateforme. Pour activer votre compte, veuillez cliquer sur le lien ci-dessous :</p>
        <p><a href="${verificationUrl}" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px;">Vérifier mon email</a></p>
        <p>Si le bouton ne fonctionne pas, vous pouvez copier et coller le lien suivant dans votre navigateur :</p>
        <p>${verificationUrl}</p>
        <p>Ce lien expirera dans 24 heures.</p>
        <p>Cordialement,<br>L'équipe Art and Déco</p>
      </div>
    `,
  }

  return transporter.sendMail(mailOptions)
}

// Envoyer un email de réinitialisation de mot de passe
export const sendPasswordResetEmail = async (email, token) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`

  const mailOptions = {
    from: `"Art and Déco" <${process.env.EMAIL_FROM}>`,
    to: email,
    subject: "Réinitialisation de votre mot de passe",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Réinitialisation de votre mot de passe</h2>
        <p>Vous avez demandé la réinitialisation de votre mot de passe. Veuillez cliquer sur le lien ci-dessous pour créer un nouveau mot de passe :</p>
        <p><a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px;">Réinitialiser mon mot de passe</a></p>
        <p>Si le bouton ne fonctionne pas, vous pouvez copier et coller le lien suivant dans votre navigateur :</p>
        <p>${resetUrl}</p>
        <p>Ce lien expirera dans 1 heure.</p>
        <p>Si vous n'avez pas demandé cette réinitialisation, veuillez ignorer cet email.</p>
        <p>Cordialement,<br>L'équipe Art and Déco</p>
      </div>
    `,
  }

  return transporter.sendMail(mailOptions)
}

// Envoyer un email de confirmation de commande
export const sendOrderConfirmationEmail = async (email, order) => {
  const orderUrl = `${process.env.FRONTEND_URL}/orders/${order.id}`

  const mailOptions = {
    from: `"Art and Déco" <${process.env.EMAIL_FROM}>`,
    to: email,
    subject: `Confirmation de votre commande #${order.orderNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Confirmation de commande</h2>
        <p>Merci pour votre commande sur Art and Déco – Portrait Hub.</p>
        <p>Votre commande #${order.orderNumber} a été reçue et est en cours de traitement.</p>
        <p>Montant total : ${order.totalAmount} FCFA</p>
        <p>Vous pouvez suivre l'état de votre commande en cliquant sur le lien ci-dessous :</p>
        <p><a href="${orderUrl}" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px;">Suivre ma commande</a></p>
        <p>Cordialement,<br>L'équipe Art and Déco</p>
      </div>
    `,
  }

  return transporter.sendMail(mailOptions)
}

// Envoyer un email de mise à jour de statut de commande
export const sendOrderStatusUpdateEmail = async (email, order, status) => {
  const orderUrl = `${process.env.FRONTEND_URL}/orders/${order.id}`

  let statusText = ""
  switch (status) {
    case "PAYMENT_RECEIVED":
      statusText = "Paiement reçu"
      break
    case "PROCESSING":
      statusText = "En cours de traitement"
      break
    case "CUSTOMIZING":
      statusText = "En cours de personnalisation"
      break
    case "PRINTING":
      statusText = "En cours d'impression"
      break
    case "READY_FOR_SHIPPING":
      statusText = "Prêt pour l'expédition"
      break
    case "SHIPPED":
      statusText = "Expédié"
      break
    case "DELIVERED":
      statusText = "Livré"
      break
    default:
      statusText = status
  }

  const mailOptions = {
    from: `"Art and Déco" <${process.env.EMAIL_FROM}>`,
    to: email,
    subject: `Mise à jour de votre commande #${order.orderNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Mise à jour de commande</h2>
        <p>Le statut de votre commande #${order.orderNumber} a été mis à jour.</p>
        <p>Nouveau statut : <strong>${statusText}</strong></p>
        <p>Vous pouvez suivre l'état de votre commande en cliquant sur le lien ci-dessous :</p>
        <p><a href="${orderUrl}" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px;">Suivre ma commande</a></p>
        <p>Cordialement,<br>L'équipe Art and Déco</p>
      </div>
    `,
  }

  return transporter.sendMail(mailOptions)
}
