const jwt = require("jsonwebtoken");

const createToken = (user, access_token = null) => {
  const payload = {
    user: {
      name: user.name,
      email: user.email,
      photo: user.photo,
    },
  };

  if (access_token) payload.user.access_token = access_token;

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: 3600,
  });

  return token;
};

module.exports = createToken;
