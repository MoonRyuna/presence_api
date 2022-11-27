'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('presence', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      check_in: {
        type: Sequelize.DATE
      },
      check_out: {
        type: Sequelize.DATE
      },
      position_check_in: {
        type: Sequelize.TEXT
      },
      position_check_out: {
        type: Sequelize.TEXT
      },
      description: {
        type: Sequelize.TEXT
      },
      user_id: {
        type: Sequelize.BIGINT,
        references: {        
          model: 'user',
          key: 'id'
        },
        onDelete: 'CASCADE'
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
    await queryInterface.dropTable('presence');
  }
};