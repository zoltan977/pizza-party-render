module.exports = (err, req, res, next) => {
  if (err.status) {
    if (err.msg && err.data)
      return res.status(err.status).json({ msg: err.msg, data: err.data });
    if (err.msg) return res.status(err.status).json({ msg: err.msg });
    if (err.error) return res.status(err.status).json({ error: err.error });
    if (err.errors) return res.status(err.status).json({ errors: err.errors });
  } else {
    console.error(err);
    return res.status(500).json({ msg: "Internal Server Error" });
  }
};
