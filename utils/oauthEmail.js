const nodemailer = require("nodemailer");
const { google } = require("googleapis");
const emailOAuth2 = google.auth.OAuth2;

const emailOAuth2Client = new emailOAuth2(
  process.env.EMAIL_OAUTH_CLIENT_ID,
  process.env.EMAIL_OAUTH_CLIENT_SECRET,
  "https://developers.google.com/oauthplayground"
);

emailOAuth2Client.setCredentials({
  refresh_token: process.env.EMAIL_OAUTH_CLIENT_REFRESH_TOKEN,
});

const emailAccessToken = emailOAuth2Client.getAccessToken();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    type: "OAuth2",
    user: process.env.EMAIL,
    clientId: process.env.EMAIL_OAUTH_CLIENT_ID,
    clientSecret: process.env.EMAIL_OAUTH_CLIENT_SECRET,
    refreshToken: process.env.EMAIL_OAUTH_CLIENT_REFRESH_TOKEN,
    accessToken: emailAccessToken,
  },
});

module.exports = transporter;
