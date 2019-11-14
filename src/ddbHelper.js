'use strict';

/*!
 * This module helps with dynamodb in happyguest project
 */

const AWS = require('aws-sdk'),
    Joi = require('joi'),
    env = process.env;

AWS.config.update({
  region: env.REGION
});

const dynamodbDocumentClient = new AWS.DynamoDB.DocumentClient();

/*
 * this function invoke a recursive query or scan dynamodb method
 */
async function recursiveQuery(params, method) {
  try {
    await validateRecursiveQueryParams(params, method);
    let response = {
      Items: [],
      Count: 0
    };
    do {
      var data = await dynamodbDocumentClient[method](params).promise();       
      response.Items = data.Items ? response.Items.concat(data.Items) : response.Items.concat([]);
      response.Count = data.Count ? response.Count += data.Count : 0
      params.ExclusiveStartKey = data ? data.LastEvaluatedKey : undefined;
    } while (data && typeof data.LastEvaluatedKey != "undefined");
    return response;
  }
  catch(err) {
    throw(err);
  }
}

async function validateRecursiveQueryParams(params, method) {
  try {
      const schema = Joi.object().keys({
          params: Joi.object().required(),
          method: Joi.string().valid('query', 'scan').required()
      });
      const result = Joi.validate({ params, method }, schema);
      if (result.err) throw (result.err);
      else return result;
  } catch (err) {
      throw (err);
  }
}

module.exports = {
  recursiveQuery
}