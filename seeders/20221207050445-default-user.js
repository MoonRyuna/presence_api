'use strict';
const bcrypt = require('bcrypt');
const saltRounds = 10;

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      await queryInterface.bulkInsert('user', [
        {
          user_code: '10.001',
          username: 'admin',
          password: await bcrypt.hash('admin', saltRounds),
          token: null,
          phone_number: '62811',
          email: 'kurosaki.ari.kun@gmail.com',
          account_type: 'admin',
          name: 'Admin Ganteng',
          address: 'Jl. Cikutra No. 1',
          description: 'Admin Ganteng',
          started_work_at: '2021-12-07',
          profile_picture: 'public/images/default.png',
          device_tracker: false,
          can_wfh: true,
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
          phone_number: '62822',
          email: 'meta.violeta@dak.co.id',
          account_type: 'hrd',
          name: 'Meta Violeta',
          address: 'Jl. Cikutra No. 1',
          description: 'HRD',
          started_work_at: '2018-12-07',
          profile_picture: 'public/images/default.png',
          device_tracker: false,
          can_wfh: true,
          deleted: false,
          created_by: 1,
          updated_by: 1,
          deleted_by: null,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          user_code: '12.001',
          username: 'ari',
          password: await bcrypt.hash('rahasia', saltRounds),
          token: null,
          email: 'ari@dak.co.id',
          phone_number: '6283822658411',
          account_type: 'karyawan',
          name: 'Ari Ardiansyah',
          address: 'Jl. Rancakasiat',
          description: 'Fullstack Programmer',
          started_work_at: '2018-12-07',
          profile_picture: 'public/images/default.png',
          device_tracker: false,
          can_wfh: true,
          deleted: false,
          created_by: 1,
          updated_by: 1,
          deleted_by: null,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          user_code: '12.002',
          username: 'kinfjr',
          password: await bcrypt.hash('rahasia', saltRounds),
          token: null,
          email: 'kinfjr@dak.co.id',
          account_type: 'karyawan',
          name: 'Rizky Nugraha',
          phone_number: '6283822658422',
          address: 'Cililin',
          description: 'Fullstack Programmer',
          started_work_at: '2021-03-07',
          profile_picture: 'public/images/default.png',
          device_tracker: false,
          can_wfh: true,
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

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('user', null, {
      truncate: true,
    });
  }
};
