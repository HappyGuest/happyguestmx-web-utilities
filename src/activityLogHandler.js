//ver 0.4 log handler

const AWS = require('aws-sdk'),
    uuidv4 = require('uuid/v4'),
    equal = require('deep-equal');

const env = process.env;

AWS.config.update({region: env.REGION });
//services
var dynamodbDocumentClient = new AWS.DynamoDB.DocumentClient();
var locales = ["en", "es"];
var currencies = ["MXN", "USD"];

var activity = module.exports = {};

activity.logEntry = function(params) {
  return new Promise((resolve, reject) => {
    console.log("params: ",params);
    var newLog = new Log(params);
    if(params.type === 'Update')
      newLog.changedFields(params.current, params.updated);
    return newLog.insert()
      .then((data) => {
        resolve(data);
      })
      .catch((err) => {
          reject(err);
      })
  });
};

function Log(params) {
  this.record = {
    uuid: uuidv4(),
    company_uuid:params.company_uuid,
    hotel_uuid: params.hotel_uuid || ' ',
    category: params.category || ' ',
    item: params.item || ' ',
    user_uuid: params.user_uuid || ' ',
    type: params.type,
    before: ' ',
    after: ' ',
    fields: ' ',
    timestamp: new Date(Date.now()).toISOString(),
    ip: params.sourceIp
  };
}

Log.prototype.changedFields = function(a, b) {

  let fields = [];
  let before = [];
  let after =  [];

  //arrays of property names
  var aProps = Object.getOwnPropertyNames(a);
  var bProps = Object.getOwnPropertyNames(b);
  //If number of properties is different,
  //objects are not equivalent
  if(aProps.length != bProps.length) {
    return false;
  }
  //search on each field
  for(var i = 0; i < aProps.length; i++) {
    let propName = aProps[i];

    //pHONES
    if(Array.isArray(a[propName])) {
      if(propName==="schedule" || propName === 'photo_gallery') {
        if(!equal(a[propName],b[propName])) {
          fields.push(propName);
          before.push(' ');
          after.push(' ');
        }
      }
      else {
        //phones, relations, etc //DOit better
        if(JSON.stringify(a[propName].sort())!==JSON.stringify(b[propName].sort())){
          fields.push(propName);
          before.push(a[propName]);
          after.push(b[propName]);
        }
      }
    }
    else if(propName === "price") {
      let currentCurrency = Object.getOwnPropertyNames(a[propName]);
      let updatedCurrency = Object.getOwnPropertyNames(b[propName]);
      if(currentCurrency[0] === updatedCurrency[0]) {
        if(a[propName][currentCurrency]['amount'] !== b[propName][currentCurrency]['amount']) {
          fields.push(propName);
          before.push(a[propName][currentCurrency]);
          after.push(b[propName][currentCurrency]);
        }
      }
      else {
        fields.push(propName);
        before.push(a[propName][currentCurrency]);
        after.push(b[propName][updatedCurrency]);
      }
    }
    //translations
    else if(typeof a[propName] === 'object') {
      nestedProperties = Object.getOwnPropertyNames(a[propName]);
      nestedProperties.forEach((nestedProp) => {
        if(typeof a[propName][nestedProp] !== 'object') {
          // console.log(a[propName][nestedProp]);
          if(a[propName][nestedProp] !== b[propName][nestedProp]) {
            fields.push(propName)
            before.push({[nestedProp]: a[propName][nestedProp]});
            after.push({[nestedProp]: b[propName][nestedProp]});
          }
        }
        else {
          //m schedules
        }
      });
    }
    else if(a[propName] !== b[propName]) {
      fields.push(propName);
      if(propName!=='image' && propName!=='logo') {
        before.push(a[propName]);
        after.push(b[propName]);
      }
      else {
        before.push(' ');
        after.push(' ');
      }
    }
  }
  this.record.fields = fields;
  this.record.before = before;
  this.record.after = after;
};

//insert to db
Log.prototype.insert = function() {
  return new Promise((resolve, reject) => {
    // console.log(this.record);
    let params = {
      TableName: env.DDB_ACTIVITY_LOG,
      Item: this.record
    };
    console.log(params);
    dynamodbDocumentClient.put(params)
      .promise()
      .then((data) => {
        resolve(data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};
