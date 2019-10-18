# RHV2Prometheus
This project written in Nodejs aims to cover a gap detected in RedHat Openshift (3.11, 4.X) solutions deployed on RHHI with RHV, and it is the impossibility of centralizing monitoring on a single console.

With RHV2Prometheus, metrics are generated from the objects detected in the RHV api, to import them from Openshift's own promtheus.

Console events are also read and presented in an authenticated view with Red Hat Single Sign-on (SSO) implemented in Openshift.

It also includes a functionality to simulate the response of an ovirt api (static values from a lab), using the sample data or those read in your environment, ideal for testing the solution if we do not have an api to consult.

- [Red Hat Hyperconverged infrastructure](https://www.redhat.com/en/technologies/storage/hyperconverged-infrastructure)
- [RedHat Virtualization](https://www.redhat.com/en/technologies/virtualization/enterprise-virtualization)
- [Openshift](https://www.redhat.com/en/technologies/cloud-computing/openshift)
- [Red Hat Single Sign-On](https://access.redhat.com/products/red-hat-single-sign-on)

## About the idea
I am currently involved in a project described as the need, additionally I'm adding functionalities to automate the configuration and checks of these metrics from Nagios, and the notification of events, but I exclude them.

RHV2 Prometheus is not yet in production in any environment, it is in Alpha phase.

## Getting started
Depending on where we want to go, the requirements to test RHV2prometheus vary:

**NODE.js** Allows us to run RHV2Prometheus on our laptop or any node server.
**Openshift Container Platform 3.11/4.X** we can deploy and integrate it with the prometheus out-of-the-box, only tested in Openshift 3.11 with Prometheus-operator.
**Red Hat Virtualization** What we consult is the ovirt api, so it could be integrated with other solutions, only tested in RHV 4.0 of the labs in OPENTLC.com and RHV 4.0 over RHHI.

### Installation

First you need to clone the repo to local and edit the .env file

```
RHEVserver="https://YOURSERVER"
# User example "admin@internal"
# Password example "r3dh4t1!"
# Base64 encoded user@domain:password
RHVCredentials="YWRtaW5AaW50ZXJuYWw6cjNkaDR0MSE="
NagiosCFGBuilder="true"
#Secret for RHSSO / keycloak integration
SSOSecret="D9uLJCX65dPCuepR"
```
then for the RHSSO integration, you need to add the keycloak.json file to the rootpath like this example:

```
{
  "realm": "rhv2prometheus",
  "auth-server-url": "https://sso.app.server/auth",
  "ssl-required": "none",
  "resource": "rhv2prometheus",
  "public-client": true,
  "confidential-port": 0
}
```

then select your option [Openshift|Node.js]
* Openshift
Here are some steps to take it working, obiously you can take your own way.

```
# create the project
oc new-project rhv2prometheus --description="Create prometheus metrics from RHV" --display-name="rhv2prometheus"
# create build from source
oc new-build --name rhv2prometheus --strategy=source --binary --image-stream=nodejs:latest
# start the build
oc start-build rhv2prometheus --from-dir=. --follow
# create the app
oc new-app rhv2prometheus
# expose the service
oc expose svc/rhv2prometheus
```

Then you can access to http://rhv2prometheus-rhv2prometheus.yourappdomain.com/metrics to check the metrics to scrape from an other prometheus.

Also can check the events in:
https://rhv2prometheus-rhv2prometheus.yourappdomain.com/events (set RHSSO="true")
http://rhv2prometheus-rhv2prometheus.yourappdomain.com/events (set RHSSO="false")

For config the prometheus-operator out-of-the-box, here i use some steps that can be optimized, but the next works for me:

*Cluster admin rights are required

1. Clone the secret prometheus-k8s to a new one **custom-prometheus-k8s** in the project "openshift-monitoring" adding our RHV2prometheus svc route to the scape_configs:

```
- job_name: custom/rhv-monitoring
  static_configs:
    - targets: ['rhv2prometheus-rhv2prometheus.yourappdomain.com']
```

2.  The Stateful Set *"prometheus-k8s"* have defined 4 containers (prometheus, prometheus-config-reloader, prometheus-proxy, rules-configmap-reloader) inside each prometheus pods, we just need to edit the prometheus-config-reloader:

Mount the new secret editing with our custom:

*in the volumes definition:*

```
      volumes:
        - name: config
          secret:
            defaultMode: 420
            secretName: custom-prometheus-k8s
```

    
Saving the Stateful Set will start the new deploy, and prometheus-config-reloader will send the new config to the container prometheus.

Then we can check our new metrics inside prometheus

* Node.js

 install it:

```
npm install
```

then take a look at the package.json, scripts definition:

```
    "start": "set RHEVtest=false&& set RHEVrecord=false&& node server.js",
    "start-no-sso": "set RHEVtest=false&& set RHEVrecord=false&& node server.js",
    "test": "node simulator.js&& set RHEVtest=true&& set RHEVrecord=false&& node server.js",
    "record": "set RHEVtest=false&& set RHEVrecord=true&& node server.js"
```

to start it connecting to the .env.RHVServer and use SSO:

```
npm start
```

if you want to record the api output for simulator run:

```
npm run record
```

if you want to test connecting to the api simulator, run:

```
npm run test
```

Then you can access to http://localhost:8080/metrics to check the metrics to scrape from an other prometheus.

And access with SSO to the Admin page http://localhost:8080/events