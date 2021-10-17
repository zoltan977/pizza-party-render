const User = require("../models/User");
const bcrypt = require("bcryptjs");
const { randomBytes } = require("crypto");
const nodemailer = require("nodemailer");
const createToken = require("../utils/createToken");
const oauth2Client = require("../utils/oauth2Client")();
const jwt = require("jsonwebtoken");
const settings = require("../settings");
const { validateImage } = require("../utils/validateImage");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWORD,
  },
});

exports.nameChange = async ({ newName }, user) => {
  const userInDatabase = await User.findOne({ email: user.email });

  if (!userInDatabase) throw { status: 400, msg: "user not exists" };

  try {
    userInDatabase.name = newName;
    await userInDatabase.save();
  } catch (error) {
    throw { status: 400, msg: "save user error" };
  }

  return { success: true };
};

exports.login = async (loginData) => {
  const { email, password } = loginData;

  const user = await User.findOne({ email });

  if (!user) {
    throw { status: 400, msg: "Hibás email vagy jelszó" };
  }

  if (user.confirmation) {
    const date = Date.now();
    const confirmDate = Date.parse(user.confirmation.date);

    //More than 5 minutes has passed since registration
    //User will be deleted
    if (date - confirmDate > 300000) {
      await user.delete();
      throw { status: 400, msg: "Újra regisztrálnod kell!" };
    }

    throw {
      status: 400,
      msg: "Meg kell erősítened az emailben kapott linken a regisztrációt!",
    };
  }

  if (!user.password) {
    throw {
      status: 400,
      msg: "Nincs jelszó. Valószínű google-al regisztráltál. Elfelejtett jelszó linken tudsz kérni jelszót ehhez az email címhez is",
    };
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    throw { status: 400, msg: "Hibás email vagy jelszó" };
  }

  const token = createToken(user);

  return { token };
};

exports.reset = async (postedData) => {
  const { email } = postedData;
  const user = await User.findOne({ email });
  if (!user)
    throw { status: 400, msg: "Ezzel az email címmel nincs felhasználó!" };

  const buf = randomBytes(256);

  user.reset = {
    code: buf.toString("hex"),
    date: new Date(),
  };

  await user.save();

  // send mail with defined transport object
  await transporter.sendMail({
    from: `"Admin" ${process.env.email}`, // sender address
    to: user.email, // list of receivers
    subject: "Jelszó változtatás", // Subject line
    html: `<p>Jelszóváltoztatáshoz kattints <a href="http://localhost:3000/password_reset?code=${buf.toString(
      "hex"
    )}&email=${user.email}">erre</a> a linkre!</p>`, // html body
  });

  return { success: true };
};

exports.password = async (postedData) => {
  const { email, code, password } = postedData;

  const user = await User.findOne({ email });
  if (!user) throw { status: 400, msg: "Nincs felhasználó ezzel az email-el!" };

  if (!user.reset)
    throw {
      status: 400,
      msg: "Ezzel az email címmel nem kértek jelszóváltoztatást!",
    };

  const date = Date.now();
  const resetDate = Date.parse(user.reset.date);

  if (user.reset.code !== code)
    throw { status: 400, msg: "A gernerált kódok nem egyeznek!" };

  //More than five minutes has passed since the password change request
  //User.reset object will be deleted
  if (date - resetDate > 300000) {
    user.reset = undefined;
    await user.save();

    throw {
      status: 400,
      msg: "Több min öt perce telt el a jelszóváltoztatási kérés óta!",
    };
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  user.reset = undefined;
  user.password = hashedPassword;
  await user.save();

  return { success: true };
};

exports.confirm = async (postedData) => {
  const { code, email } = postedData;

  const user = await User.findOne({ email });
  if (!user)
    throw { status: 400, msg: "Nincs felhasználó ezzel az email címmel!" };

  if (!user.confirmation)
    throw {
      status: 400,
      msg: "Ezzel az email címmel nincs megerősítésre váró felhasználó!",
    };

  const date = Date.now();
  const confirmDate = Date.parse(user.confirmation.date);

  if (user.confirmation.code !== code) {
    await user.delete();
    throw { status: 400, msg: "Generált kódok nem egyeznek!" };
  }

  //More than 5 minutes has passed since the confirmation email was sent
  //So the user will be deleted
  if (date - confirmDate > 300000) {
    await user.delete();
    throw {
      status: 400,
      msg: "Több mint öt perc telt el a regisztráció óta!",
    };
  }

  user.confirmation = undefined;
  const savedUser = await user.save();
  const token = createToken(savedUser);
  return { token };
};

exports.register = async (registrationData) => {
  const { name, email, password } = registrationData;

  const user = await User.findOne({ email });

  if (user) {
    throw {
      status: 400,
      msg: "Ezzel az email címmel már létezik felhasználó!",
    };
  }

  try {
    const newUser = new User({ name, email, password });
    const salt = await bcrypt.genSalt(10);
    newUser.password = await bcrypt.hash(password, salt);
    const buf = randomBytes(256);
    newUser.confirmation = {
      code: buf.toString("hex"),
      date: new Date(),
    };

    const savedUser = await newUser.save();

    //Sending confirmation email
    await transporter.sendMail({
      from: `"Admin" ${process.env.EMAIL}`, // sender address
      to: savedUser.email, // list of receivers
      subject: "Regisztráció megerősítés", // Subject line
      html: `<p>A regisztráció megerősítéséhez kattints <a href="http://localhost:3000/confirm?code=${buf.toString(
        "hex"
      )}&email=${savedUser.email}">erre</a> a linkre!</p>`,
    });
  } catch (error) {
    console.log("Error creating user: ", error);
    throw { status: 400, msg: "Felhasználó létrehozási hiba!" };
  }

  return { success: true };
};

exports.google = async (postedData) => {
  const { code } = postedData;

  let tokens;
  let result;
  try {
    result = await oauth2Client.getToken(code);
    tokens = result.tokens;
  } catch (err) {
    console.error(err.response.data);
    throw { message: "Hiba a token kéréskor!", status: 400 };
  }

  const {
    email_verified,
    email,
    name,
    picture: photo,
  } = jwt.decode(tokens.id_token);

  if (!email_verified)
    throw { status: 400, msg: "Email not verified at google!" };

  let user = await User.findOne({ email: email });

  //If the user exists already then the google image will be added to it
  //else new user will be created
  if (user) {
    if (!user.photo || user.photo === "no-image.png") {
      user.photo = photo;
      await user.save();
    }
  } else {
    const newUser = new User({ email, name, photo });
    user = await newUser.save();
  }

  //If the user is waiting for confirmation then after the google registration
  //confirmation will be deleted
  if (user.confirmation) {
    user.confirmation = undefined;
    await user.save();
  }

  const token = createToken(user, tokens.access_token);

  return { token };
};

exports.updateProfile = async (postedData, user, userFile) => {
  const filter = { email: user.email };
  const update = { ...JSON.parse(postedData.data) };

  if (userFile) {
    if (!validateImage(userFile)) {
      throw { msg: "Image size or format is not correct", status: 400 };
    }

    const uploadPath = settings.PROJECT_DIR + "/public/photos/" + user.email;
    try {
      userFile.mv(uploadPath);
      update.photo = "photos/" + user.email;
    } catch (error) {
      throw { msg: "Image saving error", status: 400 };
    }
  }

  const updatedUser = await User.findOneAndUpdate(filter, update, {
    new: true,
    upsert: true,
  });

  return {
    name: updatedUser.name,
    photo: updatedUser.photo,
    email: updatedUser.email,
  };
};
