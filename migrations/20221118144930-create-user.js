'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('user', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT
      },
      user_code: {
        type: Sequelize.TEXT
      },
      username: {
        type: Sequelize.TEXT
      },
      password: {
        type: Sequelize.TEXT
      },
      token: {
        type: Sequelize.TEXT
      },
      email: {
        type: Sequelize.TEXT
      },
      account_type: {
        type: Sequelize.TEXT
      },
      name: {
        type: Sequelize.TEXT
      },
      address: {
        type: Sequelize.TEXT
      },
      description: {
        type: Sequelize.TEXT
      },
      started_work_at: {
        type: Sequelize.DATE
      },
      profile_picture: {
        type: Sequelize.TEXT
      },
      device_tracker: {
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
    await queryInterface.dropTable('user');
  }
};