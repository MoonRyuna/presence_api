'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('generate_report', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      title: {
        type: Sequelize.TEXT
      },
      start_date: {
        type: Sequelize.DATE
      },
      end_date: {
        type: Sequelize.DATE
      },
      generated_by: {
        type: Sequelize.BIGINT
      },
      generated_at: {
        type: Sequelize.DATE
      },
      total_employe: {
        type: Sequelize.INTEGER
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('generate_report');
  }
};