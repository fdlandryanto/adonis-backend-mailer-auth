import nodemailer from 'nodemailer'
import env from '#start/env'
import { render } from '@react-email/render'
import { OtpEmail } from '../emails/OtpEmail.js'
import { ContactNotificationEmail } from '../emails/ContactNotificationEmail.js'

export default class MailerService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: env.get('MAILER_HOST'),
      port: Number(env.get('MAILER_PORT')),
      secure: true,
      logger: true,
      debug: true,
      auth: {
        user: env.get('MAILER_USER'),
        pass: env.get('MAILER_PASSWORD'),
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  public async sendEmail(targetEmail: string, subjectMessage: string, html: string) {
    const info = await this.transporter.sendMail({
      from: '"TASFRL" <info@tasfrl.org>',
      to: targetEmail,
      subject: subjectMessage,
      html,
    })
    console.log(info)
    return info
  }
  
  public async sendOtpEmail(
    targetEmail: string,
    props: { otp: string; verificationLink: string }
  ) {
    const html = await render(OtpEmail(props))
    
    return await this.sendEmail(
      targetEmail,
      'Verify Your Account',
      html
    )
  }

  public async sendContactNotification(contactData: {
    name: string
    email: string
    message: string
    submissionId: number
  }) {
    
    const html = await render(ContactNotificationEmail(contactData))
    
    const adminEmail = env.get('ADMIN_EMAIL', 'info@tasfrl.org')

    return await this.sendEmail(
      adminEmail,
      `New Contact Form Submission from ${contactData.name}`,
      html
    )
  }
}