import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'payments'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('order_id').references('id').inTable('orders').notNullable()
      table.string('xendit_payment_id', 255).unique().notNullable()
      table.integer('amount').notNullable()
      table.string('status', 50).notNullable().defaultTo('pending')

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}