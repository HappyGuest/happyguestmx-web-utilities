'use strict';

const   activityLogHandler = require('./src/activityLogHandler'),
        assetsHandler = require('./src/assetsHandler'),
        common = require('./src/common'),
        errorsHandler = require('./src/errorsHandler'),
        paramsHandler = require('./src/paramsHandler'),
        response = require('./src/response'),
        userHandler = require('./src/userHandler');

module.exports = {
    activityLogHandler,
    assetsHandler,
    common,
    errorsHandler,
    paramsHandler,
    response,
    userHandler
}