'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('absence', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      user_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {        
          model: 'user',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      absence_at: {
        type: Sequelize.DATE
      },
      absence_status: {
        type: Sequelize.TEXT
      },
      absence_type_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {        
          model: 'absence_type',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      cut_annual_leave: {
        type: Sequelize.BOOLEAN
      },
      desc: {
        type: Sequelize.TEXT
      },
      attachment: {
        type: Sequelize.TEXT
      },
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('absence');
  }
};