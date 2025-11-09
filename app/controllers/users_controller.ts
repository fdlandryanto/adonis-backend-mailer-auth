import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import { inject } from '@adonisjs/core'
import MailerService from '#services/mailer_service'
import { DateTime } from 'luxon'
import limiter from '@adonisjs/limiter/services/main'
import crypto from 'node:crypto'
import env from '#start/env'
import { timingSafeEqual } from 'node:crypto'
import hash from '@adonisjs/core/services/hash'
import vine, {errors as vineErrors } from '@vinejs/vine'
import AvatarService from '#services/avatar_service'
import app from '@adonisjs/core/services/app'
import fs from 'fs'
import { InterestKeys } from '../constants/interests.js'

function generateOtp(): string {
    return crypto.randomInt(100000, 1000000).toString()
}

function safeCompare(a: string, b: string): boolean {
    const aBuf = Buffer.from(a)
    const bBuf = Buffer.from(b)

    if (aBuf.length !== bBuf.length) return false

    return timingSafeEqual(aBuf, bBuf)
}

const FRONTEND_URL = env.get("NODE_ENV") === "production" ? env.get("PRODUCTION_FRONTEND_URL") : env.get("LOCAL_FRONTEND_URL")

@inject()
export default class UsersController {
    constructor(protected mailerService: MailerService) { }

    public async me({ auth, response }: HttpContext) {
        try {
            const user = await auth.use('api').authenticate()
            return response.ok({
                id: user.id,
                name: user.name,
                email: user.email,
                phone_number: user.phone_number,
                is_verified: user.is_verified,
                role: user.role,
                avatar: user.avatar
            })
        } catch (err) {
            console.error('Error in me endpoint:', err)
            return response.unauthorized({ status: false, message: 'Invalid token' })
        }
    }

    async register({ request, response }: HttpContext) {
        const { name, email, password } = request.only(['name', 'email', 'password'])
        const user = await User.findBy('email', email)
        if (user) {
            return response.conflict({ status: false, message: 'This email is already registered' })
        }

        const otp = generateOtp()
        const expiresAt = DateTime.now().plus({ minutes: 5 })

        const verificationLink = `${FRONTEND_URL}/verify/${otp}`

        try {
            await this.mailerService.sendOtpEmail(email, { otp, verificationLink })

            const userCreation = await User.create({
                name,
                email,
                password,
                otp_code: otp,
                otp_expires_at: expiresAt,
                otp_attempts: 0,
            })

            const token = await User.accessTokens.create(userCreation)
            const tokenValue = token.value!.release()

            response.cookie('token', tokenValue, {
                httpOnly: true,
                sameSite: 'lax',
                secure: env.get('NODE_ENV') === 'production',
                maxAge: 60 * 60 * 24 * 7
            })

            return response.ok({
                type: 'bearer',
                token: tokenValue,
                user: {
                    id: userCreation.id,
                    email: userCreation.email,
                    is_verified: userCreation.is_verified,
                },
                status: true,
                message: 'Email sent successfully!'
            })

        } catch (error) {
            console.error({ status: false, message: 'Failed to send the email', error })
            return response.internalServerError({ status: false, message: 'Email failed to send' })
        }
    }

    async login({ request, response }: HttpContext) {
        const { email, password } = request.only(['email', 'password'])
        if (!email?.trim() || !password?.trim()) {
            return response.badRequest({ success: false, message: 'Email or password cannot be empty' })
        }

        try {
            const user = await User.verifyCredentials(email, password)
            const token = await User.accessTokens.create(user)
            const tokenValue = token.value!.release()

            response.cookie('token', tokenValue, {
                httpOnly: true,
                sameSite: 'lax',
                secure: env.get('NODE_ENV') === 'production',
                maxAge: 60 * 60 * 24 * 7
            })

            return response.ok({
                type: 'bearer',
                token: tokenValue,
                user: {
                    id: user.id,
                    email: user.email,
                    is_verified: user.is_verified,
                },
            })
        } catch (error) {
            return response.badRequest({ success: false, message: 'Invalid email or password' })
        }
    }

    public async logout({ auth, response }: HttpContext) {
        try {
            const user = auth.getUserOrFail()

            const token = user.currentAccessToken

            await User.accessTokens.delete(user, token.identifier)

            response.clearCookie('token')

            return response.ok({ message: 'Logged out successfully' })
        } catch (error) {
            console.error('Logout error:', error)
            return response.internalServerError({ status: false, message: 'Failed to logout' })
        }
    }

    private async _verifyUser(user: User) {
        user.is_verified = true
        user.otp_code = null
        user.otp_expires_at = null
        user.otp_attempts = 0
        await user.save()
    }

