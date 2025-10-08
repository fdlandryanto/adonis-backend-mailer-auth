import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'orders'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('user_id').unsigned().references('id').inTable('users').notNullable()
      table.integer('shipping_address_id').unsigned().references('id').inTable('addresses').notNullable()
      table.integer('billing_address_id').unsigned().references('id').inTable('addresses')
      table.integer('total_price').notNullable()
      table.integer('discount_id').unsigned().references('id').inTable('discounts')
      table.string('status', 50).notNullable().defaultTo('pending')
      table.string('xendit_transaction_id', 255).unique()
      table.integer('shipping_method_id').unsigned().references('id').inTable('shipping_methods')

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}