# IPFS js caching, block circumvention Webextension

Highly Experimental Firefox Webextension Proof-Of-Concept that caches responses via IPFS on a distributed index and circumvents government and corporate firewalls through this and a proxy setup.

## Setup

This needs node + npm. Then do:

```
npm install
```

(you might need `webpack` globally installed -- do so with `npm install -g webpack`)

## Development

```
npm run build
```

Builds the Javascript addon into the `addon`-folder. Now add this folder as a development-extension in your Firefox (`about:addons` -> Settings -> "Debug Addons" -> "Load Temporary addon"). 

You need to run this command for every change you do and use the `reload`-button on said Firefox configuration page to restart it with the latest build.

### Console

If, on said page, you click on the `debug`-link, this will open the webextensions debug-console. This Addon is very noisy with its logs to provide some feedback about what is going on.

## Approach

This plugin interjects any web-request going on. In order to provide the best experience for people stuck behind censorship firewalls, it utilizes a shared cached and index distributed via IPFS.

The Request flow goes something like this:

```
+----------------+      no         +-------------------------+   yes
| can_be_cached? +-------+---------> is_on_geo_ip_blacklist? +----------+
+------+---------+       ^         +---+---------------------+          |
       |                 |             |                                |
       | yes             |             | no                             |
       |                 |             v                                |
+------v---------+       |         +---+---------------------+   yes    |
| is_in_cache?   +-------+         | is_on_local_blacklist?  +----------+
+------+---------+       ^         +---+---------------------+          |
       |                 |             |                                |
       | yes             |             | no                             |
       |                 |             v                                |
+------v---------+       |        +----+--------------+         +-------v------------+
| is_not_stale?  +-------+        | *regular Request* |  +------> *proxied request*  |
+---+------------+                +--------+--+-------+  |      +------+-------------+
    |                            onSuccess |  | onError  |             |
    |           +----------------+         |  |          |             |
    |           | can_be_cached? <---------+  | +--------+----------+  |
    |           +--------------+-+            +-> add_domain_to_BL()|  |
    |  +------------------+    |                +-------------------+  |
yes |  | store_in_cache() |    |yes                                    |
    |  +----+-----------^-+    |                                       |
    |       |           |      |                                       |
    |  +----v-----+     |      |                +----------------------v-+
    |  |  emit()  |     |      |                |                        |
    |  +----------+     |      |                |                        |
    |                   |      |                |    RESPONSE            |
+---v----------+   +----+------v------+         |                        |
| fetch_ipfs() |   | upload_to_ipfs() |         |                        |
+---+----------+   +------------------+         +------^-----------------+
    |                                                  |
    |                                                  |
    +--------------------------------------------------+

```


## ToDos

Whats the state?

 - [x] interject web requests (example only for https://www.hellorust.com)
     - [x] check whether a request can be cached by their headers
 - [x] cache responses via IPFS
 - [x] load responses from local cache
 - [x] emit responses to network / update from network
     - [x] react to changes from the network: add to index 
 - [x] implement proxying via PAC
 - [x] retry via proxy on broken request
 - [x] implement simple blacklisting example (spoofing geo-ip-lists)
 - [ ] implement proxying via domain-fronting? (is that even possible?)


## Limitations

There are a few limitations you need to be aware of. The most important: **THIS IS A PROOF OF CONCEPT AND IN NO WAY MEANT FOR PRODUCTION USAGE**. and **THIS IS TOTALLY UNTESTED**, as well as:

 - Firefox-only (at the moment)
 - There isn't any actual Proxy configured, your failing requests will also just fail
 - because of the way the interception interface works, the requests still happen in background (as it seems), even if the cache is loaded
 - by just emitting the cache to a distributed network, this can easily be spoofed and other content injected
 - Proxying via PAC has its limitations



## LICENSE

This is published under the GNU Affero General Public License v3.0. See the LICENSE file in this folder to learn more.