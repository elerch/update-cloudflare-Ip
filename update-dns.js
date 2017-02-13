/* eslint-disable no-param-reassign,strict */

'use strict';

const https = require('https');
// TODO: Would be cool if this module could push new
// DNS records as well as update existing ones

// TODO: Handle CNAMEs
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
  function updateContentForRecord(record, content, config, method, callback) {
    const pathSuffix = `${config.zoneId}/dns_records/${record.id || ''}`;
    const putData = {
      type: record.type,
      content,
      name: record.name,
    };
    const options = optionsForRequest(config, pathSuffix);
    options.method = method; // console.log(options,putData);
    if (method === 'POST') {
      putData.ttl = 1;         // automatic
      putData.proxied = false; // don't proxy requests
    }
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

  function typeForContent(content) {
    if (content.match(/([0-9]{1,3}\.){3}[0-9]{1,3}/)) {
      return 'A';
    }
    return content.indexOf(':') > -1 ? 'AAAA' : 'CNAME';
  }

  function updateRecordForDomain(host, content, config, domainName, callback) {
    const pathSuffix =
      `${config.zoneId}/dns_records?name=${host}.${domainName}`;
    const opts = optionsForRequest(config, pathSuffix);// console.log(opts);
    https.request(opts, (res) => {
      let body = [];
      res.on('data', (d) => {
        body.push(d);
      });
      res.on('end', () => {
        body = Buffer.concat(body);
        const d = JSON.parse(body.toString());
        let method = null;
        if (!d || !d.result || d.result.length === undefined) {
          callback(
            `unexpected result getting dns record: ${JSON.stringify(d)}`);
          return;
        }
        if (d.result[0] &&
            d.result[0].type && d.result[0].content) {
          method = 'PUT';
        } else if (d.success && d.result_info && d.result_info.total_count === 0 &&
                   d.result.length === 0) {
          method = 'POST';
        }
        if (!method) {
          callback(
            `unexpected result getting dns record (method): ${JSON.stringify(d)}`);
          return;
        }
        if (method === 'POST') {
          if (!config.createRecordIfNecessary) {
            callback(
              `DNS record not found and module is not configured to auto-create: ${host}`);
            return;
          }
          const record = {
            type: typeForContent(content),
            name: host,
          };
          updateContentForRecord(record, content, config, method, callback);
          return;
        }
        // We're doing an update
        const record = d.result[0];
        if (record.type !== 'A' && record.type !== 'AAAA' && record.type !== 'CNAME') {
          callback('DNS record must be a CNAME, A or AAAA type');
          return;
        }
        if (record.content === content) {
          callback(null, {
            status: 'success',
            message: 'no update required',
          });
          return;
        }
        updateContentForRecord(record, content, config, method, callback);
      });
    }).on('error', (e) => {
      callback(`error getting dns record for host "${host}": ${e}`);
    }).end();
  }

  function updateRecord(record, content, callback) {
    const config = updateRecord.config;
    const opts = optionsForRequest(config, config.zoneId); // console.log(opts);
    https.request(opts, (res) => {
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
        updateRecordForDomain(record, content, config, d.result.name, callback);
      });
    }).on('error', (e) => {
      callback(`error getting zone info from CloudFlare: ${e}`);
    }).end();
  }

  updateRecord.config = {
    key: process.env.CF_AUTH_KEY,
    email: process.env.CF_AUTH_EMAIL,
    zoneId: process.env.CF_ZONE_ID,
    createRecordIfNecessary: true,
  };
  module.exports = updateRecord;
}(module));
