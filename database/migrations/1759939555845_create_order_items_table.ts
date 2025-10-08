import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'order_items'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('order_id').unsigned().notNullable().references('id').inTable('orders').onDelete('CASCADE')
      table.string('contentful_variant_id', 255).notNullable()
      table.integer('quantity').notNullable()
      table.integer('price_at_purchase').notNullable()

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}