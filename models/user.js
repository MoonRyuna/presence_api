'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class user extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      this.hasMany(models.presence, {
        foreignKey: 'user_id',
        as: 'presences'
      })
      this.hasMany(models.absence, {
        foreignKey: 'user_id',
        as: 'absences'
      })
      this.hasMany(models.overtime, {
        foreignKey: 'user_id',
        as: 'overtimes'
      })
    }
  }
  
  user.init({
    user_code: DataTypes.TEXT,
    username: DataTypes.TEXT,
    password: DataTypes.TEXT,
    token: DataTypes.TEXT,
    email: DataTypes.TEXT,
    account_type: DataTypes.TEXT,
    name: DataTypes.TEXT,
    address: DataTypes.TEXT,
    description: DataTypes.TEXT,
    started_work_at: DataTypes.DATE,
    profile_picture: DataTypes.TEXT,
    device_tracker: DataTypes.BOOLEAN,
    imei: DataTypes.TEXT,
    device_uid: DataTypes.TEXT,
    deleted: DataTypes.BOOLEAN,
    created_by: DataTypes.BIGINT,
    updated_by: DataTypes.BIGINT,
    deleted_by: DataTypes.BIGINT,
    deletedAt: DataTypes.DATE,
  }, {
    sequelize,
    modelName: 'user',
    freezeTableName: true,
  });
  return user;
};