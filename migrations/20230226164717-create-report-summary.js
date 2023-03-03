'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('report_summary', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      report_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {        
          model: 'report',
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
      hadir: {
        type: Sequelize.INTEGER
      },
      tanpa_keterangan: {
        type: Sequelize.INTEGER
      },
      cuti: {
        type: Sequelize.INTEGER
      },
      sakit: {
        type: Sequelize.INTEGER
      },
      izin_lainnya: {
        type: Sequelize.INTEGER
      },
      telat: {
        type: Sequelize.INTEGER
      },
      wfh: {
        type: Sequelize.INTEGER
      },
      wfo: {
        type: Sequelize.INTEGER
      },
      lembur: {
        type: Sequelize.INTEGER
      },
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('report_summary');
  }
};