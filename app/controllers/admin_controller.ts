import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import { DateTime } from 'luxon'

export default class AdminController {
    public async dashboard({ response }: HttpContext) {
        try {
            const oneMonthAgo = DateTime.now().minus({ months: 1 }).toSQL()
            const newUsers = await User.query()
            .where('created_at', '>=', oneMonthAgo)
            .where('role', 'user')
            .orderBy('created_at', 'desc')

            const allUsers = await User.query()
            .preload('land')
            .orderBy('created_at', 'desc')

            const formattedUsers = allUsers.map((user) => {
                const isProfileComplete =
                !!user.membershipPackage &&
                !!user.land

                return {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    join_date: user.createdAt,
                    is_new: user.createdAt >= DateTime.now().minus({ months: 1 }),
                    is_profile_complete: isProfileComplete,
                    steps_completed: {
                        basic_info: true,
                        land_info: !!user.land,
                        interests: user.areasOfInterest.length > 0,
                        membership: !!user.membershipPackage
                    }
                }
            })

            return response.ok({
                success: true,
                data: {
                    summary: {
                        total_users: allUsers.length,
                        new_users_count: newUsers.length,
                    },
                    new_users: newUsers,
                    users_list: formattedUsers
                }
            })
        } catch (error) {
            console.error('Admin Dashboard Error:', error)
            return response.internalServerError({
                success: false,
                message: 'Failed to fetch dashboard data'
            })
        }
    }
}