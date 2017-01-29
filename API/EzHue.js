function EzHue(){
	//HTTP variables
	var http = new XMLHttpRequest();
	var response;
	var useLocal = (typeof(Storage) !== "undefined");

	//Refrence to api object
	var api = this;

	//Bridge instance
	this.bridge = {};

	//Lights array
	this.lights = [];

	//Find and create bridge
	this.createBridge = function(cbAlert, cbFail, cbSuccess){
		//Bridge frame
		var bridgeFrame = {
			ip:"",
			url:"",
			username:"",
			name:"",
			config:{}
		}

		if(useLocal){
			//Make sure a bridge was not provided
			if(localstorage.bridge === "undefined" || localstorage.bridge == null){
				findBridge(this);
			}
			else{
				http.onreadystatechange = function(){
					if(requestStatus(http)){
						//If a successful request was sent the bridge is valid and can be used
						if("success" in response){
							this.bridge = localstorage.bridge;
							cbSuccess(this);
						}
						else{
							//Abandon localstorage and find new bridge
							findBridge();
						}
					}
				}
				//Prepares HTTP request
				http.open('GET', localstorage.bridge.url, true);
				//Sends HTTP request
				http.send();
			}
		}
		else{
			findBridge();
		}

		//Find bridge with HUE nupnp
		function findBridge(){
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
					generateUsername(bridgeFrame.url);
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

		function generateUsername(url){
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
									cbFail();
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
						//Gets name from bridge config
						findBridgeName();
					}
				}
				else if(http.readyState == 4){
					//Handle errors
				}
			}

			//Post request function for multiple calls
			function request(){
				cbAlert();
				//Prepares HTTP request
				http.open('POST', url, true);
				//Sends HTTP request
				http.send("{\"devicetype\":\"Rux Lights\"}");
			}

			function findBridgeName(){
				console.log("finding bridge name");
				http.onreadystatechange = function(){
					if(requestStatus(http)){
						//Stores response object
						response = JSON.parse(http.responseText);
						console.log(response.name);
						//Stores bridge name
						bridgeFrame.name = response.name;
						//Stores bridge config data
						bridgeFrame.config = response;
						//Applies bridge frame to bridge object
						initBridge();
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

			function initBridge(){
				//Create bridge as an object of EzHue
				api.bridge = new Bridge(bridgeFrame, api);
				//If local storage is supported, store bridge data for later use
				if(useLocal){
					localstorage.bridge = api.bridge;
				}
				//Fires the success function
				cbSuccess(api.bridge);
			}
		}
	}

	//Bridge object constructor
	function Bridge(frame){
		//Sets bridge variables
		this.ip = frame.ip;
		this.username = frame.username;
		this.name = frame.name;
		this.url = frame.url;
		this.lastScan;
		this.config;

		//Finds all lights connected to bridge
		this.findLights = function(cb){
			//Resets current lights
			api.lights = [];
			http.onreadystatechange = function(){
				if(requestStatus(http)){	
					//Stores response object
					response = JSON.parse(http.responseText);
					//Determine amount of lights connected
					var lightCount = Object.keys(response).length;
					//Cycle through lights
					var _index = 1;
					for (var i = 0; i < lightCount; i++){
						//Prepare light
						var curr = response[Object.keys(response)[i]];
						//Create light object
						var tmp = new Light(curr.name, curr.type, curr.state, _index);
						//Add light to array
						api.lights.push(tmp);
						//Increment index tracker
						_index++;
						//If this is the final itteration fire the completion callback
						if(i == lightCount - 1){
							cb(true);
						}
					}
				}
				else if(http.readyState == 4){
					//Handle errors
					cb(false, "An HTTP error has occured");
				}
			}
			//Prepare HTTP request
			http.open('GET', this.url + "/lights", true);
			//Send HTTP request
			http.send();
		}

		//Finds and adds new lights that are not connected to the bridge
		//Update and complete variables are callback functions
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
					cb(false, "An HTTP error has occured");
				}
			}

			//Prepare HTTP request
			http.open('POST', this.url + "/lights", true);
			//Send HTTP request
			http.send();

			function monitorProgress(_bridge){
				//Array representing the index of new lights
				var newLights = [];
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
									newLights.push(Object.keys(response[i]));
								}
								//Sets to ignore lights that have already been added
								lastLen = rLen;
							}
							//Fires status update callback
							update(newLights);
						}
						else if(http.readyState == 4){
							//Handle errors
							cb(false, "An HTTP error has occured");
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
					collectResults(_bridge, newLights, lastScan);
				}, 40000);
			}

			function collectResults(_bridge, newLights, lastScan){
				var result;
				http.onreadystatechange = function(){
					if(requestStatus(http)){
						//Stores response object
						response = JSON.parse(http.responseText);

						//Collects extended light data of the new lights
						for(var i = response.length - newLights.length; i < response.length; i++){
							result.push(response[i]);
						}
						//Fires callback to handle search completion
						complete(result);
						//Resets the current light set in the case of
						//lights being removed
						_bridge.findLights();
					}
					else if(http.readyState == 4){
						//Handle errors
						cb(false, "An HTTP error has occured");
					}
				}

				//Prepare HTTP request
				http.open('GET', _bridge.url + "/lights", true);
				//Sends HTTP request
				http.send();
			}
		}

		//Deletes light from bridge
		this.deleteLight = function(index, cb){
			//Checks to see if light exists
			if(api.lights[index] === "undefined" || api.lights[index] == null){
				return;
			}

			http.onreadystatechange = function(){
				if(requestStatus(http)){
					//Refreshes the light list
					this.findLights();
					//Fires callback
					cb(true);
				}
				else if(http.readyState == 4){
					//Handle errors
					cb(false, "An HTTP error has occured");
				}
			}

			//Prepares HTTP request
			http.open("DELETE", this.url + "/lights/" + index, true);
			//Sends HTTP request
			http.send();
		}

		//Renames the bridge
		this.rename = function(n, cb){
			//Temp reference to bridge
			var _s = this;
			//Checks if the new name is a valid string
			if(typeof(n) !== "string"){
				//Fires error callback and ends function
				cb(false, "String must be provided as first variable");
				return;
			}

			http.onreadystatechange = function(){
				if(requestStatus(http)){
					//Stores response object
					response = JSON.parse(http.responseText);
					//Looks for success of error objects
					if("success" in response)
					{
						//Sets bridge name in internal memory
						_s.name = response.success[0];
						//Runs successful callback
						cb(true, "Bridge name successfuly changed to : " + response.success[0]);
					}
					else if("error" in response){
						//Fires error callback with response data
						cb(false, response);
					}
				}
				//HTTP request finished but not successful
				else if(http.readyState == 4){
					//Fires error callback
					cb(false, "HTTP request encountered an error.");
				}
			}

			//Prepares HTTP request
			http.open("PUT", this.url + "/config", true);
			//Sends HTTP request
			http.send({"name":n});
		}

		//Gets the bridge config data
		this.getConfig = function(cb){
			//Temp refrence to bridge
			var _s = this;

			http.onreadystatechange = function(){
				if(requestStatus(http)){
					//Stores response variable
					response = JSON.parse(http.responseText);
					//Adds config data to bridge
					_s.config = response;
					//Fires callback with response data
					cb(true, _s.config);
				}
				else if(http.readyState == 4){
					//Handle errors
					cb(false, "An HTTP error has occured");
				}
			}

			//Prepare HTTP request
			http.open('GET', this.url + "/config", true);
			//Send HTTP request
			http.send();
		}

		//Removes a user from the whitelist
		this.deleteUser = function(username, cb){
			//Temp reference to bridge
			var _s = this;

			http.onreadystatechange = function(){
				if(requestStatus(http)){
					//Stores response object
					response = JSON.parse(http.responseText);
					//Assures request was a success
					if("success" in response){
						//Removes the username from local whitelist
						delete _s.config.whitelist[username];
						//Fires callback
						cb(true);
					}
					else{
						//Handle errors
						cb(false, "The bridge has returned an error");
					}
				}
				else if(http.readyState == 4){
					//Handle errors
					cb(false, "An HTTP error has occured");
				}
			}

			for(var i = 0; i < this.config.whitelist.length; i++){
				if(this.config.whitelist[i] == username){
					//Prepare HTTP request
					http.open('DELETE', this.url + "/config/whitelist/" + uesrname, true);
					//Send HTTP request
					http.send();
					break;
				}
			}
		}

		//Removes all users from the whitelist excluding this user
		this.resetWhitelist = function(cb){
			//Stores successes and errors to send to the callback
			var log = [];
			var deletedUsers = [];
			var userQueue = [];
			//Loops through all users
			for(var i in this.config.whitelist){
				//Checks if the current user is this user
				if(Object.keys(this.config.whitelist[i]) !=  this.username){
					userQueue.push(Object.keys(this.config.whitelist[i]));
				}
				if(i == this.config.whitelist.length){
					beginQueue();
				}
			}

			function beginQueue(){
				var _index = userQueue.length;
				//Begins a queue that cycles through
				var int = window.setInterval(function(){
					http.onreadystatechange = function(){
						if(requestStatus()){
							//Stores response object
							response = JSON.parse(http.responseText);
							if("success" in response[0]){
								log.push({"success":"User : " + Object.keys(this.config.whitelist[i]) + " deleted"});
								//Adds username to the deleted user list
								deletedUsers.push(this.config.whitelist[i]);
							}
						}
						else if(http.readyState == 4){
							log.push({"error":"HTTP error has occured when deleting user : " + Object.keys(this.config.whitelist[i])});
						}

						if(_index != 0){
							_index--;
						}
						else{
							clearInt();
						}
					}
					//Prepares HTTP request
					http.open('DELETE', this.url + "/config/whitelist/" + Object.keys(this.config.whitelist[i]), true);
					//Sends HTTP request
					http.send();
				}, 75);

				function clearInt(){
					int.clearInterval();
					//Cycles through the deleted users
					for(var i in deletedUsers){
						//Cycles through the whitelist data
						for(var j in this.config.whitelist){
							//Checks for a match in the deleted users and whitelist data
							if(Object.keys(this.config.whitelist[j]) == deletedUsers[i]){
								//Removes the user data
								this.config.whitelist.splice(j, 1);
							}
						}
					}
					cb(true, log);
				}
			}
		}

		//Finds groups on the bridge
		this.findGroups = function(cd){

		}

		//Deletes a group from the bridge
		this.deleteGroup = function(group, cb){

		}

	}

	//Light object constructor
	function Light(name, type, state, index){
		this.name = name;
		this.type = type;
		this.state = state;
		this.index = index;

		//Sends a new state to the bridge
		this.sendState = function(bridge, nState, cb){

			var nStateKeys = Object.keys(nState);
			var stateKeys = Object.keys(this.state);
			var requestBody = "{";

			//Preparing body message
			for(var i in nStateKeys){
				//Looping through values in the new state
				for(var j in stateKeys){
					//Looping through the values in the current state
					//This ensures we are only sending updated items to the bridge
					if(nStateKeys[i] == stateKeys[j]){
						//Checks if the value of the matching keys matches
						if(nState[nStateKeys[i]] != this.state[stateKeys[j]]){
							//Checks if xy
							if(nStateKeys[i] == "xy"){
								//Makes sure the xy values are different than the current state
								if(nState.xy[0] != this.state.xy[0] || nState.xy[1] != this.state.xy[1]){
									//Adds the xy array to the request body
									requestBody += '"' + nStateKeys[i] + '":[' + nState["xy"][0] + "," + nState["xy"][1] + "],";
								}
							}
							else{
								//Adds key to request body
								requestBody += '"' + nStateKeys[i] + '":';
								//Checks if key value needs to be a string
								if(nStateKeys[i] == "colormode" || nStateKeys[i] == "alert" || nStateKeys[i] == "effect"){
									//Wraps the key value in string notation
									requestBody += '"' + nState[nStateKeys[i]] + '",';
								}
								else{
									//Adds the key value to the request body
									requestBody += nState[nStateKeys[i]] + ",";
								}
							}
						}
					}
				}
			}

			//Removes last comma from body and adds closing brace
			var index = requestBody.length - 1;
			var tmp = requestBody.substring(0, index);
			requestBody = tmp + "}";

			http.onreadystatechange = function(){
				if(requestStatus()){
					//Stores response object
					response = JSON.parse(http.responseText);
					if("success" in response){
						//Applying new state to light object
						for(var i in nStateKeys){
							//Looping through values in the new state
							for(var j in stateKeys){
								//Looping through the values in the current state
								if(nStateKeys[i] == stateKeys[j]){
									//Overwrites the previous state with the new state value
									this.state[stateKeys[j]] = nState[nStateKeys[i]];
								}
							}
						}
						cb(true);
					}
					else{
						//Bridge error
						cb(false, "The bridge has returned an error");
					}

				}
				else if(http.readyState == 4){
					//HTTP error
					cb(false, "An HTTP error has occured");
				}
			}


			//Prepare HTTP request
			http.open('PUT', bridge.url + "/lights/" + this.index, true);
			//Sends HTTP request
			http.send(requestBody);
		}

		//Renames the light
		this.rename = function(name, cb){
			//Temp refrence to light
			var _s = this;
			http.onreadystatechange = function(){
				if(requestStatus(http)){
					//Stores response object
					response = JSON.parse(http.responseText);
					if("success" in response){
						//Update light objects name
						_s.name = name;
						//Fires callback function
						cb(true);
					}
					else{
						//Handle errors
						cb(false, "The bridge has returned an error");
					}
				}
				else if(http.readyState == 4){
					//Handle errors
					cb(false, "An HTTP error has occured");
				}
			}

			//Prepare HTTP request
			http.open('PUT', api.bridge.url + "/lights/" + this.index, true);
			//Send HTTP request
			http.send({"name":name});
		}
	}

	//Group object constructor
	function Group(name, type, lights, action){
		this.name = name;
		this.type = type;
		this.lights = lights;
		this.action = action;
		
		//Stores the time the group was last updated
		this.lastUpdate = 0;

		//Renames the group
		this.rename = function(name, cb){

		}

		//Adds a light to the group
		this.addLight = function(light, cb){

		}

		//Removes a light from the group
		this.removeLight = function(light, cb){

		}

		//Updates the state of all lights in the group
		this.sendAction = function(bridge, nAction, cb){
			var nActionKeys = Object.keys(nAction);
			var actionKeys = Object.keys(this.action);
			var requestBody = "{";
			var time = new Date();

			//Limits group updating to 1 per second
			if(time.now() < this.lastUpdate + 100){
				cb(false, "Must wait 1 second before sending another group update");
				return;
			}

			//Preparing body message
			for(var i in nActionKeys){
				//Looping through values in the new action
				for(var j in actionKeys){
					//Looping through the values in the current action
					//This ensures we are only sending updated items to the bridge
					if(nActionKeys[i] == actionKeys[j]){
						//Checks if the value of the matching keys matches
						if(nAction[nActionKeys[i]] != this.action[actionKeys[j]]){
							//Checks if xy
							if(nActionKeys[i] == "xy"){
								//Makes sure the xy values are different than the current action
								if(nAction.xy[0] != this.action.xy[0] || nAction.xy[1] != this.action.xy[1]){
									//Adds the xy array to the request body
									requestBody += '"' + nActionKeys[i] + '":[' + nAction["xy"][0] + "," + nAction["xy"][1] + "],";
								}
							}
							else{
								//Adds key to request body
								requestBody += '"' + nActionKeys[i] + '":';
								//Checks if key value needs to be a string
								if(nActionKeys[i] == "colormode" || nActionKeys[i] == "alert" || nActionKeys[i] == "effect"){
									//Wraps the key value in string notation
									requestBody += '"' + nAction[nActionKeys[i]] + '",';
								}
								else{
									//Adds the key value to the request body
									requestBody += nAction[nActionKeys[i]] + ",";
								}
							}
						}
					}
				}
			}

			//Removes last comma from body and adds closing brace
			var index = requestBody.length - 1;
			var tmp = requestBody.substring(0, index);
			requestBody = tmp + "}";

			http.onreadyactionchange = function(){
				if(requestStatus()){
					//Stores response object
					response = JSON.parse(http.responseText);
					if("success" in response){
						//Applying new action to light object
						for(var i in nActionKeys){
							//Looping through values in the new action
							for(var j in actionKeys){
								//Looping through the values in the current action
								if(nActionKeys[i] == actionKeys[j]){
									//Overwrites the previous action with the new action value
									this.action[actionKeys[j]] = nAction[nActionKeys[i]];
								}
							}
						}
						this.lastUpdate = time.now();
						cb(true);
					}
					else{
						//Bridge error
						cb(false, "The bridge has returned an error");
					}

				}
				else if(http.readyaction == 4){
					//HTTP error
					cb(false, "An HTTP error occured");
				}
			}


			//Prepare HTTP request
			http.open('PUT', bridge.url + "/lights/" + this.index, true);
			//Sends HTTP request
			http.send(requestBody);
		}
	}
}

//Helper function for http requests
function requestStatus(http){
	if(http.readyState != 4){return false;}
	if(http.status == 200){return true;}
	else {return false;}
}