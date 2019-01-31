'use strict';

/*!
 * This module helps with common functions through happyguest project
 * 0.2
 */


/* 
* common regular expressions
*/
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const urlReGex = /^((http[s]?|ftp):\/)?\/?([^:\/\s]+)((\/\w+)*\/)([\w\-\.]+[^#?\s]+)(.*)?(#[\w\-]+)?$/;

/*
* this function evaluate a string to know if it 's an url
*/
function isURL(string) {
    const res = new RegExp(urlReGex);
    return res.test(string);
}

async function cleanFields(Item) {
    let param_names = Object.keys(Item);
    let subObject;
    param_names.forEach((item) => {
      if (typeof Item[item] === 'object') {
        if (isEmpty(Item[item])) delete Item[item];
        else {
          subObject = Object.keys(Item[item]);
          subObject.forEach((subitem) => {
            if (!notUndefined(Item[item][subitem]) || isEmpty(Item[item][subitem]))
              delete Item[item][subitem];
          });
        }
      } else {
        if (!notUndefined(Item[item]))
          delete Item[item];
      }
    });
    return Item;
  }
  
  function notUndefined(val) {
    return (val !== null && val !== undefined && val !== "");
  }

  function isEmpty(obj) {
    for(var key in obj) {
      if(obj.hasOwnProperty(key))
        return false;
    }
    return true;
  }

module.exports = {
    isURL,
    uuidRegex,
    cleanFields,
    notUndefined,
    isEmpty
}