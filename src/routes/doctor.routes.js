const router = require('express').Router();
const ctrl = require('../controllers/doctor.controller');
const validate = require('../middleware/validate');
const validateId = require('../middleware/validateId');
const {
  doctorSchema,
  doctorQuerySchema,
  patientQuerySchema,
  patientNestedCreateSchema,
} = require('../validators/schemas');

router.get('/', validate(doctorQuerySchema, 'query'), ctrl.list);
router.post('/', validate(doctorSchema), ctrl.create);
router.get('/filters', ctrl.filters); // must stay above "/:id"

router.get('/:id', validateId('id'), ctrl.getOne);
router.put('/:id', validateId('id'), validate(doctorSchema), ctrl.update);
router.delete('/:id', validateId('id'), ctrl.remove);

router.get('/:id/patients', validateId('id'), validate(patientQuerySchema, 'query'), ctrl.listPatients);
router.post('/:id/patients', validateId('id'), validate(patientNestedCreateSchema), ctrl.addPatient);
router.delete('/:id/patients/:patientId', validateId('id', 'patientId'), ctrl.removePatient);

module.exports = router;
