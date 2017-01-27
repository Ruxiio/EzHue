function EzHue(){
	//http variables
	var http = new XMLHttpRequest();
	var response;

	//Bridge instance
	this.bridge = {};
	//Lights array
	this.lights = [];
	//Find and create bridge
	this.createBridge = function(ip){
		//Bridge frame
		var bridgeFrame = {
			ip:"",
			url:"",
			username:"",
			name:""
		}
		//Make sure IP was not provided
		if(ip === "undefined" || ip == null){
			findBridge(this);
		}
		else{
			//Ip was provided

		}
		//Find bridge with HUE nupnp
		function findBridge(scope){
			http.onreadystatechange = function(){
				//Waits for HTTP success
				if(requestStatus(http)){
					//Stores response object
					response = JSON.parse(http.responseText);
					console.log(response[0]);
					//Stores bridge IP
					bridgeFrame.ip = response[0].internalipaddress;
					//Generates bridge url
					bridgeFrame.url = "http://" + bridgeFrame.ip + "/api";
					//Generates bridge username
					generateUsername(bridgeFrame.url, scope);
				}
				else if(http.readyState == 4){
					//Handle errors
				}
			}
			//Prepare HTTP request
			http.open('GET', "https://www.meethue.com/api/nupnp" , true);
			//Send request
			http.send();
		}

		function generateUsername(url, scope){
			//Sends POST request
			request();
			var isFirst = true;
			http.onreadystatechange = function(){
				//Waits for the HTTP to success
				if (requestStatus(http)) {
					//Stores response object
					response = JSON.parse(http.responseText);
					console.log(response[0]);
					if("error" in response[0]){
						//Handle possible errors
						switch(response[0].error.type){
							//If the link button was not pressed
							case 101:
								//Wait 10 seconds to resend request
								if(isFirst){
									window.setTimeout(function(){request();}, 10000);
									isFirst = false;
								}
								else{
									//Later use to change the page to show the request failed
									//and wait for a button input to send another request
								}
								break;
						}
					}
					else if("success" in response[0]){
						//Successful connection to the bridge
						//Stores bridge username
						bridgeFrame.username = response[0].success.username;
						//Generates url with username
						bridgeFrame.url += "/" + bridgeFrame.username;
						//Gtes name from bridge config
						findBridgeName(scope);
					}
				}
				else if(http.readyState == 4){
					//Handle errors
				}
			}

			//Post request function for multiple calls
			function request(){
				//Prepares HTTP request
				http.open('POST', url, true);
				//Sends HTTP request
				http.send("{\"devicetype\":\"Rux Lights\"}");
			}

			function findBridgeName(scope){
				console.log("finding bridge name");
				http.onreadystatechange = function(){
					if(requestStatus(http)){
						//Stores response object
						response = JSON.parse(http.responseText);
						console.log(response.name);
						//Stores bridge name
						bridgeFrame.name = response.name;
						//Applies bridge frame to bridge object
						initBridge(scope);
					}
					else if(http.readyState == 4){
						//Handle errors
					}
				}
				//Prepares HTTP request
				http.open("GET", bridgeFrame.url + "/config" , true);
				//Sends HTTP request
				http.send();
			}

			function initBridge(scope){
				scope.bridge = new Bridge(bridgeFrame, scope);
			}
		}
	}

	//Creates the bridge object
	function Bridge(frame, scope){
		//Sets bridge variables
		this.ip = frame.ip;
		this.username = frame.username;
		this.name = frame.name;
		this.url = frame.url;
		this.lastScan;
		this.newLights;
		//Parent scope to add lights to the EzHue object
		var parent = scope;

		//Finds all lights connected to bridge
		this.findLights = function(){
			http.onreadystatechange = function(){
				if(requestStatus(http)){	
					//Stores response object
					response = JSON.parse(http.responseText);
					//Determine amount of lights connected
					var lightCount = Object.keys(response).length;
					//Cycle through lights
					var _index = 1;
					for (var i = 0; i < lightCount; i++)
					{
						//Prepare light
						var curr = response[Object.keys(response)[i]];
						//Create light object
						var tmp = new Light(curr.name, curr.type, curr.state, _index);
						//Add light to array
						parent.lights.push(tmp);
						//Increment index tracker
						_index++;
					}
				}
				else if(http.readyState == 4){
					//Handle errors
				}
			}
			//Prepare HTTP request
			http.open('GET', this.url + "/lights", true);
			//Send HTTP request
			http.send();
		}

		//Finds and adds new lights that are not connected to the bridge
		this.searchForLights = function(update, complete){
			http.onreadystatechange = function(){
				if(requestStatus(http)){
					//Stores response object
					response = JSON.parse(http.responseText);
					if("success" in response){
						monitorProgress(this);
					}
				}
				else if(http.readyState == 4){
					//Handle Errors
				}
			}

			//Prepare HTTP request
			http.open('POST', this.url + "/lights", true);
			//Send HTTP request
			http.send();

			function monitorProgress(_bridge){
				//Array representing the index of new lights
				var _newLights = [];
				//Should I update lastScan?
				var firstResponse = true;
				//Creates update interval (1 update per second)
				var send = window.setInterval(function(){
					//Length will always be atleast 1
					var lastLen = 1;
					http.onreadystatechange = function(){
						if(requestStatus(http)){
							//Stores response object
							response = JSON.parse(http.responseText);
							//Stores length of response
							var rLen = Object.keys(response);
							//Stores last scan object if first call
							if(firstResponse){
								//If only the last scan was returned
								if(rLen == 1){_bridge.lastScan = response[0];}
								//If more than thw last scan was returned
								else{_bridge.lastScan = response[rLen - 1];}
								//Ignore lastscan object for the remaining loops
								firstResponse = false;
							}
							if(rLen > 1 && rLen > lastLen){
								//Loops through respose object (ignores lastscan)
								for(var i = lastLen - 1; i < rLen - 1; i++){
									//Adds new lights to placeholder
									_newLights.push(Object.keys(response[i]));
								}
								//Sets to ignore lights that have already been added
								lastLen = rLen;
							}
							update(_newLights);
						}
						else if(http.readyState == 4){
							//Handle errors
						}
					}
					//Prepares HTTP request
					http.open('GET', _bridge.url + "/lights/new", true);
					//Sends HTTP request
					http.send();
				}, 1000);
				//Timer to clear interval after light search is complete (40 sec)
				window.setTimeout(function(){
					set.clearInterval();
					collectResults(_bridge, _newLights, lastScan);
				}, 40000);
			}

			function collectResults(_bridge, _newLights, lastScan){
				var result;
				http.onreadystatechange = function(){
					if(requestStatus(http)){
						//Stores response object
						response = JSON.parse(http.responseText);

						for(var i = response.length - _newLights.length; i < response.length; i++){
							result.push(response[i]);
						}

						complete(result);
					}
					else if(http.readyState == 4){
						//Handle errors
					}
				}

				//Prepare HTTP request
				http.open('GET', _bridge.url + "/lights", true);
				//Sends HTTP request
				http.send();
			}
		}
	}

	function Light(name, type, state, index){
		this.name = name;
		this.type = type;
		this.state = state;
		this.index = index;
	}
}

function requestStatus(http){

	if(http.readyState != 4){return false;}

	if(http.status == 200){return true;}
	
	//return false;
}

var hueapi = new EzHue();


function Connect(){
	hueapi.createBridge();
	hueapi.bridge.findLights();
	console.log(hueapi.lights);
	hueapi.bridge.searchForLights(function(newStuff){
		console.log("I found something");
	}, function(list){
		console.log("Here is everything we found");
	});
}

function Check(){
}