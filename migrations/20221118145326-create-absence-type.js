'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('absence_type', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.TEXT
      },
      cut_annual_leave: {
        type: Sequelize.BOOLEAN
      },
      deleted: {
        type: Sequelize.BOOLEAN
      },
      created_by: {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: {        
          model: 'user',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      updated_by: {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: {        
          model: 'user',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },      
      deleted_by: {
        type: Sequelize.BIGINT,
        allowNull: true,
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
      },
      deletedAt: {
        allowNull: true,
        type: Sequelize.DATE
      },
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('absence_type');
  }
};