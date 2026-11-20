const router = require('express').Router();
const ctrl = require('../controllers/dashboard.controller');
const validate = require('../middleware/validate');
const { dashboardQuerySchema } = require('../validators/schemas');

router.get('/', validate(dashboardQuerySchema, 'query'), ctrl.getStats);

module.exports = router;
