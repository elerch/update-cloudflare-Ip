'use strict';
var updateIp = require('../update-ip.js');
var expect = require('chai').expect;
var https = require('https');

var config = {
  key: process.env.CF_AUTH_KEY,
  email: process.env.CF_AUTH_EMAIL,
  zoneId: process.env.CF_ZONE_ID
};

var zoneInfo;

before((done) => {
  let body = [];
  if (!config.key || !config.email || !config.zoneId) {
    console.error('environment variables CF_AUTH_KEY, CF_AUTH_EMAIL, ' +
      'CF_ZONE_ID required');
    return;
  }
  https.request(optionsForRequest(config.zoneId + '/dns_records'), (res) => {
    res.on('data', (d) => {
      body.push(d);
    }).on('end', (e) => {
      body = Buffer.concat(body).toString();
      zoneInfo = JSON.parse(body);
      done();
     });
  }).on('error', (e) => {
    console.log(e);
  }).end();
});

function optionsForRequest(pathSuffix) {
  return {
    hostname: 'api.cloudflare.com',
    port: 443,
    path: '/client/v4/zones/' + pathSuffix,
    "method": 'GET',
    headers: {
      "Content-Type": 'application/json',
      "X-Auth-Key": config.key,
      "X-Auth-Email": config.email
    }
  }
}
describe('updateIp', () => {
  it('should update the IP in CloudFlare', (done) => {
    const record = zoneInfo.result[2];
    const ip = record.content;
    const name = record.name;
    const host = name.match(/^[^.]*/)[0];
    updateIp(host, '169.254.169.254', (err, d) => {
      updateIp(host, ip, (bkerr, bkd) => {
        let check = { status: d.status, message: d.message };
        // Check original update
        expect(err).to.be.null;
        expect(check).to.deep.equal(
          {status: 'success', message: 'record updated'});
        // Check update back to original
        check = { status: bkd.status, message: bkd.message };
        expect(bkerr).to.be.null;
        expect(check).to.deep.equal(
          {status: 'success', message: 'record updated'});
        done();
      });
   });
 });
  it('should update the IP in CloudFlare (noop)', (done) => {
    const record = zoneInfo.result[2];
    const ip = record.content;
    const name = record.name;
    const host = name.match(/^[^.]*/)[0];
    updateIp(host, ip, (err, d) => {
      expect(err).to.be.null;
      expect(d).to.deep.equal(
          {status: 'success', message: 'no update required'});
      done();
    });
  });
});

describe('lambda integration', () => {
});
