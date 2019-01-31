//ver 0.1 error handler
var errors_handler = module.exports = {};

errors_handler.caolanFormErrorHandler =  function(form) {
  let errors = [];
  let err = {
      "message": "One or more parameter values were invalid: One or more parameters are not valid",
      "code": "ValidationException",
      "statusCode": 400
  };
  Object.keys(form.fields).map((f) => {
    if(notUndefined(form.fields[f].fields)) {
      Object.keys(form.fields[f].fields).map((subf) => {
        if(notUndefined(form.fields[f].fields[subf].error)){
          let item = form.fields[f].fields[subf];
          errors.push({
            "field": item.label + "." + item.name,
            "message": item.error
          });
        }
      });
    }
    else {
      if(notUndefined(form.fields[f].error)){
        errors.push({
          "field": form.fields[f].name,
          "message": form.fields[f].error
        });
      }
    }
  });
  err.full_error_message = errors;
  return err;
}

function notUndefined(val) {
  return (val!==null && val!==undefined && val!=="");
}
