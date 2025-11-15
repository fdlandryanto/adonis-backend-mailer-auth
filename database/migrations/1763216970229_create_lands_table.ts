import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'lands'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table.integer('user_id').unsigned().references('users.id').onDelete('CASCADE').notNullable().unique()
      table.boolean('is_heir_property').notNullable()
      table.string('county_location').nullable()
      table.decimal('approximate_acreage', 10, 2).nullable()
      table.json('land_use').notNullable().defaultTo('[]')

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}