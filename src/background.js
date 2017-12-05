// 
// Set up IPFS node and connect to network
// 
const IPFS = require('ipfs')
const moment = require('moment')

// GLOBAL Consts
const HEADERS_BLACKLIST = [
  "Cookie", "Set-Cookie", // Cookies imply sessioned data
  "ETag", "If-Match", "If-Modified-Since", "If-None-Match" // Caching headers we must forward
]
const EMPTY_FILE = browser.extension.getURL('empty.html');
const EXAMPLE_FILE_URL = "/ipfs/QmTDMoVqvyBkNMRhzvukTDznntByUNDwyNdSfV8dZ3VKRC/readme.md";



// Location of the proxy script, relative to manifest.json
const proxyScriptURL = "proxy.js";


// our internal cache
const CACHE = {
  "https://www.test.com/hello-world1": {
    'headers': [],
    'ipfs_hash': EXAMPLE_FILE_URL
  }
}

// 
// Set up IPFS node and connect to network
// 
const node = new IPFS({
  config: {
      "Addresses": {
        "Swarm": [
        ],
        "API": "",
        "Gateway": ""
      },
      "Discovery": {
        "MDNS": {
          "Enabled": false,
          "Interval": 10
        },
        "webRTCStar": {
          "Enabled": false
        }
      },
      "Bootstrap": [
        "/dns4/ams-1.bootstrap.libp2p.io/tcp/443/wss/ipfs/QmSoLer265NRgSp2LA3dPaeykiS1J6DifTC88f5uVQKNAd",
        "/dns4/lon-1.bootstrap.libp2p.io/tcp/443/wss/ipfs/QmSoLMeWqB7YGVLJN3pNLQpmmEk35v6wYtsMGLzSr5QBU3",
        "/dns4/sfo-3.bootstrap.libp2p.io/tcp/443/wss/ipfs/QmSoLPppuBtQSGwKDZT2M73ULpjvfd3aZ6ha4oFGL1KrGM",
        "/dns4/sgp-1.bootstrap.libp2p.io/tcp/443/wss/ipfs/QmSoLSafTMBsPKadTEgaXctDQVcqN88CNLHXMkTNwMKPnu",
        "/dns4/nyc-1.bootstrap.libp2p.io/tcp/443/wss/ipfs/QmSoLueR4xBeUbY9WZ9xGUUxunbKWcrNFTDAadQJmocnWm",
        "/dns4/nyc-2.bootstrap.libp2p.io/tcp/443/wss/ipfs/QmSoLV4Bbm51jM9C4gDYZQ9Cy3U6aXMJDAbzgu2fzaDs64",
        "/dns4/wss0.bootstrap.libp2p.io/tcp/443/wss/ipfs/QmZMxNdpMkewiVZLMRxaNxUeZpDUb34pWjZ1kZvsd16Zic",
        "/dns4/wss1.bootstrap.libp2p.io/tcp/443/wss/ipfs/Qmbut9Ywz9YEDrz8ySBSgWyJk41Uvm2QJPhwDJzJyGFsD6"
    ]
  // },
  // EXPERIMENTAL: {
  //  pubsub: true
  }
})


node.on('ready', () => {
  // Your node is now ready to use \o/
  console.log("IPFS is ready")
  node.id().then(console.log.bind())
})
node.on('error', (err) => console.error(err)) 




// 
// -- internal helpers
// 


// 
// Check whether the given set @{headers} allows us
// to cache this response 
function _can_cache_header(headers) {
  let keys = headers.map((x) => x.name);

  for (var i = 0; i < HEADERS_BLACKLIST.length; i++) {
    let name = HEADERS_BLACKLIST[i];
    if (keys.indexOf(name) != -1) {
      console.log("not caching", name, "found in", keys);
      return false
    }
  }

  let cc_item = headers.find((x) => x.name == 'Cache-Control')
  if (cc_item) {
    let cache_control = cc_item.value;
    if (cache_control == 'no-cache' ||
        cache_control == 'no-store' ||
        cache_control == 'must-revalidate' ||
        cache_control == "proxy-revalidate" ||
        cache_control == "private") {
      console.log("no cache / no store")
      return false
    }
  }

  let pragma = headers.find((x) => x.name == 'Pragma')
  if (pragma) {
    if (pragma.value == 'no-cache') {
      console.log("pragma no cache")
      return false
    }
  }

  return true
}


// Check the method and headers whether the given entry can be cached
// or not
function _can_be_cached(details) {
  let method = details.method;
  console.log("checking can be cached", details);
  if (method === "GET") {
    // POST, PUT, DELETE are not allowed to be cached
    // according to spec

    if (details.fromCache) {
      // browser cache takes care of it.
      console.log("nope. browser will.")
      return false;
    }

    if (details.requestHeaders && !_can_cache_header(details.requestHeaders)){
      console.log("nope. request Headers prevent it.")
      return false;
    }

    if (details.responseHeaders && !_can_cache_header(details.responseHeaders)) {
      console.log("nope. response Headers prevent it.")
      return false;
    }

    if (details.statusCode && details.statusCode !== 200) {
      console.log("nope. StatusCode != 200")
      return false;
    }

    console.log("yes")
    // looks good, let's try our cache.
    return true;

  }

  console.log("nope")
  // default: we can't cache
  return false;
}

