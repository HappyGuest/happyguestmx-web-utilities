'use strict';

async function newError(xray,err){
    try{
        let new_subseg = xray.getSegment().addNewSubsegment('error');
        new_subseg.addError(err);
        new_subseg.addErrorFlag();
        new_subseg.close();
    }catch(err){
        throw err;
    }
}
async function newAnnotation(xray,subseg_name,key,value){
    try{
        let new_subseg = xray.getSegment().addNewSubsegment(subseg_name);
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