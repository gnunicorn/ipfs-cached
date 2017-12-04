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
+------v---------+       |        +----+--------------+  onError   +----v---------------+
| is_not_stale?  +-------+        | *regular Request* +------------> *proxied request*  |
+---+------------+                +--------+----------+            +----+---------------+
    |                                      |                            |
    |           +----------------+         |                            |
    |           | can_be_cached? <---------+-----------+----------------+
    |           +--------------+-+                     |
    |  +------------------+    |                       |
yes |  | store_in_cache() |    |yes                    |
    |  +----+-----------^-+    |                       |
    |       |           |      |                +------v-----------------+
    |  +----v-----+     |      |                |                        |
    |  |  emit()  |     |      |                |                        |
    |  +----------+     |      |                |    RESPONSE            |
    |                   |      |                |                        |
+---v----------+   +----+------v------+         |                        |
| fetch_ipfs() |   | upload_to_ipfs() |         +------+-----------------+
+---+----------+   +------------------+                ^
    |                                                  |
    |                                                  |
    +--------------------------------------------------+

```