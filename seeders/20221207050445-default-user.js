'use strict';
const bcrypt = require('bcrypt');
const saltRounds = 10;

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    try {
      await queryInterface.bulkInsert('user', [
        {
          user_code: '10.001',
          username: 'admin',
          password: await bcrypt.hash('admin', saltRounds),
          token: null,
          email: 'kurosaki.ari.kun@gmail.com',
          account_type: 'admin',
          name: 'Admin Ganteng',
          address: 'Jl. Cikutra No. 1',
          description: 'Admin Ganteng',
          started_work_at: '2021-12-07',
          profile_picture: 'profile/default.png',
          device_tracker: false,
          deleted: false,
          created_by: 1,
          updated_by: 1,
          deleted_by: null,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        { 
          user_code: '11.001',
          username: 'meta.violeta',
          password: await bcrypt.hash('rahasia', saltRounds),
          token: null,
          email: 'meta.violeta@dak.co.id',
          account_type: 'hrd',
          name: 'Meta Violeta',
          address: 'Jl. Cikutra No. 1',
          description: 'HRD',
          started_work_at: '2018-12-07',
          profile_picture: 'profile/default.png',
          device_tracker: false,
          deleted: false,
          created_by: 1,
          updated_by: 1,
          deleted_by: null,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]);
    } catch (error) {
      console.log(error)
    }
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('user', null, {
      truncate: true,
    });
  }
};
