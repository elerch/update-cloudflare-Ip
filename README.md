updateIp
========

Updates an IP address on CloudFlare for a host.

Usage
-----

Export the following 3 variables:

```
CF_AUTH_KEY: Visible on https://www.cloudflare.com/a/account/my-account
  Click "View API Key" button next to the Global API Key in the API Key section

CF_AUTH_EMAIL: Email used to sign in to CloudFlare
CF_ZONE_ID: Zone ID can be found on the following page:
  https://www.cloudflare.com/a/overview/<domain name> 
```

The update-ip.js is self contained and can be run from nodejs 4.3 or above.

api-gw.js is meant to integrate AWS API Gateway with the update-ip module

Deployment via CloudFormation
-----------------------------

The cloudformation template uses the basic auth custom authorizer (needed by
most routers). Download/clone https://github.com/elerch/basic-auth-api-gateway
and setup the correct directory in the cfndeploy shell script. While you're
there, setup the proper s3 bucket.

IMPORTANT
=========

**Note** the that test is an **integration** test and **will update** records in
CloudFlare. Also, it will use the second 'A' record found in the zone for the
update. The test will revert the IP to the original, but make sure that
you are working with test records (check with curl) before running the tests. 
