/* eslint-disable no-param-reassign,no-console,strict */

'use strict';

const updateIp = require('./update-ip.js');

(function main(exports) {
  function clientIpFromXForwardedFor(forwardedFor) {
    return forwardedFor.match(/^[^, ]*/)[0];
  }
  exports.clientIpFromXForwardedFor = clientIpFromXForwardedFor;
  exports.handler = (event, context, callback) => {
    console.log(JSON.stringify(event));
    if (!event.params) {
      console.log(`unknown event received: ${JSON.stringify(event)}`);
      callback('unknown event');
      return;
    }
    if (!event.params.path || !event.params.path.host) {
      callback('API GW misconfigured. Missing expected path var "host"');
      return;
    }
    const host = event.params.path.host;
    const forwardedFor = event.params.header['X-Forwarded-For'];
    if (!forwardedFor) {
      callback('Could not find X-Forwarded-For HTTP Header');
      return;
    }
    const clientIp = clientIpFromXForwardedFor(forwardedFor);
    if (!clientIp) {
      callback('Client IP could not be found from X-Forwarded-For ' +
               `"${forwardedFor}"`);
      return;
    }
    console.log(`X-Forwarded-For: ${forwardedFor}`);
    console.log(`updating IP of host '${host}' to '${clientIp}'`);
    updateIp(host, clientIp, (err, data) => {
      if (err) {
        console.log(`error updating: ${JSON.stringify(err)}`);
        callback(err);
        return;
      }
      console.log('completed host update');
      console.log(data);
      callback(null, data);
    });
  };
}(exports));

/*
{
    "params": {
        "path": {
            "host": "yomama"
        },
        "querystring": {},
        "header": {
            "The-One-You-Want-Below": "204.246.162.38",
            "X-Forwarded-For": "204.246.162.38, 54.239.134.108",
        }
    }
}
*/
