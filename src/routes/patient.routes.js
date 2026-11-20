const router = require('express').Router();
const ctrl = require('../controllers/patient.controller');
const validate = require('../middleware/validate');
const validateId = require('../middleware/validateId');
const { patientCreateSchema, patientUpdateSchema, patientQuerySchema } = require('../validators/schemas');

router.get('/', validate(patientQuerySchema, 'query'), ctrl.listPatients);
router.post('/', validate(patientCreateSchema), ctrl.create);
router.get('/:id', validateId('id'), ctrl.getOne);
router.put('/:id', validateId('id'), validate(patientUpdateSchema), ctrl.update);
router.delete('/:id', validateId('id'), ctrl.remove);

module.exports = router;
