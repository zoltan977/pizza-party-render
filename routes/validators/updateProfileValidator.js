const updateProfileValidator = (value, { req }) => {
  const userFile = req?.files?.userfile;

  const data = JSON.parse(req.body.data);

  if (!data.name && !userFile) throw new Error("Nincsenek módosított adatok!");

  return true;
};

module.exports = updateProfileValidator;
