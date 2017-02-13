/* eslint-disable no-param-reassign,no-console,strict */

'use strict';

const aws = require('aws-sdk');
const updateIp = require('./update-ip.js');

const ec2 = new aws.EC2();

const searchKey = process.env.DNS_TAG_SEARCH_KEY;
(function main(exports) {
  function findHostFromTags(updatedTags) {
    // [ { "key": "foo", "value": "bar" } ]
    return updatedTags.find(tag => tag.key === searchKey);
  }
  function clientIpFromInstanceId(instanceId, callback) {
    const params = { InstanceIds: [instanceId] };
    ec2.describeInstances(params, (err, data) => {
      if (err) {
        callback(err);
        return;
      }
      // TODO: This would be better as a public dns name
      // but the update-ip is strictly for A and AAAA records
      // at the moment. Also, we're not working with IPv6 at
      // this time
      callback(null, data.Reservations[0].Instances[0].PublicIpAddress);
    });
  }
  exports.handler = (event, context, callback) => {
    console.log(JSON.stringify(event));
    if (!event.detail) {
      console.log(`unknown event received: ${JSON.stringify(event)}`);
      callback('unknown event');
      return;
    }
    if (!event.detail.requestParameters ||
        !event.detail.requestParameters.resourcesSet ||
        !event.detail.requestParameters.tagSet) {
      callback('event invalid. Missing requestParamters with resourcesSet and tagSet');
      return;
    }
    const resourcesSetItems = event.detail.requestParameters.resourcesSet.items;
    const tagSetItems = event.detail.requestParameters.tagSet.items;

    if (!resourcesSetItems || !resourcesSetItems.length ||
        resourcesSetItems.length !== 1) {
      callback(null, 'function can only operate on single resource updates');
    }
    const instanceId = resourcesSetItems[0].resourceId;

    if (!tagSetItems || !tagSetItems.length) {
      callback(null, 'function can only operate when tags are listed');
    }
    const hostkvp = findHostFromTags(tagSetItems);
    if (!hostkvp) {
      callback(null, 'no host tag found');
    }
    clientIpFromInstanceId(instanceId, (err, data) => {
      if (err) {
        callback(err);
        return;
      }
      if (!data) {
        callback(`host tag located but no public IP address exists for instance ${instanceId}`);
        return;
      }
      const clientIp = data;
      console.log(`updating IP of host '${hostkvp.value}' to '${clientIp}' for instanceId ${instanceId}`);
      updateIp(hostkvp.value, clientIp, (errUpdate, dataUpdate) => {
        if (errUpdate) {
          console.log(`error updating: ${JSON.stringify(errUpdate)}`);
          callback(errUpdate);
          return;
        }
        console.log('completed host update');
        console.log(dataUpdate);
        callback(null, dataUpdate);
      });
    });
  };
}(exports));

/*
 {
     "detail": {
        "requestParameters": {
            "resourcesSet": {
                "items": [
                    {
                        "resourceId": "i-0620947184e4ef181"
                    }
                ]
            },
            "tagSet": {
                "items": [
                    {
                        "key": "yo",
                        "value": "mama"
                    }
                ]
            }
        }
    }
}
*/
