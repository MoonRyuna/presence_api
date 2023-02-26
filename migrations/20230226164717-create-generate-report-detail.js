'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('generate_report_detail', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      user_id: {
        type: Sequelize.BIGINT
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
      wfh: {
        type: Sequelize.INTEGER
      },
      wfo: {
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
    await queryInterface.dropTable('generate_report_detail');
  }
};