const { hashPassword } = require('./utils/bcrypt');

async function generateHashedPassword() {
    try {
        const hashedPassword = await hashPassword('8888');
        console.log('Mật khẩu đã băm:', hashedPassword);
        return hashedPassword;
    } catch (error) {
        console.error('Lỗi khi băm mật khẩu:', error);
    }
}

generateHashedPassword();