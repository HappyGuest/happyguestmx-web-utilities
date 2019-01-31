'use strict';

/*!
 * This module helps with proxy response in happyguest project
 * 0.2
 */

function buildResponse(statusCode, body) {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': true
        },
        body: JSON.stringify(body),
        isBase64Encoded: false
    };
};

function success(body) {
    return buildResponse(200, body);
};

function badRequest(body) {
    return buildResponse(400, body.toString());
};

function notFound(body) {
    return buildResponse(404, body);
};

function failure(body) {
    return buildResponse(500, body);
};

module.exports = {
    success,
    badRequest,
    notFound,
    failure
}