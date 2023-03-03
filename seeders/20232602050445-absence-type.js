'use strict';
const bcrypt = require('bcrypt');
const saltRounds = 10;

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    try {
      await queryInterface.bulkInsert('absence_type', [
        {
          name: "Sakit",
          cut_annual_leave: false,
          created_by: 1,
          updated_by: 1,
          deleted_by: null,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          name: "Cuti Tahunan",
          cut_annual_leave: true,
          created_by: 1,
          updated_by: 1,
          deleted_by: null,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          name: "Acara Keluarga",
          cut_annual_leave: false,
          created_by: 1,
          updated_by: 1,
          deleted_by: null,
          createdAt: new Date(),
          updatedAt: new Date()
        },
      ]);
    } catch (error) {
      console.log(error)
    }
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('absence_type', null, {
      truncate: true,
    });
  }
};
