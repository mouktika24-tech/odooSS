const { body, validationResult } = require('express-validator');

const emailRules = (fieldName = 'email') => [
  body(fieldName)
    .trim()
    .normalizeEmail({ gmail_remove_dots: false, all_lowercase: true })
    .isEmail()
    .withMessage('Please provide a valid corporate email address'),
];

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const firstError = errors.array({ onlyFirstError: true })[0];

    return res.status(400).json({
      message: firstError.msg,
      errors: errors.mapped(),
    });
  }

  return next();
};

const passwordRules = (fieldName = 'password', minLength = 8) => [
  body(fieldName)
    .isLength({ min: minLength })
    .withMessage(`Password must be at least ${minLength} characters long`),
];

module.exports = {
  emailRules,
  passwordRules,
  validateRequest,
  body,
};
