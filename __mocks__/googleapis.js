let response;

const setResponse = (id_token) => {
  response = Promise.resolve({
    tokens: {
      id_token,
      access_token: "dummy",
    },
  });
};

const googleapis = {
  setResponse,
  google: {
    auth: {
      OAuth2: function () {
        this.getToken = function () {
          return response;
        };
        this.generateAuthUrl = function () {
          return "http://mock_auth_url";
        };
      },
    },
  },
};

module.exports = googleapis;
