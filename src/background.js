const IPFS = require('ipfs')
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
	// 	pubsub: true
	}
})


node.on('ready', () => {
  // Your node is now ready to use \o/
  console.log("IPFS is ready")
	node.id().then(console.log.bind())

  // // stopping a node
  // node.stop(() => {
  //   // node is now 'offline'
  //   console.log("IPFS is offline")
  // })
})
node.on('error', (err) => {console.error(err)}) 

// node.start()
console.log("starting up")
console.log(node)


function listener(details) {
  let filter = browser.webRequest.filterResponseData(details.requestId);
  let decoder = new TextDecoder("utf-8");
  let encoder = new TextEncoder();

  filter.ondata = event => {
  	// we replace the content
  	node.files.cat("/ipfs/QmTDMoVqvyBkNMRhzvukTDznntByUNDwyNdSfV8dZ3VKRC/readme.md", // "hello world example"
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
    			// files.pipe({"on": (a, x) => { console.log('on', a, x); },
    			// 			"pause": false,
    			// 			"writable": true,
    			// 			"end": () => filter.disconnect(),
    			// 			"emit": () => console.log("emit"),
    			// 			"write": (r) => {
    			// 				console.log(r);
    			// 				filter.write(r);
    			// 				return true
    			// 			}
    			// 		})
    			// files.drain();
    		}
  	});
  }

  return {};
}

browser.webRequest.onBeforeRequest.addListener(
  listener,
  {urls: ["*://*/hello-world*"], types: ["main_frame"]},
  ["blocking"]
);