    async verifyOtp({ request, response }: HttpContext) {
        const { email, otp } = request.only(['email', 'otp'])

        if (!email?.trim() || !otp?.trim()) {
            return response.badRequest({ success: false, message: 'Email or OTP code cannot be empty' })
        }

        const user = await User.findBy('email', email)
        if (!user || !user.otp_code || user.otp_code !== otp) {
            if (user) {
                user.otp_attempts += 1
                await user.save()
            }
            return response.badRequest({ status: false, message: 'Invalid email or OTP' })
        }

        if (user.is_verified) {
            return response.badRequest({ status: false, message: 'User is already verified' })
        }

        if (user.otp_attempts >= 5) {
            return response.forbidden({ status: false, message: 'Too many failed OTP attempts. Please resend a new OTP' })
        }

        if (user.otp_expires_at && DateTime.now() > user.otp_expires_at) {
            user.otp_code = null
            user.otp_expires_at = null
            await user.save()
            return response.badRequest({ status: false, message: 'OTP has expired. Please resend a new one' })
        }

        if (!user.otp_code || !safeCompare(user.otp_code, otp)) {
            user.otp_attempts += 1
            await user.save()
            return response.badRequest({ status: false, message: 'Invalid OTP code' })
        }

        await this._verifyUser(user)
        return response.ok({ status: true, message: 'User verified successfully' })
    }

    async resendOtp({ request, response }: HttpContext) {
        const { email } = request.only(['email'])

        const limiterKey = `otp_resend:${email.toLowerCase()}`
        const otpLimiter = limiter.use({
            requests: 5,
            duration: 30 * 60,
        })

        const remaining = await otpLimiter.remaining(limiterKey)
        if (remaining <= 0) {
            return response.tooManyRequests({
                status: false, message: 'Too many OTP resend attempts. Please try again after 30 minutes',
            })
        }

        const user = await User.findBy('email', email)
        if (!user) {
            return response.notFound({ status: false, message: 'User not found' })
        }

        if (user.is_verified) {
            return response.badRequest({ status: false, message: 'User is already verified' })
        }

        const otp = generateOtp()
        const expiresAt = DateTime.now().plus({ minutes: 5 })

        user.otp_code = otp
        user.otp_expires_at = expiresAt
        user.otp_attempts = 0
        await user.save()

        const verificationLink = `${FRONTEND_URL}/verify/${otp}`

        await this.mailerService.sendOtpEmail(user.email, { otp, verificationLink })

        await otpLimiter.increment(limiterKey)

        return response.ok({ status: true, message: 'OTP has been resent to your email' })
    }

    async verifyLink({ request, response }: HttpContext) {
        try {
            const { verification_code } = request.only(['verification_code'])

            const user = await User.findByOrFail('otp_code', verification_code)
            if (!user) {
                return response.notFound({
                    status: false,
                    message: 'Invalid OTP Code – no user found',
                })
            }

            if (user.is_verified) {
                return response.badRequest({
                    status: false,
                    message: 'User is already verified',
                })
            }

            if (user.otp_attempts >= 5) {
                return response.forbidden({
                    status: false,
                    message: 'Too many failed OTP attempts. Please resend a new OTP',
                })
            }

            if (user.otp_expires_at && DateTime.now() > user.otp_expires_at) {
                user.otp_code = null
                user.otp_expires_at = null
                await user.save()
                return response.badRequest({
                    status: false,
                    message: 'OTP has expired. Please request a new one',
                })
            }

            if (!user.otp_code || user.otp_code !== verification_code) {
                user.otp_attempts += 1
                await user.save()
                return response.badRequest({
                    status: false,
                    message: 'Invalid OTP code – mismatch',
                })
            }

            // ✅ OTP valid → verify user
            await this._verifyUser(user)
            return response.ok({
                status: true,
                message: 'User verified successfully',
            })
        } catch (error) {
            console.error('[verifyLink] Unexpected error:', error)

            return response.internalServerError({
                status: false,
                message: 'An unexpected error occurred during verification',
                error: error instanceof Error ? error.message : error,
            })
        }
    }

public async updateProfile({ auth, request, response }: HttpContext) {
        try {
            const user = auth.user!

            const profileSchema = vine.object({
                name: vine.string().trim().minLength(2).optional(),
                phone_number: vine.string().trim().mobile().optional(),
                areasOfInterest: vine.array(vine.enum([...InterestKeys])).optional(),
                country_region: vine.string().trim().minLength(2).optional(),
                detail_address: vine.string().trim().minLength(5).optional()
            })

            const validator = vine.compile(profileSchema)
            const payload = await request.validateUsing(validator)

            const hasName = payload.name && payload.name.trim() !== ''
            const hasPhone = payload.phone_number && payload.phone_number.trim() !== ''
            const hasInterests =
            payload.areasOfInterest && payload.areasOfInterest.length > 0
            const hasCountry = payload.country_region && payload.country_region.trim() !== ''
            const hasAddress = payload.detail_address && payload.detail_address.trim() !== ''

            if (!hasName && !hasPhone && !hasInterests && !hasCountry && !hasAddress) {
                throw new vineErrors.E_VALIDATION_ERROR([
                    {
                    field: 'root',
                    message: 'At least one field is required.',
                    rule: 'atLeastOneOf',
                    },
                ])
            }

            await user.merge(payload).save()

            return response.json({
                success: true,
                message: 'Profile updated successfully',
                data: user.serialize({
                    fields: [
                    'id',
                    'name',
                    'email',
                    'phone_number',
                    'is_verified',
                    'areasOfInterest',
                    'avatar',
                    'countryRegion',
                    'detailAddress'
                    ],
                }),
            })
        } catch (error) {
            if (error instanceof vineErrors.E_VALIDATION_ERROR) {
                return response.status(400).json({
                    success: false,
                    errors: error.messages,
                })
            }

            console.error('Error updating profile:', error)
            return response.status(500).json({
                success: false,
                error: 'Failed to update profile.',
            })
        }
    }

