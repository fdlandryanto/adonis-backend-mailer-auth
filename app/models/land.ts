import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import { LandUseKey } from '../constants/land_use.js'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'

export default class Land extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare isHeirProperty: boolean

  @column()
  declare countyLocation: string | null

  @column()
  declare approximateAcreage: number | null

  @column({
    columnName: 'land_use',
    prepare: (value: LandUseKey[]) => JSON.stringify(value || []),
    consume: (value: any) => {
      if (!value) return []
      if (Array.isArray(value)) return value
      if (typeof value === 'string') {
        try { return JSON.parse(value) } catch { return [] }
      }
      return []
    },
  })
  declare landUse: LandUseKey[]

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}