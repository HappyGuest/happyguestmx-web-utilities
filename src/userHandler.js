'use strict';

const AWS = require('aws-sdk'),
  env = process.env;

AWS.config.update({
  region: env.REGION
});
const cognito = new AWS.CognitoIdentityServiceProvider(),
  dynamodbDocumentClient = new AWS.DynamoDB.DocumentClient();

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
    const concierge = await findUserInConciergeUsers(sub);
    if (concierge.Count > 0) return concierge.Items[0];
    const admin = await findUserInAdminUsers(sub);
    if (admin.Count > 0) return admin.Items[0];
    const co_staff = await findUserInCoStaffUsers(sub);
    if (co_staff.Count > 0) return co_staff.Items[0];
    const staff = await findUserInStaffUsers(sub);
    if (staff.Count > 0) return staff.Items[0];

    if (concierge.Count === 0 &&
      admin.Count === 0 &&
      co_staff.Count === 0 &&
      staff.Count === 0) throw 'User does not exist';

  } catch (err) {
    throw (err);
  }
};

async function findUserInAdminUsers(uuid, fields = []) {
  try {
    let params = {
      TableName: env.DDB_ADMIN_USERS_TABLE,
      ProjectionExpression: 'company_uuid, #name, email,employee_number,#uuid, #status, last_name, role_key, enabled, hotel_uuids, locale, notifications',
      IndexName: 'uuid-index',
      KeyConditionExpression: '#uuid = :uuid',
      ExpressionAttributeValues: {
        ':uuid': uuid
      },
      ExpressionAttributeNames: {
        '#uuid': 'uuid',
        '#name': 'name',
        '#status': 'status'
      }
    };
    if (fields.length > 0) {
      params = await pushParamstoObject(fields, params);
    }
    const res = await dynamodbDocumentClient.query(params).promise();
    return res;
  } catch (err) {
    throw (err);
  }
};

async function findUserInStaffUsers(sub) {
  try {
    const params = {
      TableName: env.DDB_STAFF_USERS_TABLE,
      ProjectionExpression: '#name, email, #uuid, #status, last_name, role_key, enabled, locale, notifications',
      KeyConditionExpression: '#uuid = :uuid',
      ExpressionAttributeNames: {
        '#uuid': 'uuid',
        '#name': 'name',
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':uuid': sub
      }
    };
    return await dynamodbDocumentClient.query(params).promise();
  } catch (err) {
    throw (err);
  }
};

async function findUserInCoStaffUsers(sub) {
  try {
    const params = {
      TableName: env.DDB_CO_STAFF_USERS_TABLE,
      ProjectionExpression: 'company_uuid, #name,employee_number,email, #uuid, #status, last_name, role_key, enabled, hotel_uuid, locale, notifications',
      KeyConditionExpression: '#uuid = :uuid',
      IndexName: 'uuid-index',
      ExpressionAttributeNames: {
        '#uuid': 'uuid',
        '#name': 'name',
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':uuid': sub
      }
    };
    return await dynamodbDocumentClient.query(params).promise();
  } catch (err) {
    throw (err);
  }
};

