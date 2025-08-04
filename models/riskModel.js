import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Risk = sequelize.define('Risk', {
  StudentID: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false
  },
  DropoutRisk: {
    type: DataTypes.TINYINT(1),
    allowNull: false
  },
  UnderperformRisk: {
    type: DataTypes.TINYINT(1),
    allowNull: false
  }
}, {
  tableName: 'risks',
  timestamps: false // Disable createdAt and updatedAt
});

export default Risk; 