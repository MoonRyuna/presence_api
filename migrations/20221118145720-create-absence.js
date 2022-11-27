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
      submission_at: {
        type: Sequelize.DATE
      },
      submission_status: {
        type: Sequelize.STRING
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
      user_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {        
          model: 'user',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      attachment: {
        type: Sequelize.TEXT
      },
      absence_at: {
        type: Sequelize.DATE
      },
      approvedAt: {
        type: Sequelize.DATE
      },
      approved_by: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {        
          model: 'user',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      rejectedAt: {
        type: Sequelize.DATE
      },
      rejected_by: {
        type: Sequelize.BIGINT,
        allowNull: false,
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
    await queryInterface.dropTable('absence');
  }
};