    public async redirectToGoogle({ ally }: HttpContext) {
        return ally.use('google').redirect()
    }

    public async handleGoogleCallback({ ally, response }: HttpContext) {
        const google = ally.use('google')

        if (google.stateMisMatch()) {
            return response.badRequest({ message: 'Request expired. Please try again.' })
        }
        if ( google.hasError()) {
            return response.badRequest({ message: google.getError() || 'An error occurred.' })
        }

        const googleUser = await google.user()

        let user = await User.findBy('email', googleUser.email!)

        if (user) {
            user.provider = 'google'
            user.provider_id = googleUser.id
            user.is_verified = true
            await user.save()
        } else {
            user = await User.create({
                email: googleUser.email!,
                name: googleUser.name,
                provider: 'google',
                provider_id: googleUser.id,
                is_verified: true
            })
        }

        const token = await User.accessTokens.create(user)
        const tokenValue = token.value!.release()

        response.cookie('token', tokenValue, {
            httpOnly: true,
            sameSite: 'lax',
            secure: env.get('NODE_ENV') === 'production',
            maxAge: 60 * 60 * 24 * 7
        })

        return response.redirect(`${FRONTEND_URL}/auth/callback?token=${tokenValue}`)
    }

    public async updatePassword({ auth, request, response }: HttpContext) {
        const user = await auth.use('api').authenticate()

        if (!user.password) {
            return response.badRequest({
                status: false,
                message: `This account is registered with a social provider and does not have a password. Please create a password first`
            })
        }

        const passwordSchema = vine.object({
            old_password: vine.string().trim(),
            new_password: vine.string().trim().minLength(6).notSameAs('old_password')
        })

        const passwordValidator = vine.compile(passwordSchema)
        const { old_password, new_password } = await request.validateUsing(passwordValidator)

        const isOldPasswordValid = await hash.verify(user.password, old_password)
        if (!isOldPasswordValid) {
            return response.badRequest({
                status: false,
                message: 'Invalid old password'
            })
        }

        user.password = new_password
        await user.save()

        return response.ok({
            status: true,
            message: 'Password updated successfully'
        })
    }

    public async createPassword({ auth, request, response }: HttpContext) {
        const user = await auth.use('api').authenticate()

        if (user.password) {
            return response.badRequest({
                status: false,
                message: 'This account already has a password set'
            })
        }

        const passwordSchema = vine.object({
            new_password: vine.string().trim().minLength(6)
        })

        const passwordValidator = vine.compile(passwordSchema)
        const { new_password } = await request.validateUsing(passwordValidator)

        user.password = new_password
        await user.save()

        return response.ok({
            status: true,
            message: 'Password created successfully'
        })
    }

    public async uploadAvatar({ auth, request, response }: HttpContext) {
        const user = await auth.use('api').authenticate()

        const avatar = request.file('avatar', {
            extnames: ['jpg', 'png', 'jpeg', 'webp'],
            size: '20mb',
        })

        if (!avatar) {
            return response.badRequest({ status: false, message: 'No file uploaded!' })
        }

        if (!avatar.isValid) {
            return response.badRequest({ status: false, message: avatar.errors })
        }

        const result = await AvatarService.upload(user, avatar)
        return response.ok(result)
    }

    public async updateAvatarUrl({ auth, request, response }: HttpContext) {
        const user = await auth.use('api').authenticate()

        const { avatar_url } = request.only(['avatar_url'])

        if (!avatar_url || typeof avatar_url !== 'string' || !avatar_url.trim()) {
            return response.badRequest({
            status: false,
            message: 'Avatar URL is required.',
            })
        }

        const urlPattern = /^(https?:\/\/[^\s$.?#].[^\s]*)$/i
        if (!urlPattern.test(avatar_url)) {
            return response.badRequest({
            status: false,
            message: 'Invalid URL format.',
            })
        }

        if (user.avatar && user.avatar.startsWith('/uploads/')) {
            const oldAvatarPath = app.publicPath(user.avatar.replace(/^\/+/, ''))
            try {
            if (fs.existsSync(oldAvatarPath)) {
                fs.unlinkSync(oldAvatarPath)
            }
            } catch (err) {
            console.warn(`⚠️ Failed to delete old local avatar: ${err}`)
            }
        }

        user.avatar = avatar_url
        await user.save()

        return response.ok({
            status: true,
            message: 'Avatar URL updated successfully.',
            avatar_url: user.avatar,
        })
    }
}
