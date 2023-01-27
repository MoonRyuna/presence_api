'use strict';
const { QueryTypes } = require('sequelize');
const db = require('../models');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const config = await db.sequelize.query("SELECT * FROM office_config LIMIT 1", { type: QueryTypes.SELECT })
    
    if(config.length === 0) {
      await queryInterface.bulkInsert('office_config', [
        {
          name: 'PT. Digital Amore Kriyanesi',
          theme: 'default',
          logo: 'images/default-logo.png',
          latitude:  -7.01137531169352,
          longitude: 107.55235349704994,
          radius: 2,
          amount_of_annual_leave: 12,
          work_schedule: '08:00 - 17:00',
          updated_by: 1,  // admin
          updatedAt: new Date()
        }
      ])
    }else {
      await queryInterface.bulkUpdate('office_config', [
        {
          name: 'PT. Digital Amore Kriyanesi',
          theme: 'default',
          logo: 'images/default-logo.png',
          latitude:  -7.01137531169352,
          longitude: 107.55235349704994,
          radius: 2,
          amount_of_annual_leave: 12,
          work_schedule: '08:00 - 17:00',
          updated_by: 1,  // admin
          updatedAt: new Date()
        }
      ])
    }
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('office_config', null, {
      truncate: true,
    });
  }
};
