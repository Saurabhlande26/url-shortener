const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const AppDataSource = require("../config/database");
const userRepository = AppDataSource.getRepository("User");

async function registerUser({ email, password }) {
  if (!email || !password) throw new Error("Email and password are required");
  if (password.length < 8)
    throw new Error("Password must be at least 8 characters");

  const existingUser = await userRepository.findOne({ where: { email } });
  if (existingUser) throw new Error("User already exists");

  const passwordHash = await bcrypt.hash(password, 12);

  const user = userRepository.create({ email, passwordHash });
  const savedUser = await userRepository.save(user);

  return {
    id: savedUser.id,
    email: savedUser.email,
  };
}

async function loginUser({ email, password }) {
  const user = await userRepository.findOne({ where: { email } });
  if (!user) throw new Error("Invalid email or password");

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) throw new Error("Invalid email or password");

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "1d",
  });

  return {
    user: {
      id: user.id,
      email: user.email,
    },
    token,
  };
}

module.exports = { registerUser, loginUser };
