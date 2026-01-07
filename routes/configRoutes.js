const express= require('express');
const router= express.Router();
const ConfigController= require('../controller/configController');
const {authenticate}= require('../middlewares/auth');

router.use(authenticate);

router.get('/config/:configId', ConfigController.getConfigById);

router.get('/config/name/:tenChiSo', ConfigController.getConfigByName);

router.get('/configs', ConfigController.getAllConfigs);

module.exports = router;