'use strict';

/*!
 * This module helps to handle params received through API GATEWAY
 * 0.4
 */

async function requestHandler(event) {
  try {
    if(event) {
    
      let params;
      const httpMethod = event.httpMethod;
      const sourceIp = event.requestContext.identity.sourceIp;

      switch (httpMethod) {
        case 'GET':
          params = event.queryStringParameters;
          break;
        case 'POST':
          params = event.body;
          break;
        case 'PUT':
          params = event.body;
          break;
        case 'DELETE':
          params = event.body;
          break;
        default:
          params = {};
      }

      if (!isEmpty(params)) {
        //parsing parameters if its required
        if (typeof params === 'string') params = JSON.parse(params);

        //getting params by method
        switch (httpMethod) {
          case 'GET':
            if (notUndefined(params.query)) {
              if (typeof params.query === 'string') params.query = JSON.parse(params.query);
            }
            break;
          case 'POST':
            params = params.params;
            break;
          case 'PUT':
            params = params.params;
            break;
          case 'DELETE':
            params = params.params;
            break;
          default:
            params = {};
        }

        const response = {
          headers: event.headers,
          params,
          sourceIp,
        };
        return response;
      } 
      else 
        throw 'One or more parameter values were invalid: An AttributeValue may not contain an empty string';
    }
    else throw 'event is required';
  }
  catch(err) {
    throw(err);
  }
};

function isEmpty(obj) {
  for(var key in obj) {
    if(obj.hasOwnProperty(key))
      return false;
  }
  return true;
}

function notUndefined(val) {
  return (val!==null && val!==undefined && val!=="");
}

module.exports = {
  requestHandler
}