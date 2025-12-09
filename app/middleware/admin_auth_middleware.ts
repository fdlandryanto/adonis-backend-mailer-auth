import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export default class AdminAuthMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const user = ctx.auth.user

    if (!user) {
      return ctx.response.unauthorized({
        success: false,
        message: 'You must be logged in to view this page'
      })
    }

    if (user.role !== 'admin') {
      return ctx.response.forbidden({
        success: false,
        message: 'Access denied. Admins only.'
      })
    }

    const output = await next()
    return output
  }
}