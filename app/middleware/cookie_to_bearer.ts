import type { HttpContext } from '@adonisjs/core/http'

export default class CookieToBearer {
    public async handle(ctx: HttpContext, next: () => Promise<void>) {
        const authHeader = ctx.request.header('authorization')
        if (!authHeader) {
            const cookieToken = ctx.request.cookie('token')
            if (cookieToken) {
                let actualToken = cookieToken

                // If it's a signed cookie (format: s:base64Payload.signature)
                if (cookieToken.startsWith('s:')) {
                    try {
                        const parts = cookieToken.substring(2).split('.')
                        if (parts.length >= 2) {
                            // Decode the base64 JSON payload
                            const payload = JSON.parse(Buffer.from(parts[0], 'base64').toString())
                            actualToken = payload.message || payload.token || cookieToken
                        }
                    } catch (e) {
                        // If parsing fails, use the cookie as-is
                        console.error('Failed to parse signed cookie:', e)
                    }
                }

                ctx.request.request.headers['authorization'] = `Bearer ${actualToken}`
            }
        }
        await next()
    }
}