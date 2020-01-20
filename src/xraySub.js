'use strict';
const AWSXRay = require('aws-xray-sdk');

async function newError(err){
    try{
        let new_subseg = AWSXRay.getSegment().addNewSubsegment('error');
        new_subseg.addError(err);
        new_subseg.addErrorFlag();
        new_subseg.close();
    }catch(err){
        throw err;
    }
}
async function newAnnotation(subseg_name,key,value){
    try{
        let new_subseg = AWSXRay.getSegment().addNewSubsegment(subseg_name);
        new_subseg.addAnnotation(key,value);
        new_subseg.close();
    }catch(err){
        throw err;
    }
}

module.exports = {
  newError,
  newAnnotation,
}