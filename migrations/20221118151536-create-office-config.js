'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('office_configs', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.TEXT
      },
      theme: {
        type: Sequelize.TEXT
      },
      logo: {
        type: Sequelize.TEXT
      },
      latitude: {
        type: Sequelize.DOUBLE
      },
      longitude: {
        type: Sequelize.DOUBLE
      },
      radius: {
        type: Sequelize.DOUBLE
      },
      amount_of_annual_leave: {
        type: Sequelize.INTEGER
      },
      work_schedule: {
        type: Sequelize.TEXT
      },
      updated_by: {
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
    await queryInterface.dropTable('office_configs');
  }
};