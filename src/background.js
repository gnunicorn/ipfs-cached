// 
// Set up IPFS node and connect to network
// 
const IPFS = require('ipfs')

// GLOBAL Consts
const HEADERS_BLACKLIST = [
  "Cookie", "Set-Cookie", // Cookies imply sessioned data
  "ETag", "If-Match", "If-Modified-Since", "If-None-Match" // Caching headers we must forward
]
const EMPTY_FILE = browser.extension.getURL('empty.html');
const EXAMPLE_FILE_URL = "/ipfs/QmTDMoVqvyBkNMRhzvukTDznntByUNDwyNdSfV8dZ3VKRC/readme.md";


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
// internal helpers
// 

function _can_cache_header(headers) {
  let keys = headers.map((x) => x.name);

  for (var i = 0; i < HEADERS_BLACKLIST.length; i++) {
    let name = HEADERS_BLACKLIST[i];
    if (keys.indexOf(name) != -1) {
      console.log(name, "found in", keys);
      return false
    }
  }

  let cache_control = headers.find((x) => x.name == 'Cache-Control')
  if (cache_control) {
    if (cache_control == 'no-cache' || cache_control == 'no-store' ) {
      console.log("no cache / no store")
      return false
    }
  }

  let pragma = headers.find((x) => x.name == 'Pragma')
  if (pragma) {
    if (pragma == 'no-cache') {
      console.log("pragma no cache")
      return false
    }
  }

  return true
}


// Check the headers whether the given entry can be cached
// or not
function _can_be_cached(details) {
  let method = details.method;
  console.log("checking can be cached", details);
  if (method === "GET") {
    // POST, PUT, DELETE are not allowed to be cached
    // according to spec

    if (details.fromCache) {
      // browser cache takes care of it.
      return false;
    }

    if (details.requestHeaders && !_can_cache_header(details.requestHeaders)){
      return false;
    }

    if (details.responseHeaders && !_can_cache_header(details.responseHeaders)) {
      return false;
    }

    if (details.statusCode && details.statusCode !== 200) {
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

function storeInCache(details) {
  if (_can_be_cached(details)) {
    console.log("will store in cache", details);
    let filter = browser.webRequest.filterResponseData(details.requestId);
    let buffer;
    console.log(filter);
    filter.ondata = (e) => {
      // FIXME: can we always be sure this is complete?
      buffer = e.data;
      return e;
    };
    filter.onstop = () => {
      console.log("storing", details.url, buffer);
      node.files.add(Buffer.from(buffer), (err, res) => {
        if (err) throw err;
        console.log(res);
        const hash = res[0].hash;
        CACHE[details.url] = {
          'headers': details.responseHeaders, // FIXME: clean up headers
          'ipfs_hash': hash
        };
        console.log("stored", hash, "for", details.url);
      });
    };
  }
}


function canLoadFromCache(details) {
  if (_can_be_cached(details)) {
    console.log("can be cached");
    let cached = CACHE[details.url];
    console.log(CACHE, details.url, cached);
    if (cached) {
      console.log("found in cache");
      let filter = browser.webRequest.filterResponseData(details.requestId);

      filter.onstart = event => {
        // we replace the content
        load_from_ipfs(filter, cached.ipfs_hash)
      }
      return {
        responseHeaders: cached.headers
      }
    }
  }
}


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


console.log("starting up")