// 
// Check the Input headers for whether the cached content is stale now
// 
// this is an incomplete implementation of RFC2616 Section 14.9
// https://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html#sec14.9
function _is_stale(headers) {
  let mapped = {};
  let expires;

  for (var i = 0; i < headers.length; i++) {
    mapped[headers[i].name] = headers[i].value;
  }

  if (mapped['cache-control'] && mapped.date) {
    //  we have cache-control headers
    cache_control = mapped['cache-control'].replace(' ');
    let date = moment(mapped.date)
    if (cache_control.slice(0, 8) == 'max-age=') {
      expires = date.add(parseInt(cache_control.slice(8)), 'seconds');
    } else if (cache_control.slice(0, 9) == 's-maxage=') {
      expires = date.add(parseInt(cache_control.slice(9)), 'seconds');
    }
  } else if (mapped.expires) {
    // we were given an expires header, check it
    expires = moment(mapped.expires)
  }

  if (expires) {
    return expires.isBefore(moment())
  }
  return false
}


// 
// load the @{fileUrl} from IPFS and write the content into
// @{filter} WebRequest
// 
function load_from_ipfs(filter, fileUrl) {
  console.log("loading from cache")
  node.files.cat(fileUrl,
    (err, files, o) => {
    console.log(err, files, o );
    if (err) {
      console.err(err); 
      filter.disconnect()
    } else {
      console.log("writing");
      files.on('data', (a) => {
        console.log("data", a);
        filter.write(a);
      })
      files.on('end', () => {
        console.log("end");
        filter.disconnect();
      })

      files.resume()
    }
  })
}


// 
// we have gotten a response, lets decide whether we store it
// in the distributed cache
// 
function storeInCache(details) {
  if (_can_be_cached(details)) {
    // cool this can be cached, let's do it!

    console.log("will store in cache", details);
    let filter = browser.webRequest.filterResponseData(details.requestId);
    let buffer;
    // console.log(filter);

    filter.ondata = (e) => {
      // FIXME: can we always be sure this is complete?
      buffer = e.data;
      return e;
    }

    // once we received all data, store it on IPFS
    // and add that to the cache 
    filter.onstop = () => {
      console.log("storing", details.url, buffer);
      node.files.add(Buffer.from(buffer), (err, res) => {
        if (err) throw err;
        console.log(res);
        const hash = res[0].hash;
        // add hash and headers to cache
        CACHE[details.url] = {
          'headers': details.responseHeaders, // FIXME: clean up headers
          'ipfs_hash': hash
        };
        console.log("stored", hash, "for", details.url);
      });
    };
  }
}


// 
// An outgoing request
// 
function canLoadFromCache(details) {

  // first see if this request can even be cached
  if (_can_be_cached(details)) {

    // see if it is in the cache
    let cached = CACHE[details.url];
    if (cached &&
        !_is_stale(cached.headers) // and whether it is not stale
      ) {
      console.log("found in cache");
      // found and not stale, let's load it

      let filter = browser.webRequest.filterResponseData(details.requestId);
      filter.onstart = event => {
        // we replace the content
        load_from_ipfs(filter, cached.ipfs_hash)
      }
      return {
        // and replace the response headers,
        // with the ones from cache
        responseHeaders: cached.headers
      }
    }
  }
}

// 
// ---- Hooking to browser events
// 

browser.webRequest.onHeadersReceived.addListener(
  storeInCache,
  {urls: ["https://www.hellorust.com/*"]},
  ["responseHeaders"]
);


browser.webRequest.onBeforeSendHeaders.addListener(
  canLoadFromCache,
  {urls: ["https://www.hellorust.com/*"]},
  ["blocking", "requestHeaders"]
);



//
// ---- PROXY SETUP
// 

// Register the proxy script
browser.proxy.register(proxyScriptURL);

// Log any errors from the proxy script
browser.proxy.onProxyError.addListener(error => {
  console.error(`Proxy error: ${error.message}`);
});

browser.runtime.onMessage.addListener((message, sender) => {
  // only handle messages from the proxy script
  if (sender.url !=  browser.extension.getURL(proxyScriptURL)) {
    return;
  }

  // initialization phase, hook up the current data
  if (message === "init") {

    browser.storage.onChanged.addListener((newSettings) => {
      // Whenever someone changes the blocked host,
      // we'll sync it to the PAC-Proxy script
      browser.runtime.sendMessage(newSettings.blockedHosts.newValue, {toProxyScript: true});
    });

    // get the current settings, then...
    browser.storage.local.get()
      .then((storedSettings) => {
        // if there are stored settings, update the proxy with them...
        if (storedSettings.blockedHosts) {
          browser.runtime.sendMessage(storedSettings.blockedHosts, {toProxyScript: true});
        // ...otherwise, initialize storage with the default values
        } else {
          browser.storage.local.set({
             blockedHosts: ["example.com", "example.org"]
           });
        }
      }).catch(()=> {
        console.log("Error retrieving stored settings");
      });
  } else {
    // after the init message the only other messages are status messages
    console.log('message from proxy', message);
  }

});


console.log("started up")