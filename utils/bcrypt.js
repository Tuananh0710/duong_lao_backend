// utils/bcrypt.js - VERSION FIXED WITH DEBUG
const bcrypt = require('bcryptjs');

const hashPassword = async (password) => {
  try {
    console.log('[hashPassword] Hashing password');
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    console.log('[hashPassword] Hash created:', hash.substring(0, 30) + '...');
    return hash;
  } catch (error) {
    console.error('[hashPassword] Error:', error);
    throw error;
  }
};

const comparePassword = async (password, hashedPassword) => {
  try {
    
    if (!hashedPassword) {
      console.error('[comparePassword] Hashed password is null or undefined');
      return false;
    }
    
    const result = await bcrypt.compare(password, hashedPassword);
    console.log('[comparePassword] Result:', result);
    
    return result;
  } catch (error) {
    console.error('[comparePassword] Error:', error);
    return false;
  }
};

module.exports = {
  hashPassword,
  comparePassword
};