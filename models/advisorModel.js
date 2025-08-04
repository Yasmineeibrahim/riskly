import mongoose from "mongoose";
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

// Sequelize model for MySQL
export const AdvisorSQL = sequelize.define('Advisor', {
  _id: {
    type: DataTypes.STRING(24),
    primaryKey: true,
    allowNull: false
  },
  Email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true
  },
  Password: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  advisor_name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  Students: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  tableName: 'advisors',
  timestamps: false
});
