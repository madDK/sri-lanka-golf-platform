const bcrypt = require('bcryptjs');
const { dbQuery } = require('./database');

async function resetPasswords() {
  console.log('Resetting passwords to "password123" for admin@connectbiz.com and gg@maIL.COM...');
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    await dbQuery.run('UPDATE users SET password = ? WHERE email = ?', [hashedPassword, 'admin@connectbiz.com']);
    await dbQuery.run('UPDATE users SET password = ? WHERE email = ?', [hashedPassword, 'gg@maIL.COM']);

    console.log('✓ Passwords updated successfully!');
  } catch (err) {
    console.error('Password reset failed:', err.message);
  }
  process.exit(0);
}

resetPasswords();
