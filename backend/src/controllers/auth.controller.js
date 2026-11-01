const { registerUser, loginUser } = require("../services/auth.service");

async function register(req, res) {
  const user = await registerUser(req.body);

  return res.status(201).json({
    success: true,
    message: "User registered successfully",
    data: user,
  });
}

async function login(req, res) {
  const result = await loginUser(req.body);

  return res.status(200).json({
    success: true,
    message: "Login successful",
    data: result,
  });
}

module.exports = { register, login };