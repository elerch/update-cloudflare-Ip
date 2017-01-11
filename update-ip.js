/* eslint-disable no-param-reassign,strict */

'use strict';

const https = require('https');

(function main(module) {
  function optionsForRequest(config, pathSuffix) {
    return {
      hostname: 'api.cloudflare.com',
      port: 443,
      path: `/client/v4/zones/${pathSuffix}`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Key': config.key,
        'X-Auth-Email': config.email,
      },
    };
  }
  function updateIpOnRecord(record, ip, config, callback) {
    const pathSuffix = `${config.zoneId}/dns_records/record.id`;
    const putData = {
      type: record.type,
      content: ip,
      name: record.name,
    };
    const options = optionsForRequest(config, pathSuffix);
    options.method = 'PUT';
    const req = https.request(options, (res) => {
      const body = [];
      res.on('data', (d) => {
        body.push(d);
      });
      res.on('end', () => {
        const d = JSON.parse(Buffer.concat(body).toString());
        if (!d.success) {
          callback(d);
          return;
        }
        callback(null, { status: 'success',
          message: 'record updated',
          record: d });
      });
    });
    req.on('error', err => callback(err));
    req.write(`${JSON.stringify(putData)}\n`);
    req.end();
  }

  function updateIpForDomain(host, ip, config, domainName, callback) {
    const pathSuffix =
      `${config.zoneId}/dns_records?name=${host}.${domainName}`;
    https.request(optionsForRequest(config, pathSuffix), (res) => {
      let body = [];
      res.on('data', (d) => {
        body.push(d);
      });
      res.on('end', () => {
        body = Buffer.concat(body);
        const d = JSON.parse(body.toString());
        if (!d || !d.result || !d.result[0] ||
            !d.result[0].type || !d.result[0].content) {
          callback(
            `unexpected result getting dns record: ${JSON.stringify(d)}`);
          return;
        }
        const record = d.result[0];
        if (record.type !== 'A' && record.type !== 'AAAA') {
          callback('DNS record must be an A or AAAA type');
          return;
        }
        if (record.content === ip) {
          callback(null, {
            status: 'success',
            message: 'no update required',
          });
          return;
        }
        updateIpOnRecord(record, ip, config, callback);
      });
    }).on('error', (e) => {
      callback(`error getting dns record for host "${host}": ${e}`);
    }).end();
  }

  function updateIp(host, ip, callback) {
    const config = updateIp.config;
    https.request(optionsForRequest(config, config.zoneId), (res) => {
      let body = [];
      res.on('data', (d) => {
        body.push(d);
      });
      res.on('end', () => {
        body = Buffer.concat(body);
        const d = JSON.parse(body.toString());
        if (!d || !d.result || !d.result.name) {
          callback(
            `unexpected response from CloudFlare: ${JSON.stringify(d)}`);
          return;
        }
        updateIpForDomain(host, ip, config, d.result.name, callback);
      });
    }).on('error', (e) => {
      callback(`error getting zone info from CloudFlare: ${e}`);
    }).end();
  }

  updateIp.config = {
    key: process.env.CF_AUTH_KEY,
    email: process.env.CF_AUTH_EMAIL,
    zoneId: process.env.CF_ZONE_ID,
  };
  module.exports = updateIp;
}(module));
