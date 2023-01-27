'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('submission', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      submission_type: {
        type: Sequelize.TEXT
      },
      submission_at: {
        type: Sequelize.DATE
      },
      submission_status: {
        type: Sequelize.TEXT
      },
      submission_ref_table: {
        type: Sequelize.TEXT
      },
      submission_ref_id: {
        type: Sequelize.BIGINT
      },
      authorization_by: {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: {        
          model: 'user',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      authorization_at: {
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('submission');
  }
};