async function findUserInConciergeUsers(sub) {
  try {
    const params = {
      TableName: env.DDB_HOTEL_CONCIERGES,
      ProjectionExpression: 'company_uuid,employee_number, #name, email, #uuid, #status, last_name, role_key, enabled, hotel_uuid, locale, notifications',
      KeyConditionExpression: '#uuid = :uuid',
      IndexName: 'uuid-index',
      ExpressionAttributeNames: {
        '#uuid': 'uuid',
        '#name': 'name',
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':uuid': sub
      }
    };
    return await dynamodbDocumentClient.query(params).promise();
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
        if (level === "company") throw 'Access denied';
        else {
          res = await validateHotelActionAsManager(user, hotel_uuid);
          return 'forward';
        }
        break;
      default:
        throw 'Access denied'
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

async function validateHotelActionAsManager(user, hotel_uuid) {
  try {
    if (user.hotel_uuids.includes(hotel_uuid)) return ("forward");
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
    let hotels = [];
    let params = {
      TableName: env.DDB_HOTELS_USERS,
      ProjectionExpression: 'hotel_uuid',
      KeyConditionExpression: '#user_uuid = :user_uuid',
      IndexName: 'user_uuid-index',
      ExpressionAttributeValues: {
        ':user_uuid': user_uuid
      },
      ExpressionAttributeNames: {
        '#user_uuid': 'user_uuid'
      }
    };
    const res = await dynamodbDocumentClient.query(params).promise();
    for (const hotel of res.Items) {
      hotels.push(hotel.hotel_uuid);
    }
    return hotels;
  } catch (err) {
    throw (err);
  }
}

async function cognitoAttributesToJson(arr) {
  try {
    let obj = {}
    for (const item of arr) obj[item.Name] = item.Value
    return obj
  } catch (err) {
    throw (err);
  }
}

async function findUserByEmail(email) {
  try {
    const concierge = await findConciergeByEmail(email);
    if (concierge.Count > 0) return concierge.Items[0];
    const admin = await findAdminUserByEmail(email);
    if (admin.Count > 0) return admin.Items[0];
    const co_staff = await findCoStaffUserByEmail(email);
    if (co_staff.Count > 0) return co_staff.Items[0];
    const staff = await findStaffUserByEmail(email);
    if (staff.Count > 0) return staff.Items[0];

    if (concierge.Count === 0 &&
      admin.Count === 0 &&
      co_staff.Count === 0 &&
      staff.Count === 0) throw 'User does not exist';
  } catch (err) {
    throw (err);
  }
}

async function findAdminUserByEmail(email) {
  try {
    const params = {
      TableName: env.DDB_ADMIN_USERS_TABLE,
      ProjectionExpression: 'company_uuid, #name, email, #uuid, #status, last_name, role_key, enabled, hotel_uuids, locale, notifications',
      KeyConditionExpression: 'email = :email',
      IndexName: 'email-index',
      ExpressionAttributeValues: {
        ':email': email
      },
      ExpressionAttributeNames: {
        '#uuid': 'uuid',
        '#name': 'name',
        '#status': 'status'
      }
    };
    const res = await dynamodbDocumentClient.query(params).promise();
    if (res.Count > 0 && res.Items[0].role_key === 'CO_manager') {
      res.Items[0].hotels = await getManagerHotels(res.Items[0].uuid);
    }
    return res;
  } catch (err) {
    throw (err);
  }
}

async function findStaffUserByEmail(email) {
  try {
    const params = {
      TableName: env.DDB_STAFF_USERS_TABLE,
      ProjectionExpression: '#name, email,employee_number, #uuid, #status, last_name, role_key, enabled, locale, notifications',
      KeyConditionExpression: 'email = :email',
      IndexName: 'email-index',
      ExpressionAttributeValues: {
        ':email': email
      },
      ExpressionAttributeNames: {
        '#uuid': 'uuid',
        '#name': 'name',
        '#status': 'status'
      }
    };
    const res = await dynamodbDocumentClient.query(params).promise();
    return res;
  } catch (err) {
    throw (err);
  }
}

async function findCoStaffUserByEmail(email) {
  try {
    const params = {
      TableName: env.DDB_CO_STAFF_USERS_TABLE,
      ProjectionExpression: 'company_uuid, #name, email, #uuid, #status, last_name, role_key, enabled, hotel_uuids, locale, notifications',
      KeyConditionExpression: 'email = :email',
      IndexName: 'email-index',
      ExpressionAttributeValues: {
        ':email': email,
      },
      ExpressionAttributeNames: {
        '#uuid': 'uuid',
        '#name': 'name',
        '#status': 'status'
      }
    };
    const res = await dynamodbDocumentClient.query(params).promise();
    return res;
  } catch (err) {
    throw (err);
  }
}

async function findConciergeByEmail(email) {
  try {
    const params = {
      TableName: env.DDB_HOTEL_CONCIERGES,
      ProjectionExpression: 'company_uuid, #name, email, #uuid, #status, last_name, role_key, enabled, hotel_uuid, locale, notifications',
      KeyConditionExpression: 'email = :email',
      IndexName: 'email-index',
      ExpressionAttributeValues: {
        ':email': email
      },
      ExpressionAttributeNames: {
        '#uuid': 'uuid',
        '#name': 'name',
        '#status': 'status'
      }
    };
    const res = await dynamodbDocumentClient.query(params).promise();
    return res;
  } catch (err) {
    throw (err);
  }
}

async function findUserByEmployeeNumber(employee_number) {
  try {
    const concierge = await findConciergeByEmplNumber(employee_number);
    if (concierge.Count > 0) return concierge.Items[0];
    const co_staff = await findCoStaffUserByEmplNumber(employee_number);
    if (co_staff.Count > 0) return co_staff.Items[0];
    const admin = await findAdminUserByEmplNumber(employee_number);
    if (admin.Count > 0) return admin.Items[0];
    const staff = await findStaffUserByEmplNumber(employee_number);
    if (staff.Count > 0) return staff.Items[0];

    if (concierge.Count === 0 &&
      admin.Count === 0 &&
      co_staff.Count === 0 &&
      staff.Count === 0) throw 'User does not exist';
  } catch (err) {
    throw (err);
  }
}

async function findConciergeByEmplNumber(employee_number) {
  try {
    const params = {
      TableName: env.DDB_HOTEL_CONCIERGES,
      ProjectionExpression: 'company_uuid, #name, email, #uuid, #status, last_name, role_key, enabled, hotel_uuid, locale, notifications',
      KeyConditionExpression: 'employee_number = :employee_number',
      IndexName: 'employee_number-index',
      ExpressionAttributeValues: {
        ':employee_number': employee_number
      },
      ExpressionAttributeNames: {
        '#uuid': 'uuid',
        '#name': 'name',
        '#status': 'status'
      }
    };
    const res = await dynamodbDocumentClient.query(params).promise();
    return res;
  } catch (err) {
    throw (err);
  }
}

async function findCoStaffUserByEmplNumber(employee_number) {
  try {
    const params = {
      TableName: env.DDB_CO_STAFF_USERS_TABLE,
      ProjectionExpression: 'company_uuid, #name, email, #uuid, #status, last_name, role_key, enabled, hotel_uuid, locale',
      KeyConditionExpression: 'employee_number = :employee_number',
      IndexName: 'employee_number-index',
      ExpressionAttributeNames: {
        '#uuid': 'uuid',
        '#name': 'name',
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':employee_number': employee_number,
      }
    };
    const res = await dynamodbDocumentClient.query(params).promise();
    return res;
  } catch (err) {
    throw (err);
  }
}

async function findStaffUserByEmplNumber(employee_number) {
  try {
    const params = {
      TableName: env.DDB_STAFF_USERS_TABLE,
      ProjectionExpression: '#name, email, #uuid, #status, last_name, role_key, enabled, locale',
      KeyConditionExpression: 'employee_number = :employee_number',
      IndexName: 'employee_number-index',
      ExpressionAttributeNames: {
        '#uuid': 'uuid',
        '#name': 'name',
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':employee_number': employee_number,
      }
    };
    const res = await dynamodbDocumentClient.query(params).promise();
    return res;
  } catch (err) {
    throw (err);
  }
}

async function findAdminUserByEmplNumber(employee_number) {
  try {
    const params = {
      TableName: env.DDB_ADMIN_USERS_TABLE,
      ProjectionExpression: 'company_uuid, #name, email, #uuid, #status, last_name, role_key, enabled, hotel_uuid, locale',
      KeyConditionExpression: 'employee_number = :employee_number',
      IndexName: 'employee_number-index',
      ExpressionAttributeNames: {
        '#uuid': 'uuid',
        '#name': 'name',
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':employee_number': employee_number,
      }
    };
    const res = await dynamodbDocumentClient.query(params).promise();
    return res;
  } catch (err) {
    throw (err);
  }
}

module.exports = {
  getUserFromJWT,
  getCognitoUser,
  findUserInDB,
  findUserInConciergeUsers,
  findUserInAdminUsers,
  findUserInCoStaffUsers,
  findUserInStaffUsers,
  permissionsValidate,
  cognitoAttributesToJson,
  findUserByEmail,
  findAdminUserByEmail,
  findCoStaffUserByEmail,
  findStaffUserByEmail,
  findAdminUserByEmail,
  findUserByEmployeeNumber,
  findConciergeByEmplNumber,
  findCoStaffUserByEmplNumber
}