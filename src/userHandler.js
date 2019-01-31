'use strict';
//ver 0.10 async await
const AWS = require('aws-sdk'),
  env = process.env;

AWS.config.update({
  region: env.REGION
});
const cognito = new AWS.CognitoIdentityServiceProvider(),
  dynamodbDocumentClient = new AWS.DynamoDB.DocumentClient();

var forbidden_error = {
  "message": "Access denied.",
  "code": "ValidationException",
  "statusCode": 403
};

var not_found_error = {
  "message": "Resource not found",
  "code": "ValidationException",
  "statusCode": 404
};

async function getUserFromJWT(AccessToken) {
  try {
    let user = await cognito.getUser({
      AccessToken
    }).promise()
    const sub = user["UserAttributes"][0].Value;
    user = await findUserInDB(sub);
    return user;
  } catch (err) {
    throw (err);
  }
};

async function getCognitoUser(AccessToken) {
  try {
    let user = await cognito.getUser({
      AccessToken
    }).promise();
    return user;
  } catch (err) {
    throw (err);
  }
};

async function findUserInDB(sub) {
  try {
    let res = await finUserInAdminUsers(sub);
    if (res.Count > 0) return res.Items[0];
    else {
      res = await finUserInStaffUsers(sub);
      if (res.Count > 0) return res.Items[0];
      else throw 'User does not exist';
    }
  } catch (err) {
    throw (err);
  }
};

async function finUserInAdminUsers(sub) {
  try {
    const params = {
      TableName: env.DDB_ADMIN_USERS_TABLE,
      FilterExpression: '#uuid = :uuid',
      ExpressionAttributeNames: {
        '#uuid': 'uuid'
      },
      ExpressionAttributeValues: {
        ':uuid': sub
      }
    };
    console.log('params: ', params);
    const res = await dynamodbDocumentClient.scan(params).promise();
    return res;
  } catch (err) {
    throw (err);
  }
};

async function finUserInStaffUsers(sub) {
  try {
    let params = {
      TableName: env.DDB_STAFF_USERS_TABLE,
      FilterExpression: '#uuid = :uuid',
      ExpressionAttributeNames: {
        '#uuid': 'uuid'
      },
      ExpressionAttributeValues: {
        ':uuid': sub
      }
    };
    const res = await dynamodbDocumentClient.scan(params).promise();
    return res;
  } catch (err) {
    throw (err);
  }
};


async function permissionsValidate(user, level, company_uuid = undefined, hotel_uuid = undefined) {
  try {
    let res;
    switch (user.role_key) {
      case "HG_admin":
        return "forward as HG_admin";
        break;
      case "CO_admin":
        if (level === "company") {
          res = await validateAdminActionAsAdmin(user.company_uuid, company_uuid);
          return res;
        } else if (level == "hotel") {
          res = await validateHotelActionAsAdmin(user.company_uuid, hotel_uuid);
          return 'forward';
        }
        break;
      case "CO_manager":
        if (level === "company") reject(forbidden_error);
        else {
          res = await validateHotelActionAsManager(user.uuid, hotel_uuid);
          return 'forward';
        }
        break;
    }
  } catch (err) {
    throw (err);
  }
};

async function validateAdminActionAsAdmin(user_company_uuid, company_uuid) {
  try {
    if (user_company_uuid === company_uuid) return "forward";
    else throw 'Access denied';
  } catch (err) {
    throw (err);
  }
};

async function validateHotelActionAsAdmin(user_company_uuid, hotel_uuid) {
  try {
    const hotel = await getDDBHotel(hotel_uuid);
    if (hotel.company_uuid === user_company_uuid) return ("forward");
    else throw 'Access denied';
  } catch (err) {
    throw (err);
  }
};

async function validateHotelActionAsManager(user_uuid, hotel_uuid) {
  try {
    const hotels = await getManagerHotels(user_uuid)
    if (hotels.includes(hotel_uuid)) return ("forward");
    else throw 'Access denied';
  } catch (err) {
    throw (err);
  }
}

async function getDDBHotel(hotel_uuid) {
  try {
    const params = {
      TableName: env.DDB_HOTELS_TABLE,
      FilterExpression: '#uuid = :uuid',
      ExpressionAttributeValues: {
        ':uuid': hotel_uuid
      },
      ExpressionAttributeNames: {
        '#uuid': 'uuid'
      }
    };
    const res = await dynamodbDocumentClient.scan(params).promise();
    if (res.Count > 0) return (res.Items[0]);
    else throw ('Hotel not found');
  } catch (err) {
    throw (err);
  }
}

async function getManagerHotels(user_uuid) {
  try {
    let params = {
      TableName: env.DDB_HOTELS_USERS,
      ProjectionExpression: 'hotel_uuid',
      FilterExpression: '#user_uuid = :user_uuid',
      ExpressionAttributeValues: {
        ':user_uuid': user_uuid
      },
      ExpressionAttributeNames: {
        '#user_uuid': 'user_uuid'
      }
    };
    const res = await dynamodbDocumentClient.scan(params).promise();
    if (res.Count > 0) {
      hotels = [];
      for (const hotel of res.Items) {
        hotels.push(hotel.hotel_uuid);
      }
      return hotels;
    } else throw ('Items not found');
  } catch (err) {
    throw (err);
  }
}


module.exports = {
  getUserFromJWT,
  getCognitoUser,
  findUserInDB,
  permissionsValidate
}