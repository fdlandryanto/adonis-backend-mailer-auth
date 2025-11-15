import { DateTime } from 'luxon'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { BaseModel, column, hasOne } from '@adonisjs/lucid/orm'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import { DbAccessTokensProvider } from '@adonisjs/auth/access_tokens'
import { InterestKey } from '../constants/interests.js'
import Land from '#models/land'
import type { HasOne } from '@adonisjs/lucid/types/relations'

const AuthFinder = withAuthFinder(() => hash.use('scrypt'), {
  uids: ['email'],
  passwordColumnName: 'password',
})

export default class User extends compose(BaseModel, AuthFinder) {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare email: string

  @column()
  declare phone_number: string | null

  @column()
  declare is_verified: boolean

  @column()
  declare role: any

  @column()
  public avatar?: string | null

  @column()
  declare otp_code: string | null

  @column()
  declare otp_expires_at: DateTime | null

  @column()
  declare otp_attempts: number

  @column()
  declare provider: string | null

  @column()
  declare provider_id: string | null

  @column({
    prepare: (value: InterestKey[]) => {
      return JSON.stringify(value || [])
    },

    consume: (value: any) => {
      if (!value) {
        return []
      }

      if (Array.isArray(value)) {
        return value
      }

      if (typeof value === 'string') {
        if (value.trim() === '') {
          return []
        }

        try {
          return JSON.parse(value)
        } catch (error) {
          console.error(
            'Failed to parse areas_of_interest string from DB:',
            error,
            'Value was:',
            JSON.stringify(value)
          )
          return []
        }
      }

      console.warn('Unexpected data type for areas_of_interest:', value)
      return []
    },
  })
  declare areasOfInterest: InterestKey[]

  @column({ columnName: 'country_region' })
  declare countryRegion: string | null

  @column({ columnName: 'detail_address' })
  declare detailAddress: string | null

  @column({ serializeAs: null })
  declare password: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @hasOne(() => Land)
  declare land: HasOne<typeof Land>

  static accessTokens = DbAccessTokensProvider.forModel(User, {
    expiresIn: '30 days'
  })
}